// scripts/process-dataset.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VulnerabilityExample {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
  description: string;
  fix?: string;
  source: string;
}

interface ProcessedKnowledgeBase {
  patterns: VulnerabilityPattern[];
  examples: VulnerabilityExample[];
  statistics: {
    totalContracts: number;
    vulnerabilityDistribution: Record<string, number>;
    processedDate: string;
  };
}

interface VulnerabilityPattern {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: string;
  description: string;
  recommendation: string;
  examples: string[];
  cwe?: string;
  prevalence: number;
}

class SmartContractDatasetProcessor {
  private datasetPath: string;
  private outputPath: string;

  constructor(datasetPath: string, outputPath: string) {
    this.datasetPath = datasetPath;
    this.outputPath = outputPath;
  }

  async processDataset(): Promise<ProcessedKnowledgeBase> {
    console.log('🚀 Starting Smart Contract Dataset processing...');
    
    const knowledgeBase: ProcessedKnowledgeBase = {
      patterns: [],
      examples: [],
      statistics: {
        totalContracts: 0,
        vulnerabilityDistribution: {},
        processedDate: new Date().toISOString()
      }
    };

    try {
      await this.processReentrancyDataset(knowledgeBase);
      await this.processTimestampDependenceDataset(knowledgeBase);
      await this.processAccessControlDataset(knowledgeBase);
      await this.processIntegerOverflowDataset(knowledgeBase);
      await this.processUncheckedCallDataset(knowledgeBase);
      
      this.generateEnhancedPatterns(knowledgeBase);
      await this.saveKnowledgeBase(knowledgeBase);
      
      console.log('✅ Dataset processing completed successfully!');
      console.log(`📊 Processed ${knowledgeBase.statistics.totalContracts} contracts`);
      console.log(`🔍 Generated ${knowledgeBase.patterns.length} vulnerability patterns`);
      
      return knowledgeBase;
      
    } catch (error) {
      console.error('❌ Error processing dataset:', error);
      throw error;
    }
  }

  private async processReentrancyDataset(kb: ProcessedKnowledgeBase) {
    console.log('📁 Processing reentrancy dataset...');
    
    // Check if the actual dataset directory exists
    const reentrancyPath = path.join(this.datasetPath, 'reentrancy');
    
    if (fs.existsSync(reentrancyPath)) {
      console.log('✅ Found reentrancy dataset directory');
      // Try to process real files
      const buggyPath = path.join(reentrancyPath, 'buggy_contracts');
      if (fs.existsSync(buggyPath)) {
        const files = fs.readdirSync(buggyPath).filter(f => f.endsWith('.sol'));
        console.log(`📄 Found ${files.length} reentrancy contract files`);
        
        files.slice(0, 5).forEach((file, index) => {
          try {
            const filePath = path.join(buggyPath, file);
            const code = fs.readFileSync(filePath, 'utf8');
            
            kb.examples.push({
              id: `reentrancy_real_${index}`,
              type: 'reentrancy',
              severity: 'critical',
              code: this.extractRelevantCode(code),
              description: `Real reentrancy vulnerability from ${file}`,
              source: file
            });
          } catch (error) {
            console.warn(`⚠️ Could not process ${file}:`, error);
          }
        });
      }
    }
    
    // Add synthetic examples
    const reentrancyExamples = [
      {
        code: `function withdraw() public {
    uint256 amount = balances[msg.sender];
    require(amount > 0, "No funds");
    
    // Vulnerable: external call before state change
    (bool success,) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    
    balances[msg.sender] = 0; // State change after external call
}`,
        description: 'Classic reentrancy vulnerability in withdrawal function'
      },
      {
        code: `function emergencyWithdraw() external {
    uint256 balance = getUserBalance(msg.sender);
    // Vulnerable: external call in modifier/helper
    IToken(token).transfer(msg.sender, balance);
    userBalances[msg.sender] = 0;
}`,
        description: 'Reentrancy through external token transfer'
      }
    ];

    reentrancyExamples.forEach((example, index) => {
      kb.examples.push({
        id: `reentrancy_synthetic_${index}`,
        type: 'reentrancy',
        severity: 'critical',
        code: example.code,
        description: example.description,
        source: 'synthetic'
      });
    });

    this.updateVulnerabilityStats(kb, 'reentrancy', reentrancyExamples.length + kb.examples.filter(e => e.type === 'reentrancy' && e.source !== 'synthetic').length);
  }

