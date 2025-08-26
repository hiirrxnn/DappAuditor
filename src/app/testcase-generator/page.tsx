'use client';

import React, { JSX, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mistral } from '@mistralai/mistralai';
import { getVulnerabilityContext } from '@/utils/smartBugsData';
import { useRAGTracker } from '@/utils/useRAGTracker';
import {
  FileCode,
  Robot,
  CircleNotch,
  Copy,
  Check,
  TestTube,
  Code,
  Lightning,
  Wrench,
  Gear
} from 'phosphor-react';

const mistralClient = new Mistral({
  apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY!
});

type TestFramework = 'hardhat' | 'foundry' | 'remix';

interface TestingOption {
  id: TestFramework;
  name: string;
  description: string;
  icon: JSX.Element;
  features: string[];
}

const TESTING_OPTIONS: TestingOption[] = [
  {
    id: 'hardhat',
    name: 'Hardhat',
    description: 'JavaScript/TypeScript tests with Chai',
    icon: <TestTube size={20} weight="duotone" />,
    features: ['JS/TS', 'Chai', 'Ethers.js', 'Gas Reports']
  },
  {
    id: 'foundry',
    name: 'Foundry',
    description: 'Solidity-based testing framework',
    icon: <Code size={20} weight="duotone" />,
    features: ['Solidity', 'Fuzzing', 'Gas Optimized', 'Fast']
  },
  {
    id: 'remix',
    name: 'Remix',
    description: 'Manual testing guide for Remix IDE',
    icon: <FileCode size={20} weight="duotone" />,
    features: ['GUI Testing', 'No Setup', 'Interactive', 'Visual']
  }
];

