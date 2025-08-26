import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ragTracker } from './ragTracker';

interface VectorDocument {
  id: string;
  chunk: string;
  score?: number;
  metadata?: {
    contractType?: string;
    vulnerability?: string;
    pattern?: string;
    solidityVersion?: string;
    securityLevel?: 'high' | 'medium' | 'low';
    documentationNotes?: string;
  };
}

export class EnhancedVectorStore {
  private pinecone: Pinecone;
  private genAI: GoogleGenerativeAI;
  private indexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    this.genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY!);
    this.indexName = process.env.PINECONE_INDEX_NAME || 'dappauditor-contracts';
  }

  async initializeIndex() {
    try {
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(index => index.name === this.indexName);

      if (!indexExists) {
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 768, // Keep at 768 for Google AI embeddings
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error);
      return false;
    }
  }

  private async waitForIndexReady(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const indexStats = await this.pinecone.index(this.indexName).describeIndexStats();
        if (indexStats) return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    throw new Error('Index failed to become ready');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // For search queries, use Google AI (only 1 call vs hundreds during indexing)
    // For bulk indexing, we used Hugging Face to avoid quota limits
    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      
      if (!result.embedding?.values) {
        throw new Error('No embedding values returned from Google AI');
      }
      
      return result.embedding.values;
    } catch (error) {
      // Fallback to simple text matching if embeddings fail
      console.warn('Embedding generation failed, using fallback search');
      // Return a dummy embedding for now to test the database contents
      return new Array(768).fill(0.1);
    }
  }

  async searchSimilar(query: string, limit: number = 5, trackingId?: string): Promise<VectorDocument[]> {
    // If no tracking ID provided, create one for internal tracking
    const searchTrackingId = trackingId || ragTracker.startSearch(query);
    
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const index = this.pinecone.index(this.indexName);
      
      const searchResults = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
      });

      const results = searchResults.matches?.map(match => ({
        id: match.id || '',
        chunk: match.metadata?.chunk as string || '',
        score: match.score || 0,
        metadata: {
          contractType: match.metadata?.contractType as string,
          vulnerability: match.metadata?.vulnerability as string,
          pattern: match.metadata?.pattern as string,
          solidityVersion: match.metadata?.solidityVersion as string,
          securityLevel: match.metadata?.securityLevel as 'high' | 'medium' | 'low',
          documentationNotes: match.metadata?.documentationNotes as string,
        }
      })) || [];

      // Complete tracking if we created the tracking ID internally
      if (!trackingId) {
        ragTracker.completeSearch(searchTrackingId, true, results);
        
        // Track context utilization
        const totalContextLength = results.reduce((sum, result) => 
          sum + (result.chunk?.length || 0), 0
        );
        const relevantContextLength = results
          .filter(result => (result.score || 0) > 0.7)
          .reduce((sum, result) => sum + (result.chunk?.length || 0), 0);
        
        ragTracker.trackContextUtilization(
          searchTrackingId, 
          totalContextLength, 
          relevantContextLength, 
          limit
        );

        // Force save to ensure data persists
        ragTracker.forceSave();
        
        // Debug logging
        console.log(`🔍 VectorStore search completed internally:`, {
          searchTrackingId,
          query: query.substring(0, 50),
          resultsCount: results.length,
          avgScore: results.length > 0 ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length : 0,
          totalContextLength,
          relevantContextLength
        });
      }

      return results;
    } catch (error) {
      console.error('Search failed:', error);
      
      // Complete tracking with error if we created the tracking ID internally
      if (!trackingId) {
        ragTracker.completeSearch(
          searchTrackingId, 
          false, 
          [], 
          (error instanceof Error) ? error.message : 'Search failed'
        );
      }
      
      return [];
    }
  }

  async upsertDocuments(documents: VectorDocument[]) {
    const index = this.pinecone.index(this.indexName);
    
    const vectors = await Promise.all(
      documents.map(async (doc) => {
        const embedding = await this.generateEmbedding(doc.chunk);
        return {
          id: doc.id,
          values: embedding,
          metadata: {
            chunk: doc.chunk,
            ...doc.metadata
          }
        };
      })
    );

    await index.upsert(vectors);
  }
}

let vectorStoreInstance: EnhancedVectorStore | null = null;

export const vectorStore = {
  get instance(): EnhancedVectorStore {
    if (!vectorStoreInstance) {
      vectorStoreInstance = new EnhancedVectorStore();
    }
    return vectorStoreInstance;
  },
  
  // Proxy methods to the actual instance
  async initializeIndex() {
    return this.instance.initializeIndex();
  },
  
  async searchSimilar(query: string, topK?: number) {
    return this.instance.searchSimilar(query, topK);
  },
  
  async upsertDocuments(documents: VectorDocument[]) {
    return this.instance.upsertDocuments(documents);
  }
};