  private async processTimestampDependenceDataset(kb: ProcessedKnowledgeBase) {
    console.log('📁 Processing timestamp dependence dataset...');
    
    const timestampExamples = [
      {
        code: `function withdraw() public {
    require(block.timestamp > deadline, "Too early");
    // Vulnerable: miners can manipulate timestamp
    payable(msg.sender).transfer(balance);
}`,
        description: 'Timestamp dependence in withdrawal logic'
      },
      {
        code: `uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % 100;`,
        description: 'Using timestamp for randomness generation'
      }
    ];

    timestampExamples.forEach((example, index) => {
      kb.examples.push({
        id: `timestamp_${index}`,
        type: 'timestamp_dependence',
        severity: 'medium',
        code: example.code,
        description: example.description,
        source: 'synthetic'
      });
    });

    this.updateVulnerabilityStats(kb, 'timestamp_dependence', timestampExamples.length);
  }

  private async processAccessControlDataset(kb: ProcessedKnowledgeBase) {
    console.log('📁 Processing access control dataset...');
    
    const accessControlExamples = [
      {
        code: `function withdraw() public {
    // Missing access control!
    payable(msg.sender).transfer(address(this).balance);
}`,
        description: 'Missing access control on critical function',
        severity: 'critical' as const
      },
      {
        code: `modifier onlyOwner() {
    require(tx.origin == owner, "Not owner");
    _; // Should use msg.sender instead of tx.origin
}`,
        description: 'Using tx.origin instead of msg.sender',
        severity: 'high' as const
      }
    ];

    accessControlExamples.forEach((example, index) => {
      kb.examples.push({
        id: `access_control_${index}`,
        type: 'access_control',
        severity: example.severity,
        code: example.code,
        description: example.description,
        source: 'synthetic'
      });
    });

    this.updateVulnerabilityStats(kb, 'access_control', accessControlExamples.length);
  }

  private async processIntegerOverflowDataset(kb: ProcessedKnowledgeBase) {
    console.log('📁 Processing integer overflow dataset...');
    
    const overflowExamples = [
      {
        code: `function transfer(address to, uint256 amount) public {
    balances[msg.sender] -= amount; // Potential underflow
    balances[to] += amount; // Potential overflow
}`,
        description: 'Integer overflow/underflow in balance operations'
      },
      {
        code: `uint256 total = price * quantity; // Potential overflow
require(msg.value >= total, "Insufficient payment");`,
        description: 'Multiplication overflow in payment calculation'
      }
    ];

    overflowExamples.forEach((example, index) => {
      kb.examples.push({
        id: `overflow_${index}`,
        type: 'integer_overflow',
        severity: 'high',
        code: example.code,
        description: example.description,
        source: 'synthetic'
      });
    });

    this.updateVulnerabilityStats(kb, 'integer_overflow', overflowExamples.length);
  }

  private async processUncheckedCallDataset(kb: ProcessedKnowledgeBase) {
    console.log('📁 Processing unchecked call dataset...');
    
    const uncheckedCallExamples = [
      {
        code: `function sendPayment(address to, uint256 amount) public {
    to.call{value: amount}(""); // Return value not checked
}`,
        description: 'Unchecked external call return value'
      },
      {
        code: `payable(winner).send(prize); // send() can fail silently`,
        description: 'Using send() without checking return value'
      }
    ];

    uncheckedCallExamples.forEach((example, index) => {
      kb.examples.push({
        id: `unchecked_call_${index}`,
        type: 'unchecked_call',
        severity: 'high',
        code: example.code,
        description: example.description,
        source: 'synthetic'
      });
    });

    this.updateVulnerabilityStats(kb, 'unchecked_call', uncheckedCallExamples.length);
  }

