import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    this.indexName = process.env.PINECONE_INDEX_NAME || 'auditfi-contracts';
  }

  async initializeIndex() {
    try {
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(index => index.name === this.indexName);

      if (!indexExists) {
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 768,
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
    const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    
    if (!result.embedding?.values) {
      throw new Error('No embedding values returned');
    }
    
    return result.embedding.values;
  }

  async searchSimilar(query: string, limit: number = 5): Promise<VectorDocument[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const index = this.pinecone.index(this.indexName);
      
      const searchResults = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
      });

      return searchResults.matches?.map(match => ({
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
    } catch (error) {
      console.error('Search failed:', error);
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

export const vectorStore = new EnhancedVectorStore();