export default function TestCaseGenerator() {
  const [contractCode, setContractCode] = useState('');
  const [generatedTests, setGeneratedTests] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<TestFramework>('hardhat');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const { trackRAGSearch } = useRAGTracker();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getPromptForFramework = (code: string, framework: TestFramework) => {
    const basePrompt = `You are a senior smart contract developer and Test-Driven Development (TDD) expert. Your task is to write a comprehensive, production-quality test suite for the provided Solidity smart contract.

**Core Testing Principles to Follow:**
1. **Happy Path:** Test the intended functionality of each function with valid inputs.
2. **Edge Cases:** Test with zero values, maximum values (e.g., \`type(uint256).max\`), and unusual but valid inputs.
3. **Access Control:** Explicitly test that modifiers like \`onlyOwner\` work correctly. Write tests where unauthorized users attempt to call protected functions and confirm they fail.
4. **Failure Conditions:** Crucially, write tests that EXPECT transactions to revert for each \`require\` statement.
5. **Event Emissions:** Test that events are emitted with the correct parameters after state changes.

**Contract to Test:**
\`\`\`solidity
${code}
\`\`\`
---`;

    const frameworkSpecifics = {
      hardhat: `
**Framework: Hardhat (TypeScript)**

**Instructions:**
- Generate a complete TypeScript test file using Hardhat, Ethers.js v6, and Chai.
- Structure tests logically using nested \`describe\` blocks (e.g., one main block for the contract, then sub-blocks for each function or feature).
- Use a \`beforeEach\` block to deploy a fresh contract instance for each test to ensure atomicity.
- For failure condition tests, use \`await expect(tx).to.be.revertedWith("Error message")\`.
- For event tests, use \`await expect(tx).to.emit(contract, "EventName").withArgs(...)\`.
- Write clean, readable code with comments explaining complex test setups.

**Output:**
Return ONLY the complete, runnable TypeScript test code inside a single code block. Do not include any other text, titles, or explanations.
`,

      foundry: `
**Framework: Foundry (Solidity)**

**Instructions:**
- Generate a complete Solidity test file that inherits from \`forge-std/Test.sol\`.
- Use a \`setUp()\` function for initial contract deployment and state configuration.
- Write clear, descriptive test function names, e.g., \`test_RevertWhen_CallerIsNotOwner()\`.
- For failure condition tests, use \`vm.expectRevert(...)\` with the specific error message.
- For event tests, use \`vm.expectEmit(...)\`.
- Implement fuzz testing for functions that take numerical or address inputs to cover a wide range of scenarios.
- Write clean, readable Solidity with comments explaining test logic.

**Output:**
Return ONLY the complete, runnable Solidity test code inside a single code block. Do not include any other text, titles, or explanations.
`,

      remix: `
**Framework: Remix IDE (Manual Testing Guide)**

**Instructions:**
- Generate a detailed, step-by-step manual testing guide in Markdown format.
- Structure the guide with clear scenarios (e.g., "Scenario 1: Successful Contribution").
- For each scenario, provide a table with the following columns: "Step", "Action", "Account", "Parameters / Value", "Expected Outcome", and "Verification".
- Include instructions for deploying the contract in the Remix VM.
- Cover happy paths, access control failures, and other revert conditions.

**Output:**
Return ONLY the complete Markdown guide. Do not include any other text, titles, or explanations.
`
    };

    return basePrompt + frameworkSpecifics[framework];
  };

  const generateTests = async () => {
    if (!contractCode.trim()) {
      setError('Please enter contract code to generate tests');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      console.log('🔍 Starting RAG-enhanced test generation...');
      
      // Get RAG context via API call for consistency
      let ragContext = '';
      let similarContracts: any[] = [];
      
      try {
        console.log('📊 Searching for similar contract patterns...');
        const searchStartTime = performance.now();
        
        // Call our API route for similarity search
        const ragResponse = await fetch('/api/search-similar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: contractCode,
            limit: 5 // Increase limit for more comprehensive context
          }),
        });

        const searchDuration = performance.now() - searchStartTime;

        if (ragResponse.ok) {
          const ragData = await ragResponse.json();
          similarContracts = ragData.results || [];
          console.log(`📋 Found ${similarContracts.length} similar contracts for context`);
          
          // Track RAG search on client-side
          if (ragData.trackingData) {
            trackRAGSearch(ragData.trackingData, searchDuration, true);
          }
          
          if (similarContracts.length > 0) {
            ragContext = `
**SIMILAR CONTRACT TEST PATTERNS FROM KNOWLEDGE BASE:**
${similarContracts.map((c, i) => `
${i + 1}. Similarity Score: ${c.score?.toFixed(3)}
Contract Type: ${c.metadata?.contractType || 'Unknown'}
Security Level: ${c.metadata?.securityLevel || 'Unknown'}
Test Insights: ${c.metadata?.documentationNotes || 'Standard patterns'}
Code Pattern:
\`\`\`solidity
${c.chunk.substring(0, 400)}...
\`\`\`
Recommended Test Approach: Focus on ${c.metadata?.vulnerability ? `${c.metadata.vulnerability} vulnerability testing` : 'comprehensive coverage'}
`).join('\n')}\n`;
          }
        } else {
          console.warn('⚠️ RAG API call failed, proceeding with basic patterns');
          // Track failed RAG search
          trackRAGSearch({
            query: contractCode.substring(0, 200),
            resultsCount: 0,
            averageScore: 0,
            maxScore: 0,
            minScore: 0,
            totalContextLength: 0,
            relevantContextLength: 0,
            utilizationRate: 0
          }, searchDuration, false, 'API call failed');
        }
      } catch (ragError) {
        console.warn(`⚠️ RAG search failed: ${(ragError as Error).message} - using fallback patterns`);
        // Track failed RAG search
        trackRAGSearch({
          query: contractCode.substring(0, 200),
          resultsCount: 0,
          averageScore: 0,
          maxScore: 0,
          minScore: 0,
          totalContextLength: 0,
          relevantContextLength: 0,
          utilizationRate: 0
        }, 0, false, (ragError as Error).message);
      }
      
      // Get vulnerability-specific examples
      const vulnContext = getVulnerabilityContext(contractCode);
      console.log(`🔒 Identified ${vulnContext.length} potential vulnerability patterns`);
      
      // Build comprehensive vulnerability testing context
      const vulnerabilityTestContext = vulnContext.length > 0 ? `
**VULNERABILITY-SPECIFIC TEST PATTERNS:**
${vulnContext.map((v, i) => `
${i + 1}. Vulnerability Pattern Detected:
${v.documentation}

Example Test Pattern for ${selectedFramework}:
\`\`\`${selectedFramework === 'foundry' ? 'solidity' : 'javascript'}
${v.testPattern}
\`\`\`
`).join('\n')}\n` : '';
      
      // Build the enhanced prompt with comprehensive RAG context
      const basePrompt = getPromptForFramework(contractCode, selectedFramework);
      
      const enhancedPrompt = `${basePrompt}

${ragContext}${vulnerabilityTestContext}

**CRITICAL INSTRUCTIONS FOR RAG-ENHANCED TESTING:**
1. **Leverage Similar Patterns**: Use the similar contract patterns above to identify common testing scenarios and edge cases.
2. **Security-First Approach**: Pay special attention to the vulnerability patterns identified and ensure comprehensive negative testing.
3. **Pattern-Based Coverage**: Build upon the successful test patterns from similar contracts while adapting them to this specific contract.
4. **Framework Optimization**: Ensure tests are optimized for ${selectedFramework} best practices as shown in the examples.
5. **Comprehensive Edge Cases**: Use insights from similar contracts to identify non-obvious edge cases and testing scenarios.

**Remember**: Generate ONLY the complete, runnable test code. No explanations or additional text.`;

      console.log('🤖 Calling Mistral API with enhanced RAG context...');
      
      const response = await mistralClient.chat.complete({
        model: "mistral-large-latest", // Use more capable model for better RAG processing
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        temperature: 0.1,
        maxTokens: 6144, // Increased for more comprehensive tests
      });

      const generatedText = response.choices?.[0]?.message?.content || '';
      let cleanCode = '';
      if (typeof generatedText === 'string') {
        cleanCode = generatedText
          .replace(/^```[a-z]*\n?/gm, '')
          .replace(/```$/gm, '')
          .trim();
      }
      
      setGeneratedTests(cleanCode);
      console.log('✅ RAG-enhanced test generation completed successfully');
      
      if (similarContracts.length > 0) {
        console.log(`📊 Enhanced with ${similarContracts.length} similar contract patterns`);
      }

    } catch (error) {
      console.error('Test generation failed:', error);
      setError(`Failed to generate test cases: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-zinc-900 text-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
            <span className="text-white text-sm font-semibold">AI-Powered Testing</span>
          </div>
          <h1 className="text-3xl font-mono font-bold mb-4 text-white">Test Case Generator</h1>
          <p className="text-gray-400 mb-2">Generate comprehensive test suites for your smart contracts using AI and RAG technology</p>
          <div className="text-sm text-blue-300 flex items-center gap-2">
            <Robot size={16} weight="duotone" />
            Enhanced with similar contract patterns for comprehensive test coverage
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Framework Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-mono font-bold mb-4 text-white">Select Testing Framework</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTING_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedFramework(option.id)}
                className={`p-4 rounded-lg border transition-all duration-200 text-left hover:shadow-md ${
                  selectedFramework === option.id
                    ? 'border-white bg-white/10 text-white shadow-white/5'
                    : 'border-gray-800 hover:border-white/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${selectedFramework === option.id ? 'text-white' : 'text-gray-400'}`}>
                    {option.icon}
                  </div>
                  <span className="font-semibold text-white">{option.name}</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{option.description}</p>
                <div className="flex flex-wrap gap-2">
                  {option.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Code Input Panel */}
          <div className="h-[700px] flex flex-col">
            <div 
              className="relative flex-1 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg"
              style={{
                '--mouse-x': `${mousePosition.x}px`,
                '--mouse-y': `${mousePosition.y}px`
              } as React.CSSProperties}
            >
              <div className="absolute inset-0">
                <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                  <FileCode className="text-white" size={20} weight="duotone" />
                  <span className="font-mono text-white">Contract Code</span>
                </div>
                <div className="h-[calc(100%-60px)] custom-scrollbar">
                  <textarea
                    value={contractCode}
                    onChange={(e) => setContractCode(e.target.value)}
                    placeholder={`// Paste your Solidity contract code here...
// Example:
pragma solidity ^0.8.19;

contract MyContract {
    address public owner;
    mapping(address => uint256) public balances;
    
    constructor() {
        owner = msg.sender;
    }
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}`}
                    className="w-full h-full p-4 bg-transparent text-white font-mono text-sm focus:outline-none resize-none code-editor"
                    spellCheck="false"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={generateTests}
              disabled={!contractCode || isGenerating}
              className={`mt-4 w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                isGenerating || !contractCode
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {isGenerating ? (
                <>
                  <CircleNotch className="animate-spin" size={20} weight="bold" />
                  Generating Tests...
                </>
              ) : (
                <>
                  <Lightning size={20} weight="fill" />
                  Generate {TESTING_OPTIONS.find(opt => opt.id === selectedFramework)?.name} Tests
                </>
              )}
            </button>
          </div>

          {/* Results Panel */}
          <div className="h-[700px]">
            {generatedTests ? (
              <div 
                className="h-full bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg relative"
                style={{
                  '--mouse-x': `${mousePosition.x}px`,
                  '--mouse-y': `${mousePosition.y}px`
                } as React.CSSProperties}
              >
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TestTube className="text-white" size={20} weight="duotone" />
                    <span className="font-mono text-white">Generated {TESTING_OPTIONS.find(opt => opt.id === selectedFramework)?.name} Tests</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedTests)}
                    className="text-white hover:text-gray-300 text-sm flex items-center gap-1 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-white/10"
                  >
                    {copySuccess ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="h-[calc(100%-60px)] custom-scrollbar overflow-auto p-4 bg-gray-900/30">
                  <pre className="text-white font-mono text-sm whitespace-pre-wrap leading-relaxed">
                    {generatedTests}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg flex flex-col items-center justify-center text-gray-400">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-md"></div>
                  <TestTube size={48} className="relative z-10 text-white" weight="duotone" />
                </div>
                <p className="text-center mb-4">Enter your contract code and generate comprehensive test cases</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Gear size={16} className="text-blue-400" weight="duotone" />
                    <span>AI-Enhanced</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-green-400" weight="duotone" />
                    <span>RAG-Powered</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.5);
        }

        .code-editor {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          line-height: 1.6;
          tab-size: 2;
        }

        .code-editor::placeholder {
          color: rgba(156, 163, 175, 0.6);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}