  private generateEnhancedPatterns(kb: ProcessedKnowledgeBase) {
    console.log('🔨 Generating enhanced vulnerability patterns...');

    const patternMap: Record<string, Partial<VulnerabilityPattern>> = {
      reentrancy: {
        id: 'enhanced_reentrancy',
        name: 'Reentrancy Vulnerability (Dataset Enhanced)',
        severity: 'critical',
        pattern: '(\\.call\\s*\\{[^}]*\\}\\s*\\([^)]*\\)|msg\\.sender\\.call|address\\([^)]*\\)\\.call)(?!.*require\\s*\\(.*success)',
        description: 'External calls vulnerable to reentrancy attacks',
        recommendation: 'Use ReentrancyGuard, checks-effects-interactions pattern, or pull payment',
        cwe: 'CWE-841'
      },
      timestamp_dependence: {
        id: 'enhanced_timestamp',
        name: 'Timestamp Dependence (Dataset Enhanced)', 
        severity: 'medium',
        pattern: '(block\\.timestamp|now(?!\\w)).*(?:require|if|>|<|>=|<=)',
        description: 'Logic dependent on block timestamp manipulation',
        recommendation: 'Use block numbers or external oracles for time-dependent logic',
        cwe: 'CWE-829'
      },
      access_control: {
        id: 'enhanced_access_control',
        name: 'Access Control Issues (Dataset Enhanced)',
        severity: 'high',
        pattern: 'function\\s+\\w+\\s*\\([^)]*\\)\\s*(?:public|external)(?![^{]*\\b(?:onlyOwner|require\\s*\\(.*msg\\.sender))',
        description: 'Functions lacking proper access control',
        recommendation: 'Implement proper access control modifiers and checks',
        cwe: 'CWE-284'
      },
      integer_overflow: {
        id: 'enhanced_overflow',
        name: 'Integer Overflow/Underflow (Dataset Enhanced)',
        severity: 'high', 
        pattern: '(?:uint\\d*|int\\d*)\\s+\\w+\\s*[+\\-*\\/]=?\\s*\\w+(?!.*(?:SafeMath|unchecked))',
        description: 'Arithmetic operations without overflow protection',
        recommendation: 'Use SafeMath library or Solidity 0.8+ built-in checks',
        cwe: 'CWE-190'
      },
      unchecked_call: {
        id: 'enhanced_unchecked_call',
        name: 'Unchecked External Calls (Dataset Enhanced)',
        severity: 'high',
        pattern: '(?:\\.call\\s*\\([^)]*\\)|payable\\([^)]*\\)\\.(?:send|transfer))\\s*;(?!.*(?:require\\s*\\(|success))',
        description: 'External calls without return value verification',
        recommendation: 'Always check return values of external calls',
        cwe: 'CWE-252'
      }
    };

    const vulnTypes = new Set(kb.examples.map(e => e.type));
    
    vulnTypes.forEach(type => {
      const examples = kb.examples.filter(e => e.type === type);
      const prevalence = examples.length / Math.max(kb.statistics.totalContracts, 1);
      
      const basePattern = patternMap[type];
      if (basePattern) {
        kb.patterns.push({
          ...basePattern,
          examples: examples.slice(0, 3).map(e => e.code),
          prevalence
        } as VulnerabilityPattern);
      }
    });
  }

  private extractRelevantCode(code: string): string {
    const lines = code.split('\n');
    const relevantLines = lines.filter(line => 
      line.includes('call(') || 
      line.includes('send(') || 
      line.includes('transfer(') ||
      line.includes('require(') ||
      line.includes('msg.sender') ||
      line.includes('balances[')
    );
    
    const relevant = relevantLines.slice(0, 10).join('\n');
    return relevant.length > 300 ? relevant.substring(0, 300) + '...' : relevant;
  }

  private updateVulnerabilityStats(kb: ProcessedKnowledgeBase, type: string, count: number) {
    kb.statistics.vulnerabilityDistribution[type] = 
      (kb.statistics.vulnerabilityDistribution[type] || 0) + count;
    kb.statistics.totalContracts += count;
  }

  private async saveKnowledgeBase(kb: ProcessedKnowledgeBase) {
    const outputFile = path.join(this.outputPath, 'enhanced-knowledge-base.json');
    
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(kb, null, 2));
    
    const tsConfigFile = path.join(this.outputPath, 'knowledge-base-config.ts');
    const tsConfig = this.generateTypeScriptConfig(kb);
    fs.writeFileSync(tsConfigFile, tsConfig);
    
    console.log(`💾 Knowledge base saved to ${outputFile}`);
    console.log(`⚙️ TypeScript config saved to ${tsConfigFile}`);
  }

  private generateTypeScriptConfig(kb: ProcessedKnowledgeBase): string {
    return `// Auto-generated knowledge base configuration
// Generated on: ${kb.statistics.processedDate}
// Total contracts processed: ${kb.statistics.totalContracts}

export interface EnhancedVulnerabilityPattern {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: RegExp;
  description: string;
  recommendation: string;
  examples: string[];
  cwe?: string;
  prevalence: number;
}

export const ENHANCED_VULNERABILITY_PATTERNS: EnhancedVulnerabilityPattern[] = [
${kb.patterns.map(p => `  {
    id: '${p.id}',
    name: '${p.name}',
    severity: '${p.severity}',
    pattern: /${p.pattern}/g,
    description: '${p.description}',
    recommendation: '${p.recommendation}',
    examples: ${JSON.stringify(p.examples, null, 6)},
    cwe: '${p.cwe || ''}',
    prevalence: ${p.prevalence}
  }`).join(',\n')}
];

export const DATASET_STATISTICS = ${JSON.stringify(kb.statistics, null, 2)};
`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const datasetPath = args[0] || './Smart-Contract-Dataset';
  const outputPath = args[1] || './src/data';
  
  console.log('🚀 Smart Contract Dataset Processor');
  console.log(`📂 Dataset path: ${datasetPath}`);
  console.log(`📁 Output path: ${outputPath}`);
  
  const processor = new SmartContractDatasetProcessor(datasetPath, outputPath);
  
  try {
    await processor.processDataset();
    console.log('✅ Processing completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Create src/utils/enhanced-rag-engine.ts');
    console.log('   2. Update your audit page imports');
    console.log('   3. Test the enhanced analysis');
  } catch (error) {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}