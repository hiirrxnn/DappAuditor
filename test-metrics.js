// Metrics Test Script
// Run this in your browser console on localhost:3000

async function testMetrics() {
  console.log('🧪 Testing Metrics Collection...\n');
  
  // 1. Check current localStorage data
  console.log('📁 Current localStorage data:');
  const ragData = localStorage.getItem('rag_performance_metrics');
  const blockchainData = localStorage.getItem('blockchain_performance_metrics');
  const mistralData = localStorage.getItem('mistral_performance_metrics');
  
  console.log('RAG data:', ragData ? JSON.parse(ragData).length + ' entries' : 'null');
  console.log('Blockchain data:', blockchainData ? JSON.parse(blockchainData).length + ' entries' : 'null');
  console.log('Mistral data:', mistralData ? JSON.parse(mistralData).length + ' entries' : 'null');
  
  // 2. Test RAG API endpoint
  console.log('\n🔍 Testing RAG API...');
  try {
    const ragResponse = await fetch('/api/search-similar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: 'smart contract security vulnerability test', 
        limit: 2 
      })
    });
    
    const ragResult = await ragResponse.json();
    console.log('RAG API Response:', ragResult.metrics);
    
    // Check if data was stored
    setTimeout(() => {
      const newRagData = localStorage.getItem('rag_performance_metrics');
      console.log('RAG data after test:', newRagData ? JSON.parse(newRagData).length + ' entries' : 'still null');
    }, 1000);
    
  } catch (error) {
    console.error('RAG test failed:', error);
  }
  
  // 3. Check for any blockchain transaction data
  console.log('\n⛓️ Checking for blockchain transaction data...');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('blockchain') || key.includes('tx') || key.includes('transaction'))) {
      const value = localStorage.getItem(key);
      console.log(`Found: ${key} = ${value ? (typeof value === 'string' && value.startsWith('[') ? JSON.parse(value).length + ' items' : value.substring(0, 100) + '...') : 'null'}`);
    }
  }
  
  // 4. Import and test trackers directly
  console.log('\n🎯 Testing trackers directly...');
  try {
    // Dynamically import the trackers (if modules are available)
    const { ragTracker } = await import('/src/utils/ragTracker.ts');
    const { blockchainTracker } = await import('/src/utils/blockchainTracker.ts');
    const { performanceTracker } = await import('/src/utils/performanceTracker.ts');
    
    console.log('RAG Tracker metrics:', ragTracker.getMetrics());
    console.log('Blockchain Tracker metrics:', blockchainTracker.getMetrics());
    console.log('Performance Tracker metrics:', performanceTracker.getMetrics());
    
  } catch (error) {
    console.log('Could not import trackers directly:', error.message);
    
    // Alternative: Check if trackers exist on window
    if (window.ragTracker) {
      console.log('Window RAG Tracker metrics:', window.ragTracker.getMetrics());
    }
    if (window.blockchainTracker) {
      console.log('Window Blockchain Tracker metrics:', window.blockchainTracker.getMetrics());
    }
  }
  
  // 5. Create test blockchain transaction
  console.log('\n⚡ Creating test blockchain metrics...');
  
  const testBlockchainData = [{
    id: `test_tx_${Date.now()}`,
    timestamp: Date.now(),
    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    startTime: performance.now() - 5000,
    endTime: performance.now(),
    duration: 5000,
    success: true,
    gasUsed: 21000,
    gasPrice: 20000000000,
    gasCost: 420000000000000,
    blockNumber: 12345,
    network: 'sepolia',
    contractAddress: '0x742d35Cc6634C0532925a3b8D84c6634C0532925',
    functionName: 'registerAudit'
  }];
  
  localStorage.setItem('blockchain_performance_metrics', JSON.stringify(testBlockchainData));
  console.log('✅ Test blockchain data created');
  
  // 6. Final check
  console.log('\n📊 Final metrics check:');
  console.log('Mistral metrics:', mistralData ? JSON.parse(mistralData) : null);
  console.log('RAG metrics:', localStorage.getItem('rag_performance_metrics') ? JSON.parse(localStorage.getItem('rag_performance_metrics')) : null);
  console.log('Blockchain metrics:', localStorage.getItem('blockchain_performance_metrics') ? JSON.parse(localStorage.getItem('blockchain_performance_metrics')) : null);
}

// Run the test
testMetrics();