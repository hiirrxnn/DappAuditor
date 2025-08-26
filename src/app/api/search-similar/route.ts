import { NextRequest, NextResponse } from 'next/server';
import { vectorStore } from '@/utils/vectorStore';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 3 } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log(`🔍 Search-similar API called with query: ${query.substring(0, 50)}...`);

    // Initialize Pinecone if needed
    await vectorStore.initializeIndex();
    
    // Search for similar contracts (no server-side tracking - will be done client-side)
    const results = await vectorStore.searchSimilar(query, limit);
    
    // Calculate context metrics for client-side tracking
    const totalContextLength = results.reduce((sum, result) => 
      sum + (result.chunk?.length || 0), 0
    );
    const relevantContextLength = results
      .filter(result => (result.score || 0) > 0.7)
      .reduce((sum, result) => sum + (result.chunk?.length || 0), 0);

    console.log(`✅ Search completed: ${results.length} results, avg score: ${
      results.length > 0 ? (results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length).toFixed(3) : 0
    }`);

    // Return results with tracking metadata for client-side processing
    return NextResponse.json({ 
      results,
      trackingData: {
        query: query.substring(0, 200), // Limit for storage
        resultsCount: results.length,
        averageScore: results.length > 0 ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length : 0,
        maxScore: results.length > 0 ? Math.max(...results.map(r => r.score || 0)) : 0,
        minScore: results.length > 0 ? Math.min(...results.map(r => r.score || 0).filter(s => s > 0)) : 0,
        totalContextLength,
        relevantContextLength,
        utilizationRate: totalContextLength > 0 ? (relevantContextLength / totalContextLength) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Search similar API error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to search similar contracts',
      results: [],
      trackingData: null
    }, { status: 500 });
  }
}