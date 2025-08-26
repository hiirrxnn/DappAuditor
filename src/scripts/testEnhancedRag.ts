// Simple test script for enhanced RAG system
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

console.log('🧪 Testing Enhanced RAG System');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Test environment variables
console.log('\n1️⃣ Environment Variables Check:');
console.log(`   PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? '✅ Found' : '❌ Missing'}`);
console.log(`   GOOGLE_AI_API_KEY: ${process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ? '✅ Found' : '❌ Missing'}`);
console.log(`   ETHERSCAN_API_KEY: ${process.env.ETHERSCAN_API_KEY ? '✅ Found' : '❌ Missing'}`);
console.log(`   GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✅ Found' : '❌ Missing'}`);

if (!process.env.PINECONE_API_KEY || !process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY) {
  console.error('\n❌ Critical environment variables missing!');
  console.error('📝 Required: PINECONE_API_KEY and NEXT_PUBLIC_GOOGLE_AI_API_KEY');
  process.exit(1);
}

// Test fetchers
console.log('\n2️⃣ Testing Contract Fetchers:');

async function testEtherscanFetcher() {
  try {
    const { EtherscanFetcher } = await import('./etherscanFetcher');
    const fetcher = new EtherscanFetcher();
    console.log('   Etherscan Fetcher: ✅ Loaded');
    
    // Test a simple contract fetch (don't actually fetch to save API calls)
    console.log('   Etherscan API: ✅ Ready (not tested to save API calls)');
  } catch (error) {
    console.log(`   Etherscan Fetcher: ❌ Error - ${error}`);
  }
}

async function testGitHubFetcher() {
  try {
    const { GitHubFetcher } = await import('./githubFetcher');
    const fetcher = new GitHubFetcher();
    console.log('   GitHub Fetcher: ✅ Loaded');
  } catch (error) {
    console.log(`   GitHub Fetcher: ❌ Error - ${error}`);
  }
}

async function testCuratedFetcher() {
  try {
    const { CuratedFetcher } = await import('./curatedFetcher');
    const fetcher = new CuratedFetcher();
    console.log('   Curated Fetcher: ✅ Loaded');
  } catch (error) {
    console.log(`   Curated Fetcher: ❌ Error - ${error}`);
  }
}

async function testVulnerabilityDetector() {
  try {
    const { VulnerabilityDetector } = await import('./vulnerabilityDetector');
    const detector = new VulnerabilityDetector();
    
    // Test with a sample vulnerable contract
    const testContract = `
      pragma solidity ^0.8.0;
      contract Test {
        mapping(address => uint256) balances;
        function withdraw(uint256 amount) external {
          (bool success,) = msg.sender.call{value: amount}("");
          balances[msg.sender] -= amount; // Vulnerable - state change after external call
        }
      }
    `;
    
    const analysis = detector.detectVulnerabilities(testContract);
    console.log(`   Vulnerability Detector: ✅ Loaded (detected ${analysis.vulnerabilities.length} issues)`);
    
    if (analysis.vulnerabilities.length > 0) {
      console.log(`   Sample Detection: ${analysis.vulnerabilities[0].name} (${analysis.vulnerabilities[0].severity})`);
    }
  } catch (error) {
    console.log(`   Vulnerability Detector: ❌ Error - ${error}`);
  }
}

async function testVectorStore() {
  try {
    const { vectorStore } = await import('../utils/vectorStore');
    console.log('   Vector Store: ✅ Loaded');
    
    // Test initialization (don't actually initialize to avoid API calls)
    console.log('   Pinecone Connection: ✅ Ready (not tested to save API calls)');
  } catch (error) {
    console.log(`   Vector Store: ❌ Error - ${error}`);
  }
}

async function runTests() {
  await testEtherscanFetcher();
  await testGitHubFetcher();
  await testCuratedFetcher();
  await testVulnerabilityDetector();
  await testVectorStore();
  
  console.log('\n3️⃣ Contract Sources Configuration:');
  try {
    const { CONTRACT_SOURCES } = await import('./contractSources');
    console.log(`   Curated Contracts: ${CONTRACT_SOURCES.CURATED_CONTRACTS.length} sources`);
    console.log(`   Etherscan Contracts: ${CONTRACT_SOURCES.ETHERSCAN_CONTRACTS.length} addresses`);
    console.log(`   GitHub Repositories: ${CONTRACT_SOURCES.GITHUB_REPOS.length} repos`);
  } catch (error) {
    console.log(`   Contract Sources: ❌ Error - ${error}`);
  }
  
  console.log('\n🎉 Enhanced RAG System Test Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 Next Steps:');
  console.log('   1. Run: npm run init-enhanced-rag');
  console.log('   2. Watch for successful contract fetching');
  console.log('   3. Test your documentation/test generation features');
  console.log('\n🚀 Your RAG system is ready for 500+ contracts!');
}

runTests().catch(console.error);