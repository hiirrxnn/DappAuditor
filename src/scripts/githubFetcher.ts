import { CONTRACT_SOURCES } from './contractSources';

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

interface GitHubContractData {
  id: string;
  chunk: string;
  metadata: {
    contractType: string;
    vulnerability?: string;
    pattern: string;
    solidityVersion: string;
    securityLevel: 'high' | 'medium' | 'low';
    documentationNotes: string;
    source: 'github';
    repository: string;
    filePath: string;
    stars?: number;
  };
}

export class GitHubFetcher {
  private token: string;
  private baseUrl = 'https://api.github.com';
  private rateLimitDelay = 100; // GitHub has higher rate limits

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || '';
    if (!this.token) {
      console.warn('⚠️ No GitHub token found. Set GITHUB_TOKEN env variable for better rate limits');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getHeaders() {
    return {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DappAuditor-RAG-System',
      ...(this.token && { 'Authorization': `token ${this.token}` })
    };
  }

  async fetchRepositoryFiles(owner: string, repo: string, path: string = ''): Promise<GitHubFile[]> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
      
      console.log(`🔍 Fetching files from ${owner}/${repo}/${path}`);
      
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      await this.delay(this.rateLimitDelay);
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`❌ Failed to fetch files from ${owner}/${repo}/${path}:`, error);
      return [];
    }
  }

  async fetchFileContent(downloadUrl: string): Promise<string> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      
      const content = await response.text();
      await this.delay(this.rateLimitDelay);
      
      return content;
    } catch (error) {
      console.error(`❌ Failed to fetch file content from ${downloadUrl}:`, error);
      return '';
    }
  }

  async getRepositoryInfo(owner: string, repo: string): Promise<{ stars: number; description: string }> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}`;
      const response = await fetch(url, { headers: this.getHeaders() });
      
      if (!response.ok) {
        return { stars: 0, description: '' };
      }
      
      const data = await response.json();
      await this.delay(this.rateLimitDelay);
      
      return {
        stars: data.stargazers_count || 0,
        description: data.description || ''
      };
    } catch {
      return { stars: 0, description: '' };
    }
  }

  private extractSolidityVersion(content: string): string {
    const pragmaMatch = content.match(/pragma\\s+solidity\\s+([^;]+);/);
    if (pragmaMatch) {
      return pragmaMatch[1].replace(/[^0-9.]/g, '').split('.').slice(0, 3).join('.');
    }
    return 'unknown';
  }

  private categorizeContractAdvanced(content: string, fileName: string, repoName: string): {
    contractType: string;
    pattern: string;
    securityLevel: 'high' | 'medium' | 'low';
    vulnerability?: string;
    documentationNotes: string;
  } {
    const code = content.toLowerCase();
    const file = fileName.toLowerCase();
    const repo = repoName.toLowerCase();
    
    // Repository-based categorization
    if (repo.includes('openzeppelin')) {
      return {
        contractType: this.getOpenZeppelinCategory(file, code),
        pattern: `openzeppelin_${file.replace('.sol', '')}`,
        securityLevel: 'high',
        documentationNotes: 'OpenZeppelin standard - industry best practices, comprehensive testing patterns'
      };
    }
    
    if (repo.includes('uniswap')) {
      return {
        contractType: 'defi',
        pattern: 'uniswap_amm',
        securityLevel: 'high',
        documentationNotes: 'Uniswap DEX protocol - test focus: AMM mechanics, slippage, liquidity management'
      };
    }
    
    if (repo.includes('compound')) {
      return {
        contractType: 'defi',
        pattern: 'compound_lending',
        securityLevel: 'high',
        documentationNotes: 'Compound lending protocol - test focus: interest rates, liquidations, collateral'
      };
    }
    
    if (repo.includes('aave')) {
      return {
        contractType: 'defi',
        pattern: 'aave_lending',
        securityLevel: 'high',
        documentationNotes: 'Aave lending protocol - test focus: flash loans, variable rates, liquidations'
      };
    }
    
    if (repo.includes('chainlink')) {
      return {
        contractType: 'oracle',
        pattern: 'chainlink_oracle',
        securityLevel: 'high',
        documentationNotes: 'Chainlink oracle system - test focus: price feeds, data freshness, aggregation'
      };
    }
    
    if (repo.includes('makerdao') || repo.includes('dss')) {
      return {
        contractType: 'defi',
        pattern: 'makerdao_cdp',
        securityLevel: 'high',
        documentationNotes: 'MakerDAO CDP system - test focus: stability fees, liquidations, governance'
      };
    }
    
    // Advanced pattern detection
    if (this.isFlashLoanContract(code)) {
      return {
        contractType: 'defi',
        pattern: 'flashloan_advanced',
        securityLevel: 'high',
        documentationNotes: 'Flash loan implementation - test focus: atomicity, reentrancy, arbitrage protection'
      };
    }
    
    if (this.isGovernanceContract(code)) {
      return {
        contractType: 'governance',
        pattern: 'dao_governance_advanced',
        securityLevel: 'medium',
        documentationNotes: 'DAO governance - test focus: voting power, proposal execution, timelock mechanisms'
      };
    }
    
    if (this.isNFTMarketplace(code)) {
      return {
        contractType: 'marketplace',
        pattern: 'nft_marketplace_advanced',
        securityLevel: 'medium',
        documentationNotes: 'NFT marketplace - test focus: royalties, marketplace fees, collection verification'
      };
    }
    
    if (this.isUpgradeableProxy(code)) {
      return {
        contractType: 'proxy',
        pattern: 'upgradeable_proxy',
        securityLevel: 'high',
        documentationNotes: 'Upgradeable proxy - test focus: upgrade safety, storage layout, admin controls'
      };
    }
    
    if (this.isStakingContract(code)) {
      return {
        contractType: 'defi',
        pattern: 'staking_rewards',
        securityLevel: 'medium',
        documentationNotes: 'Staking contract - test focus: reward calculation, slashing, withdrawal delays'
      };
    }
    
    if (this.isBridgeContract(code)) {
      return {
        contractType: 'bridge',
        pattern: 'cross_chain_bridge',
        securityLevel: 'high',
        documentationNotes: 'Cross-chain bridge - test focus: signature validation, replay protection, limits'
      };
    }
    
    // Vulnerability detection with advanced patterns
    if (this.hasReentrancyRisk(code)) {
      return {
        contractType: 'vulnerable',
        pattern: 'reentrancy_risk',
        securityLevel: 'low',
        vulnerability: 'reentrancy',
        documentationNotes: 'POTENTIAL VULNERABILITY: External calls before state changes - test reentrancy scenarios'
      };
    }
    
    if (this.hasAccessControlIssues(code)) {
      return {
        contractType: 'vulnerable',
        pattern: 'access_control_issues',
        securityLevel: 'low',
        vulnerability: 'access_control',
        documentationNotes: 'POTENTIAL VULNERABILITY: Missing or weak access controls - test unauthorized access'
      };
    }
    
    // Default advanced categorization
    return this.getDefaultCategory(code, file);
  }

  private getOpenZeppelinCategory(fileName: string, code: string): string {
    if (fileName.includes('erc20') || fileName.includes('token')) return 'token';
    if (fileName.includes('erc721') || fileName.includes('nft')) return 'nft';
    if (fileName.includes('access') || fileName.includes('ownable')) return 'access';
    if (fileName.includes('security') || fileName.includes('guard')) return 'security';
    if (fileName.includes('governance') || fileName.includes('votes')) return 'governance';
    if (fileName.includes('utils') || fileName.includes('math')) return 'utility';
    return 'standard';
  }

  private isFlashLoanContract(code: string): boolean {
    return (code.includes('flashloan') || code.includes('flash loan')) &&
           code.includes('callback') &&
           (code.includes('borrow') || code.includes('repay'));
  }

  private isGovernanceContract(code: string): boolean {
    return code.includes('vote') &&
           (code.includes('proposal') || code.includes('quorum')) &&
           code.includes('execute');
  }

  private isNFTMarketplace(code: string): boolean {
    return (code.includes('marketplace') || (code.includes('buy') && code.includes('sell'))) &&
           (code.includes('erc721') || code.includes('nft')) &&
           code.includes('price');
  }

  private isUpgradeableProxy(code: string): boolean {
    return (code.includes('proxy') || code.includes('upgradeable')) &&
           (code.includes('implementation') || code.includes('delegate'));
  }

  private isStakingContract(code: string): boolean {
    return code.includes('stake') &&
           (code.includes('reward') || code.includes('earn')) &&
           (code.includes('withdraw') || code.includes('claim'));
  }

  private isBridgeContract(code: string): boolean {
    return (code.includes('bridge') || code.includes('cross-chain')) &&
           (code.includes('deposit') && code.includes('withdraw')) &&
           (code.includes('signature') || code.includes('validator'));
  }

  private hasReentrancyRisk(code: string): boolean {
    return (code.includes('.call') || code.includes('.transfer') || code.includes('.send')) &&
           !code.includes('reentrancyguard') &&
           !code.includes('nonreentrant') &&
           code.includes('balance[') &&
           code.indexOf('balance[') > code.indexOf('.call');
  }

  private hasAccessControlIssues(code: string): boolean {
    return code.includes('function') &&
           !code.includes('onlyowner') &&
           !code.includes('require(msg.sender') &&
           !code.includes('modifier') &&
           (code.includes('selfdestruct') || code.includes('transfer('));
  }

  private getDefaultCategory(code: string, fileName: string): {
    contractType: string;
    pattern: string;
    securityLevel: 'high' | 'medium' | 'low';
    documentationNotes: string;
  } {
    if (fileName.includes('test') || fileName.includes('mock')) {
      return {
        contractType: 'test',
        pattern: 'test_contract',
        securityLevel: 'medium',
        documentationNotes: 'Test contract - focus on testing patterns and mock implementations'
      };
    }

    return {
      contractType: 'utility',
      pattern: 'advanced_contract',
      securityLevel: 'medium',
      documentationNotes: 'Advanced contract pattern - comprehensive testing recommended'
    };
  }

  async crawlRepository(owner: string, repo: string, path: string = ''): Promise<GitHubContractData[]> {
    const contracts: GitHubContractData[] = [];
    
    try {
      const repoInfo = await this.getRepositoryInfo(owner, repo);
      console.log(`🌟 ${owner}/${repo} (${repoInfo.stars} stars): ${repoInfo.description}`);
      
      const files = await this.fetchRepositoryFiles(owner, repo, path);
      
      for (const file of files) {
        // Recursively crawl directories
        if (file.type === 'dir' && !file.name.startsWith('.') && !file.name.includes('test')) {
          const subContracts = await this.crawlRepository(owner, repo, file.path);
          contracts.push(...subContracts);
          continue;
        }
        
        // Process Solidity files
        if (file.name.endsWith('.sol') && 
            !file.name.includes('Test') && 
            !file.name.includes('Mock') &&
            !file.name.startsWith('I') && // Skip interfaces
            file.size > 500 && file.size < 50000) { // Reasonable size limits
          
          try {
            const content = await this.fetchFileContent(file.download_url);
            if (!content || content.length < 200) continue;
            
            // Skip if it's just an interface
            if (content.includes('interface ') && !content.includes('contract ')) continue;
            
            const analysis = this.categorizeContractAdvanced(content, file.name, repo);
            
            const contractData: GitHubContractData = {
              id: `github_${owner}_${repo}_${file.sha}`,
              chunk: content.length > 8000 ? content.substring(0, 8000) : content,
              metadata: {
                ...analysis,
                solidityVersion: this.extractSolidityVersion(content),
                source: 'github',
                repository: `${owner}/${repo}`,
                filePath: file.path,
                stars: repoInfo.stars
              }
            };
            
            contracts.push(contractData);
            console.log(`✅ Added ${file.name} (${analysis.pattern}) from ${owner}/${repo}`);
            
          } catch (error) {
            console.warn(`⚠️ Failed to process ${file.name}: ${error}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to crawl repository ${owner}/${repo}:`, error);
    }
    
    return contracts;
  }

  async fetchAllGitHubContracts(): Promise<GitHubContractData[]> {
    const allContracts: GitHubContractData[] = [];
    
    console.log(`🚀 Crawling ${CONTRACT_SOURCES.GITHUB_REPOS.length} GitHub repositories...`);
    
    for (const repoConfig of CONTRACT_SOURCES.GITHUB_REPOS) {
      try {
        const contracts = await this.crawlRepository(repoConfig.owner, repoConfig.repo, repoConfig.path);
        allContracts.push(...contracts);
        
        console.log(`🎉 Successfully crawled ${repoConfig.owner}/${repoConfig.repo}: ${contracts.length} contracts`);
        
        // Longer delay between repositories to be respectful
        await this.delay(1000);
        
      } catch (error) {
        console.error(`❌ Error crawling ${repoConfig.owner}/${repoConfig.repo}:`, error);
      }
    }
    
    console.log(`🏆 Total contracts from GitHub: ${allContracts.length}`);
    return allContracts;
  }
}