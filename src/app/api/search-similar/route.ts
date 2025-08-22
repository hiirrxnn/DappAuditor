import { NextRequest, NextResponse } from 'next/server';
import { vectorStore } from '@/utils/vectorStore';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 3 } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Initialize Pinecone if needed
    await vectorStore.initializeIndex();
    
    // Search for similar contracts
    const results = await vectorStore.searchSimilar(query, limit);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search similar API error:', error);
    return NextResponse.json({ 
      error: 'Failed to search similar contracts',
      results: [] 
    }, { status: 500 });
  }
}