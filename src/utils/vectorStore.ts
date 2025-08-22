import { generateEmbedding } from './embeddings';
import { v4 as uuidv4 } from 'uuid';

export interface ContractMetadata {
  vulnerabilities: string[];
  testPatterns: string[];
  documentationNotes: string[];
  contractType: string;
}

interface VectorRecord {
  id: string;
  values: number[];
  metadata: ContractMetadata & {
    chunk: string;
    chunkIndex: number;
    code: string;
  };
}

export class VectorStore {
  private storageKey = 'auditfi-rag-vectors';
  private vectors: VectorRecord[] = [];

  constructor() {
    this.loadVectors();
  }

  private loadVectors(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.vectors = JSON.parse(stored);
        console.log(`Loaded ${this.vectors.length} vectors from storage`);
      }
    } catch (error) {
      console.error('Error loading vectors from storage:', error);
      this.vectors = [];
    }
  }

  private saveVectors(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.vectors));
      console.log(`Saved ${this.vectors.length} vectors to storage`);
    } catch (error) {
      console.error('Error saving vectors to storage:', error);
    }
  }

  async upsertContract(
    code: string, 
    metadata: ContractMetadata,
    chunks: string[]
  ): Promise<void> {
    try {
      console.log(`Upserting contract with ${chunks.length} chunks...`);
      
      const newVectors = await Promise.all(
        chunks.map(async (chunk, i) => {
          const embedding = await generateEmbedding(chunk);
          return {
            id: uuidv4(),
            values: embedding,
            metadata: {
              ...metadata,
              chunk: chunk,
              chunkIndex: i,
              code: code
            }
          };
        })
      );

      // Add new vectors to existing ones
      this.vectors.push(...newVectors);
      
      // Save to localStorage
      this.saveVectors();
      
      console.log(`Successfully upserted ${newVectors.length} vectors`);
    } catch (error) {
      console.error('Error upserting contract:', error);
      throw error;
    }
  }

  async searchSimilar(queryCode: string, topK: number = 5) {
    try {
      if (this.vectors.length === 0) {
        console.log('No vectors in database, returning empty results');
        return [];
      }

      console.log(`Searching among ${this.vectors.length} vectors...`);
      
      const queryEmbedding = await generateEmbedding(queryCode);
      
      // Calculate cosine similarity for all vectors
      const similarities = this.vectors.map(vector => {
        const similarity = this.cosineSimilarity(queryEmbedding, vector.values);
        return {
          score: similarity,
          metadata: vector.metadata,
          chunk: vector.metadata.chunk
        };
      });

      // Sort by similarity score (highest first) and return top K
      const results = similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      console.log(`Found ${results.length} similar vectors with scores:`, 
        results.map(r => r.score.toFixed(3)).join(', '));
      
      return results;
    } catch (error) {
      console.error('Error searching similar vectors:', error);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.warn(`Vector length mismatch: ${a.length} vs ${b.length}`);
      return 0;
    }

    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Utility methods
  getVectorCount(): number {
    return this.vectors.length;
  }

  clearStorage(): void {
    this.vectors = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
    console.log('Cleared all vectors from storage');
  }

  exportVectors(): string {
    return JSON.stringify(this.vectors, null, 2);
  }

  importVectors(jsonData: string): void {
    try {
      const imported = JSON.parse(jsonData);
      this.vectors = imported;
      this.saveVectors();
      console.log(`Imported ${this.vectors.length} vectors`);
    } catch (error) {
      console.error('Error importing vectors:', error);
      throw new Error('Invalid vector data format');
    }
  }

  // Get statistics about stored vectors
  getStats() {
    const vulnTypes = new Set();
    const contractTypes = new Set();
    
    this.vectors.forEach(v => {
      v.metadata.vulnerabilities.forEach(vuln => vulnTypes.add(vuln));
      contractTypes.add(v.metadata.contractType);
    });

    return {
      totalVectors: this.vectors.length,
      uniqueVulnerabilityTypes: vulnTypes.size,
      vulnerabilityTypes: Array.from(vulnTypes),
      contractTypes: Array.from(contractTypes)
    };
  }
}

export const vectorStore = new VectorStore();