import { CONTRACT_SOURCES } from './contractSources';

interface EtherscanResponse {
  status: string;
  message: string;
  result: Array<{
    SourceCode: string;
    ABI: string;
    ContractName: string;
    CompilerVersion: string;
    OptimizationUsed: string;
    Runs: string;
    ConstructorArguments: string;
    EVMVersion: string;
    Library: string;
    LicenseType: string;
    Proxy: string;
    Implementation: string;
    SwarmSource: string;
  }>;
}

interface ContractData {
  id: string;
  chunk: string;
  metadata: {
    contractType: string;
    vulnerability?: string;
    pattern: string;
    solidityVersion: string;
    securityLevel: 'high' | 'medium' | 'low';
    documentationNotes: string;
    source: 'etherscan';
    address: string;
    name: string;
    verified: boolean;
  };
}

export class EtherscanFetcher {
  private apiKey: string;
  private baseUrl = 'https://api.etherscan.io/api';
  private rateLimitDelay = 200; // 5 requests per second

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ETHERSCAN_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ No Etherscan API key found. Set ETHERSCAN_API_KEY env variable for better rate limits');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchContractSource(address: string): Promise<EtherscanResponse | null> {
    try {
      const url = `${this.baseUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${this.apiKey}`;
      
      console.log(`🔍 Fetching contract from Etherscan: ${address}`);
      
      const response = await fetch(url);
      const data: EtherscanResponse = await response.json();
      
      if (data.status !== '1') {
        console.error(`❌ Etherscan API error for ${address}:`, data.message);
        return null;
      }
      
      // Rate limiting
      await this.delay(this.rateLimitDelay);
      
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch contract ${address}:`, error);
      return null;
    }
  }

  private extractSolidityVersion(compilerVersion: string): string {
    const match = compilerVersion.match(/v(\d+\.\d+\.\d+)/);
    return match ? match[1] : 'unknown';
  }

  private categorizeContract(sourceCode: string, contractName: string): {
    contractType: string;
    pattern: string;
    securityLevel: 'high' | 'medium' | 'low';
    vulnerability?: string;
    documentationNotes: string;
  } {
    const code = sourceCode.toLowerCase();
    const name = contractName.toLowerCase();
    
    // DeFi patterns
    if (code.includes('flashloan') || code.includes('flash loan')) {
      return {
        contractType: 'defi',
        pattern: 'flashloan_protocol',
        securityLevel: 'high',
        documentationNotes: 'Test focus: flashloan reentrancy, arbitrage protection, fee calculation'
      };
    }
    
    if (code.includes('liquidity') && (code.includes('swap') || code.includes('amm'))) {
      return {
        contractType: 'defi',
        pattern: 'amm_protocol',
        securityLevel: 'high',
        documentationNotes: 'Test focus: slippage protection, liquidity management, price manipulation'
      };
    }
    
    if (code.includes('borrow') || code.includes('lend') || code.includes('collateral')) {
      return {
        contractType: 'defi',
        pattern: 'lending_protocol',
        securityLevel: 'high',
        documentationNotes: 'Test focus: liquidation logic, interest rate models, collateral ratios'
      };
    }
    
    // Token patterns
    if (code.includes('transfer') && (code.includes('balanceof') || code.includes('allowance'))) {
      if (code.includes('erc721') || code.includes('tokenuri') || name.includes('nft')) {
        return {
          contractType: 'nft',
          pattern: 'erc721_implementation',
          securityLevel: 'medium',
          documentationNotes: 'Test focus: NFT transfers, metadata handling, approval mechanisms'
        };
      } else {
        return {
          contractType: 'token',
          pattern: 'erc20_implementation',
          securityLevel: 'medium',
          documentationNotes: 'Test focus: token transfers, approval patterns, total supply management'
        };
      }
    }
    
    // Access control patterns
    if (code.includes('onlyowner') || code.includes('only owner') || code.includes('modifier') && code.includes('owner')) {
      return {
        contractType: 'access',
        pattern: 'ownership_control',
        securityLevel: 'medium',
        documentationNotes: 'Test focus: access control, ownership transfers, unauthorized access prevention'
      };
    }
    
    // Multisig patterns
    if (code.includes('multisig') || (code.includes('owners') && code.includes('required'))) {
      return {
        contractType: 'wallet',
        pattern: 'multisig_wallet',
        securityLevel: 'high',
        documentationNotes: 'Test focus: signature validation, threshold requirements, transaction execution'
      };
    }
    
    // Vulnerability detection
    if (code.includes('call.value') && !code.includes('reentrancyguard')) {
      return {
        contractType: 'vulnerable',
        pattern: 'reentrancy_vulnerable',
        securityLevel: 'low',
        vulnerability: 'reentrancy',
        documentationNotes: 'VULNERABLE: Test focus: reentrancy attacks, state consistency, external call safety'
      };
    }
    
    if (!code.includes('require') && !code.includes('assert') && !code.includes('revert')) {
      return {
        contractType: 'vulnerable',
        pattern: 'missing_validation',
        securityLevel: 'low',
        vulnerability: 'input_validation',
        documentationNotes: 'VULNERABLE: Test focus: input validation, parameter checking, bounds verification'
      };
    }
    
    // Oracle patterns
    if (code.includes('oracle') || code.includes('pricefeed') || code.includes('aggregator')) {
      return {
        contractType: 'oracle',
        pattern: 'price_oracle',
        securityLevel: 'high',
        documentationNotes: 'Test focus: price manipulation resistance, data freshness, fallback mechanisms'
      };
    }
    
    // Governance patterns
    if (code.includes('vote') || code.includes('proposal') || code.includes('governance')) {
      return {
        contractType: 'governance',
        pattern: 'dao_governance',
        securityLevel: 'medium',
        documentationNotes: 'Test focus: voting mechanisms, quorum requirements, proposal execution'
      };
    }
    
    // Default categorization
    return {
      contractType: 'utility',
      pattern: 'general_contract',
      securityLevel: 'medium',
      documentationNotes: 'Test focus: general functionality, edge cases, gas optimization'
    };
  }

  private extractMainContract(sourceCode: string): string {
    // Handle single file contracts
    if (!sourceCode.includes('{{')) {
      return sourceCode;
    }
    
    try {
      // Handle multi-file contracts (Etherscan format)
      const parsed = JSON.parse(sourceCode.substring(1, sourceCode.length - 1));
      
      // Find the main contract file (usually the one with constructor or largest file)
      let mainContract = '';
      let largestSize = 0;
      
      for (const [fileName, content] of Object.entries(parsed.sources || {})) {
        const fileContent = (content as any).content || '';
        if (fileContent.length > largestSize && fileContent.includes('contract ') && !fileName.includes('interface')) {
          mainContract = fileContent;
          largestSize = fileContent.length;
        }
      }
      
      return mainContract || sourceCode;
    } catch {
      return sourceCode;
    }
  }

  async fetchAllEtherscanContracts(): Promise<ContractData[]> {
    const contracts: ContractData[] = [];
    
    console.log(`🚀 Fetching ${CONTRACT_SOURCES.ETHERSCAN_CONTRACTS.length} contracts from Etherscan...`);
    
    for (const contractInfo of CONTRACT_SOURCES.ETHERSCAN_CONTRACTS) {
      try {
        const data = await this.fetchContractSource(contractInfo.address);
        if (!data || !data.result || data.result.length === 0) {
          console.warn(`⚠️ No source code found for ${contractInfo.name} (${contractInfo.address})`);
          continue;
        }
        
        const result = data.result[0];
        if (!result.SourceCode) {
          console.warn(`⚠️ Empty source code for ${contractInfo.name}`);
          continue;
        }
        
        const mainContract = this.extractMainContract(result.SourceCode);
        if (mainContract.length < 100) {
          console.warn(`⚠️ Contract too small for ${contractInfo.name}, skipping`);
          continue;
        }
        
        const analysis = this.categorizeContract(mainContract, result.ContractName);
        
        const contractData: ContractData = {
          id: `etherscan_${contractInfo.address.toLowerCase()}`,
          chunk: mainContract.substring(0, 8000), // Limit chunk size for embedding
          metadata: {
            ...analysis,
            solidityVersion: this.extractSolidityVersion(result.CompilerVersion),
            source: 'etherscan',
            address: contractInfo.address,
            name: contractInfo.name,
            verified: true
          }
        };
        
        contracts.push(contractData);
        console.log(`✅ Successfully fetched ${contractInfo.name} (${analysis.pattern})`);
        
      } catch (error) {
        console.error(`❌ Error processing ${contractInfo.name}:`, error);
      }
    }
    
    console.log(`🎉 Successfully fetched ${contracts.length} contracts from Etherscan`);
    return contracts;
  }
}