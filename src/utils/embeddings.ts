import { Mistral } from "@mistralai/mistralai";

const mistralClient = new Mistral({
  apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY!
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await mistralClient.embeddings.create({
      model: 'mistral-embed',
      inputs: [text],
      encodingFormat: 'float'  // Fixed: camelCase instead of snake_case
    });
    
    // Handle Mistral's response format
    if (response.data && response.data.length > 0) {
      const embedding = response.data[0].embedding;
      if (Array.isArray(embedding)) {
        return embedding;
      }
    }
    
    throw new Error('Invalid embedding response from Mistral');
  } catch (error) {
    console.error('Mistral embedding error:', error);
    
    // Fallback: Create a simple hash-based embedding
    return createSimpleEmbedding(text);
  }
}

// Fallback embedding function using text analysis
function createSimpleEmbedding(text: string): number[] {
  const embedding = new Array(1024).fill(0); // Mistral embedding size
  
  // Extract features from Solidity code
  const solidityKeywords = [
    'function', 'modifier', 'require', 'assert', 'revert',
    'transfer', 'call', 'send', 'delegatecall', 'staticcall',
    'onlyOwner', 'public', 'private', 'internal', 'external',
    'payable', 'view', 'pure', 'constant', 'returns',
    'mapping', 'address', 'uint256', 'uint', 'bytes', 'string', 'bool',
    'msg.sender', 'msg.value', 'block.timestamp', 'block.number',
    'reentrancy', 'overflow', 'underflow', 'access', 'control'
  ];
  
  // Create features based on keyword frequency
  solidityKeywords.forEach((keyword, index) => {
    if (index < embedding.length) {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex) || [];
      embedding[index] = matches.length / (text.length / 100); // Normalize
    }
  });
  
  // Add character-based features for remaining dimensions
  for (let i = solidityKeywords.length; i < embedding.length; i++) {
    const charIndex = i % text.length;
    const charCode = text.charCodeAt(charIndex) || 0;
    embedding[i] = (charCode % 256) / 256; // Normalize to 0-1
  }
  
  return embedding;
}

export function chunkSolidityCode(code: string): string[] {
  const functionRegex = /function\s+\w+[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g;
  const functions = code.match(functionRegex) || [];
  
  const contractMatch = code.match(/contract\s+(\w+)/);
  const contractName = contractMatch ? contractMatch[1] : 'Unknown';
  
  const chunks = [
    `Contract: ${contractName}\n${code.substring(0, 500)}`,
    ...functions.map(fn => `Contract: ${contractName}\n${fn}`)
  ];
  
  return chunks.filter(chunk => chunk.length > 50);
}