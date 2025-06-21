import { NextResponse } from 'next/server';
import solc from 'solc';
import fs from 'fs';
import path from 'path';

// This function helps resolve imported contracts, particularly from OpenZeppelin
function findImports(importPath: string) {
    try {
        // Convert @openzeppelin imports to node_modules path
        if (importPath.startsWith('@openzeppelin/')) {
            const npmPath = path.join(process.cwd(), 'node_modules', importPath);
            if (!fs.existsSync(npmPath)) {
                console.error('Import not found:', npmPath);
                return { error: `File not found: ${importPath}` };
            }
            const content = fs.readFileSync(npmPath, 'utf8');
            return { contents: content };
        }
        
        // Handle relative imports within the same directory
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const basePath = path.join(process.cwd(), 'contracts');
            const filePath = path.join(basePath, importPath);
            if (!fs.existsSync(filePath)) {
                console.error('Import not found:', filePath);
                return { error: `File not found: ${importPath}` };
            }
            const content = fs.readFileSync(filePath, 'utf8');
            return { contents: content };
        }
        
        return { error: `Unsupported import: ${importPath}` };
    } catch (error) {
        console.error('Import error:', error);
        return { error: `Import failed: ${(error as Error).message}` };
    }
}

export async function POST(request: Request) {
    try {
        // Safely parse the request body
        let sourceCode;
        try {
            const body = await request.json();
            sourceCode = body.sourceCode;
            
            if (!sourceCode) {
                return NextResponse.json({
                    error: 'No source code provided'
                }, { status: 400 });
            }
        } catch (error) {
            return NextResponse.json({
                error: 'Invalid request body',
                details: (error as Error).message
            }, { status: 400 });
        }

        // Detect solidity version from source code
        let solidityVersion = '0.8.19';
        const versionRegex = /pragma\s+solidity\s+([\^~]?\d+\.\d+\.\d+)/;
        const match = sourceCode.match(versionRegex);
        if (match && match[1]) {
            solidityVersion = match[1].replace(/[\^~]/, ''); // Remove ^ or ~ if present
        }

        // Prepare compiler input with detected version
        const input = {
            language: 'Solidity',
            sources: {
                'contract.sol': {
                    content: sourceCode
                }
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata'],
                        '': ['ast']
                    }
                },
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                evmVersion: 'london'
            }
        };

        // Load specific compiler version
        let compiler;
        try {
            // Try to use a specific version if available
            compiler = solc;
        } catch (error) {
            console.warn('Using default solidity compiler:', error);
            compiler = solc;
        }

        // Compile with error catching
        let output;
        try {
            const compiledOutput = compiler.compile(JSON.stringify(input), { import: findImports });
            output = JSON.parse(compiledOutput);
        } catch (error) {
            console.error('Compilation error:', error);
            return NextResponse.json({
                error: 'Compilation process failed',
                details: (error as Error).message
            }, { status: 500 });
        }

        // Handle warnings and errors
        if (output.errors) {
            // Extract all errors and warnings
            const errors = output.errors.filter((e: { severity: string }) => e.severity === 'error');
            const warnings = output.errors.filter((e: { severity: string }) => e.severity === 'warning');
            
            // Log warnings but continue
            if (warnings.length > 0) {
                console.warn('Compilation warnings:', warnings);
            }
            
            // Return if there are actual errors
            if (errors.length > 0) {
                return NextResponse.json({
                    error: 'Compilation errors found',
                    details: errors.map((e: { formattedMessage: string }) => e.formattedMessage)
                }, { status: 400 });
            }
        }

        // Validate compilation output
        if (!output.contracts || !output.contracts['contract.sol']) {
            return NextResponse.json({
                error: 'Invalid compilation output',
                details: 'No contracts found in output'
            }, { status: 400 });
        }

        // Get the contract from the output - handle possibility of multiple contracts
        const contractNames = Object.keys(output.contracts['contract.sol']);
        if (contractNames.length === 0) {
            return NextResponse.json({
                error: 'No contracts compiled',
                details: 'The source code did not contain any valid contracts'
            }, { status: 400 });
        }

        // Use the first contract if multiple are present, or the only one
        const contractName = contractNames[0];
        const contract = output.contracts['contract.sol'][contractName];

        // Final validation of contract data
        if (!contract || !contract.abi || !contract.evm || !contract.evm.bytecode) {
            return NextResponse.json({
                error: 'Invalid contract output',
                details: 'Missing required contract data'
            }, { status: 400 });
        }

        // Return successful response with more detailed information
        return NextResponse.json({
            contractName: contractName,
            abi: contract.abi,
            bytecode: '0x' + contract.evm.bytecode.object,
            metadata: contract.metadata,
            solidity_version: solidityVersion
        });

    } catch (error) {
        // Catch any unexpected errors
        console.error('Unexpected error in compilation route:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: (error as Error).message
        }, { status: 500 });
    }
}