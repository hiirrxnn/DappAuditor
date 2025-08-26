import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Verify critical environment variables
if (!process.env.PINECONE_API_KEY) {
  console.error('❌ PINECONE_API_KEY not found in environment variables');
  console.error('📝 Make sure .env.local contains: PINECONE_API_KEY=your_key_here');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY) {
  console.error('❌ NEXT_PUBLIC_GOOGLE_AI_API_KEY not found in environment variables');
  console.error('📝 Make sure .env.local contains: NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_key_here');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log(`🔑 Pinecone API Key: ${process.env.PINECONE_API_KEY?.substring(0, 10)}...`);
console.log(`🔑 Google AI API Key: ${process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY?.substring(0, 10)}...`);

import { vectorStore } from '../utils/vectorStore';
import { EtherscanFetcher } from './etherscanFetcher';
import { GitHubFetcher } from './githubFetcher';
import { CuratedFetcher, ADDITIONAL_CURATED_CONTRACTS } from './curatedFetcher';
import { VulnerabilityDetector } from './vulnerabilityDetector';

interface EnhancedContractData {
  id: string;
  chunk: string;
  metadata: {
    contractType: string;
    vulnerability?: string;
    pattern: string;
    solidityVersion: string;
    securityLevel: 'high' | 'medium' | 'low';
    documentationNotes: string;
    source: string;
    [key: string]: any;
  };
}

// Helper function for creating delays to respect API rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class EnhancedPineconeInitializer {
  private vulnerabilityDetector = new VulnerabilityDetector();
  private etherscanFetcher: EtherscanFetcher;
  private githubFetcher: GitHubFetcher;
  private curatedFetcher = new CuratedFetcher();

  constructor() {
    this.etherscanFetcher = new EtherscanFetcher();
    this.githubFetcher = new GitHubFetcher();
  }

  private logProgress(message: string, count?: number) {
    const timestamp = new Date().toLocaleTimeString();
    const countStr = count !== undefined ? ` (${count})` : '';
    console.log(`[${timestamp}] ${message}${countStr}`);
  }

  private enhanceContractWithVulnerabilityAnalysis(contract: EnhancedContractData): EnhancedContractData {
    try {
      const analysis = this.vulnerabilityDetector.detectVulnerabilities(contract.chunk);
      
      // Update security level based on vulnerability analysis
      if (analysis.vulnerabilities.length > 0) {
        contract.metadata.securityLevel = analysis.securityLevel;
        contract.metadata.vulnerability = analysis.vulnerabilities.map(v => v.name).join(', ');
      }
      
      // Enhance documentation notes with vulnerability analysis
      const vulnDocumentation = this.vulnerabilityDetector.generateTestingDocumentation(analysis.vulnerabilities);
      contract.metadata.documentationNotes = `${contract.metadata.documentationNotes}. ${vulnDocumentation}`;
      
      // Add vulnerability metadata
      contract.metadata.vulnerabilityCount = analysis.vulnerabilities.length;
      contract.metadata.riskAssessment = analysis.overallRisk;
      contract.metadata.detectedVulnerabilities = analysis.vulnerabilities.map(v => v.name);
      
      return contract;
    } catch (error) {
      console.warn(`⚠️ Vulnerability analysis failed for ${contract.id}:`, error);
      return contract;
    }
  }

  async fetchFromEtherscan(): Promise<EnhancedContractData[]> {
    this.logProgress('🌐 Starting Etherscan contract fetching...');
    
    try {
      const contracts = await this.etherscanFetcher.fetchAllEtherscanContracts();
      this.logProgress('✅ Etherscan fetching completed', contracts.length);
      
      // Enhance with vulnerability analysis
      const enhancedContracts = contracts.map(contract => 
        this.enhanceContractWithVulnerabilityAnalysis(contract)
      );
      
      return enhancedContracts;
    } catch (error) {
      console.error('❌ Etherscan fetching failed:', error);
      return [];
    }
  }

  async fetchFromGitHub(): Promise<EnhancedContractData[]> {
    this.logProgress('🐱 Starting GitHub repository crawling...');
    
    try {
      const contracts = await this.githubFetcher.fetchAllGitHubContracts();
      this.logProgress('✅ GitHub crawling completed', contracts.length);
      
      // Enhance with vulnerability analysis
      const enhancedContracts = contracts.map(contract => 
        this.enhanceContractWithVulnerabilityAnalysis(contract)
      );
      
      return enhancedContracts;
    } catch (error) {
      console.error('❌ GitHub fetching failed:', error);
      return [];
    }
  }

  async fetchCuratedContracts(): Promise<EnhancedContractData[]> {
    this.logProgress('⭐ Starting curated contract fetching...');
    
    try {
      const contracts = await this.curatedFetcher.fetchAllCuratedContracts();
      this.logProgress('✅ Curated contract fetching completed', contracts.length);
      
      // Add additional hardcoded contracts
      const additionalContracts: EnhancedContractData[] = ADDITIONAL_CURATED_CONTRACTS.map((contract, index) => ({
        id: `additional_curated_${index}`,
        chunk: contract.content,
        metadata: {
          contractType: contract.category,
          pattern: `${contract.category}_${contract.tags[0]}`,
          solidityVersion: 'various',
          securityLevel: contract.securityLevel,
          documentationNotes: `Curated example contract: ${contract.name}`,
          source: 'curated',
          tags: contract.tags,
          name: contract.name
        }
      }));
      
      const allCuratedContracts = [...contracts, ...additionalContracts];
      
      // Enhance with vulnerability analysis
      const enhancedContracts = allCuratedContracts.map(contract => 
        this.enhanceContractWithVulnerabilityAnalysis(contract)
      );
      
      this.logProgress('🔍 Vulnerability analysis completed for curated contracts');
      return enhancedContracts;
    } catch (error) {
      console.error('❌ Curated contract fetching failed:', error);
      return [];
    }
  }

  private async batchUpsert(contracts: EnhancedContractData[], batchSize: number = 5) {
    this.logProgress(`📦 Starting batch upsert of ${contracts.length} contracts with rate limiting...`);
    
    for (let i = 0; i < contracts.length; i += batchSize) {
      const batch = contracts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(contracts.length / batchSize);
      
      try {
        await vectorStore.upsertDocuments(batch);
        this.logProgress(`📝 Upserted batch ${batchNumber}/${totalBatches}`, batch.length);
        
        // Add delay after each batch except the last one to respect API rate limits
        if (i + batchSize < contracts.length) {
          this.logProgress(`⏳ Waiting 65 seconds to respect Google AI API rate limits... (batch ${batchNumber}/${totalBatches} complete)`);
          await delay(65000); // 65 seconds to be extra safe
        }
      } catch (error) {
        console.error(`❌ Batch upsert failed for batch starting at ${i}:`, error);
        
        // If we hit a rate limit error, wait longer before continuing
        if (error instanceof Error && error.message.includes('429')) {
          this.logProgress(`⚠️ Rate limit hit! Waiting 2 minutes before retrying next batch...`);
          await delay(120000); // 2 minutes
        }
      }
    }
  }

  private generateSummaryReport(contracts: EnhancedContractData[]) {
    const sourceStats = contracts.reduce((acc, contract) => {
      acc[contract.metadata.source] = (acc[contract.metadata.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = contracts.reduce((acc, contract) => {
      acc[contract.metadata.contractType] = (acc[contract.metadata.contractType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const securityStats = contracts.reduce((acc, contract) => {
      acc[contract.metadata.securityLevel] = (acc[contract.metadata.securityLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const vulnerableContracts = contracts.filter(c => c.metadata.vulnerability).length;
    const patterns = new Set(contracts.map(c => c.metadata.pattern));

    console.log('\\n🎉 ENHANCED RAG DATABASE INITIALIZATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 TOTAL CONTRACTS: ${contracts.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\\n📈 BY SOURCE:');
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log(`   ${source.toUpperCase()}: ${count} contracts`);
    });
    
    console.log('\\n🏷️  BY CATEGORY:');
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count} contracts`);
      });
    
    console.log('\\n🔒 BY SECURITY LEVEL:');
    Object.entries(securityStats).forEach(([level, count]) => {
      const emoji = level === 'high' ? '🟢' : level === 'medium' ? '🟡' : '🔴';
      console.log(`   ${emoji} ${level.toUpperCase()}: ${count} contracts`);
    });
    
    console.log(`\\n⚠️  VULNERABLE CONTRACTS: ${vulnerableContracts} (${((vulnerableContracts/contracts.length)*100).toFixed(1)}%)`);
    console.log(`🎯 UNIQUE PATTERNS: ${patterns.size}`);
    console.log('\\n🔍 Sample patterns:', Array.from(patterns).slice(0, 10).join(', '));
    console.log('\\n🚀 Your RAG system is now powered by real-world, production-grade smart contracts!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n');
  }

  async initializeEnhancedDatabase(): Promise<void> {
    const startTime = Date.now();
    
    console.log('🚀 ENHANCED PINECONE RAG DATABASE INITIALIZATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Initialize Pinecone
    this.logProgress('🗄️  Initializing Pinecone vector database...');
    const initialized = await vectorStore.initializeIndex();
    if (!initialized) {
      throw new Error('Failed to initialize Pinecone');
    }
    this.logProgress('✅ Pinecone initialization completed');
    
    // Clear the index to ensure a fresh start
    this.logProgress('🧹 Clearing existing vectors from the index for fresh initialization...');
    try {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });
      const indexName = process.env.PINECONE_INDEX_NAME || 'dappauditor-contracts';
      await pinecone.index(indexName).deleteAll();
      this.logProgress('✅ Index cleared successfully');
    } catch (error) {
      this.logProgress('⚠️  Index clearing failed, but continuing (index might already be empty)');
    }
    
    // Collect all contracts from different sources
    const allContracts: EnhancedContractData[] = [];
    
    // Fetch from all sources in parallel for better performance
    const [etherscanContracts, githubContracts, curatedContracts] = await Promise.allSettled([
      this.fetchFromEtherscan(),
      this.fetchFromGitHub(),
      this.fetchCuratedContracts()
    ]);
    
    // Process results
    if (etherscanContracts.status === 'fulfilled') {
      allContracts.push(...etherscanContracts.value);
    } else {
      console.error('❌ Etherscan failed:', etherscanContracts.reason);
    }
    
    if (githubContracts.status === 'fulfilled') {
      allContracts.push(...githubContracts.value);
    } else {
      console.error('❌ GitHub failed:', githubContracts.reason);
    }
    
    if (curatedContracts.status === 'fulfilled') {
      allContracts.push(...curatedContracts.value);
    } else {
      console.error('❌ Curated contracts failed:', curatedContracts.reason);
    }
    
    if (allContracts.length === 0) {
      throw new Error('No contracts were successfully fetched from any source');
    }
    
    // Remove duplicates based on content similarity
    const uniqueContracts = this.removeDuplicates(allContracts);
    this.logProgress('🔄 Removed duplicates', uniqueContracts.length);
    
    // Batch upsert to Pinecone
    await this.batchUpsert(uniqueContracts);
    
    // Generate summary report
    this.generateSummaryReport(uniqueContracts);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Total initialization time: ${duration} seconds`);
  }

  private removeDuplicates(contracts: EnhancedContractData[]): EnhancedContractData[] {
    const seen = new Set<string>();
    return contracts.filter(contract => {
      // Create a hash based on contract content (first 500 characters)
      const hash = contract.chunk.substring(0, 500).replace(/\\s+/g, '').toLowerCase();
      if (seen.has(hash)) {
        return false;
      }
      seen.add(hash);
      return true;
    });
  }
}

// Main execution function
export async function initializeEnhancedPinecone(): Promise<void> {
  const initializer = new EnhancedPineconeInitializer();
  
  try {
    await initializer.initializeEnhancedDatabase();
  } catch (error) {
    console.error('💥 Enhanced Pinecone initialization failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  console.log('🎯 Starting Enhanced RAG Database Initialization...');
  console.log('📚 This will fetch contracts from:');
  console.log('   • Etherscan (verified contracts)');
  console.log('   • GitHub (OpenZeppelin, Uniswap, Aave, etc.)');
  console.log('   • Curated high-quality examples');
  console.log('   • Vulnerability examples for testing\\n');
  
  initializeEnhancedPinecone()
    .then(() => {
      console.log('🎊 SUCCESS! Your RAG system is now dramatically enhanced!');
      console.log('💡 Next steps:');
      console.log('   1. Test the enhanced system with contract analysis');
      console.log('   2. Monitor RAG metrics for improved relevance');
      console.log('   3. Add more contracts as needed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      console.log('\\n🔧 Troubleshooting:');
      console.log('   1. Check your API keys (ETHERSCAN_API_KEY, GITHUB_TOKEN)');
      console.log('   2. Verify Pinecone and Google AI credentials');
      console.log('   3. Check internet connectivity');
      process.exit(1);
    });
}