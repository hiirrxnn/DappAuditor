// src/utils/enhanced-rag-engine.ts
import { z } from 'zod';

interface VulnerabilityPattern {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: RegExp;
  description: string;
  recommendation: string;
  examples: string[];
  cwe?: string;
  prevalence?: number;
}

interface SecurityKnowledgeBase {
  vulnerabilities: VulnerabilityPattern[];
  bestPractices: string[];
  gasOptimizations: string[];
}

interface EnhancedAnalysisResult {
  vulnerabilities: { [key: string]: string[] };
  gasOptimizations: string[];
  securityScore: number;
  detailedAnalysis: string;
  confidence: number;
  datasetMatches: number;
  knowledgeBaseSize: number;
  datasetEnhanced: boolean;
}

// Base vulnerability patterns (your original ones)
const BASE_VULNERABILITY_PATTERNS: VulnerabilityPattern[] = [
  {
    id: 'reentrancy',
    name: 'Reentrancy Vulnerability',
    severity: 'critical',
    pattern: /\.call\s*\{[^}]*\}\s*\([^)]*\)|\.call\s*\([^)]*\)(?!\s*\.)/g,
    description: 'External calls that can be exploited for reentrancy attacks',
    recommendation: 'Use checks-effects-interactions pattern and reentrancy guards',
    examples: [
      'victim.call{value: amount}("")',
      'target.call(abi.encodeWithSignature("transfer(address,uint256)", to, value))'
    ],
    cwe: 'CWE-841'
  },
  {
    id: 'unchecked_return',
    name: 'Unchecked Return Values',
    severity: 'high',
    pattern: /\.call\s*\([^)]*\)\s*;|\.send\s*\([^)]*\)\s*;|\.transfer\s*\([^)]*\)\s*;/g,
    description: 'External calls without checking return values',
    recommendation: 'Always check return values of external calls',
    examples: [
      'target.call(data);',
      'payable(to).send(amount);'
    ],
    cwe: 'CWE-252'
  },
  {
    id: 'integer_overflow',
    name: 'Integer Overflow/Underflow',
    severity: 'high',
    pattern: /(?:uint\d*|int\d*)\s+\w+\s*[+\-*\/]=?\s*\w+(?!\s*;)/g,
    description: 'Arithmetic operations without overflow protection',
    recommendation: 'Use SafeMath library or Solidity 0.8+ built-in overflow checks',
    examples: [
      'balance += amount',
      'totalSupply = totalSupply * multiplier'
    ],
    cwe: 'CWE-190'
  },
  {
    id: 'tx_origin',
    name: 'tx.origin Usage',
    severity: 'medium',
    pattern: /tx\.origin/g,
    description: 'Using tx.origin for authorization is vulnerable to phishing attacks',
    recommendation: 'Use msg.sender instead of tx.origin for access control',
    examples: ['require(tx.origin == owner)'],
    cwe: 'CWE-346'
  },
  {
    id: 'unprotected_selfdestruct',
    name: 'Unprotected selfdestruct',
    severity: 'critical',
    pattern: /selfdestruct\s*\([^)]*\)/g,
    description: 'selfdestruct without proper access control',
    recommendation: 'Add proper access control modifiers to selfdestruct functions',
    examples: ['selfdestruct(payable(owner))'],
    cwe: 'CWE-284'
  },
  {
    id: 'delegatecall_to_untrusted',
    name: 'Delegatecall to Untrusted Contract',
    severity: 'critical',
    pattern: /\.delegatecall\s*\([^)]*\)/g,
    description: 'Using delegatecall with untrusted contracts',
    recommendation: 'Avoid delegatecall to user-controlled addresses',
    examples: ['target.delegatecall(data)'],
    cwe: 'CWE-829'
  },
  {
    id: 'timestamp_dependence',
    name: 'Timestamp Dependence',
    severity: 'medium',
    pattern: /block\.timestamp|now(?!\w)/g,
    description: 'Relying on block.timestamp for critical logic',
    recommendation: 'Avoid using block.timestamp for critical decisions',
    examples: ['require(block.timestamp > deadline)'],
    cwe: 'CWE-829'
  },
  {
    id: 'missing_input_validation',
    name: 'Missing Input Validation',
    severity: 'medium',
    pattern: /function\s+\w+\s*\([^)]*address[^)]*\)\s*(?:public|external)[^{]*\{(?![^}]*require\s*\([^}]*!=\s*address\(0\))/g,
    description: 'Functions accepting addresses without zero-address checks',
    recommendation: 'Add input validation for address parameters',
    examples: ['function transfer(address to, uint256 amount)'],
    cwe: 'CWE-20'
  }
];

const GAS_OPTIMIZATION_PATTERNS = [
  {
    pattern: /for\s*\([^)]*\.length[^)]*\)/g,
    issue: 'Array length called in loop condition',
    optimization: 'Cache array length before loop'
  },
  {
    pattern: /storage\s+\w+\s*=\s*\w+\[\w+\]/g,
    issue: 'Repeated storage reads',
    optimization: 'Cache storage variables in memory'
  },
  {
    pattern: /string\s+memory\s+\w+\s*=\s*"[^"]*"/g,
    issue: 'String literals in memory',
    optimization: 'Use bytes32 for short strings'
  }
];

export class EnhancedSmartContractRAG {
  private knowledgeBase: SecurityKnowledgeBase;
  private datasetStatistics: any;
  private datasetPatternsLoaded: boolean = false;

  constructor() {
    this.knowledgeBase = {
      vulnerabilities: [...BASE_VULNERABILITY_PATTERNS],
      bestPractices: [
        'Follow checks-effects-interactions pattern',
        'Use reentrancy guards for external calls',
        'Validate all inputs, especially addresses',
        'Emit events for all state changes',
        'Use latest Solidity version',
        'Implement proper access control',
        'Handle failed external calls gracefully',
        'Avoid using tx.origin for authorization',
        'Use pull over push for payments',
        'Implement circuit breakers for emergency stops'
      ],
      gasOptimizations: [
        'Pack struct variables efficiently',
        'Use uint256 instead of smaller uints when possible',
        'Cache array lengths in loops',
        'Use calldata instead of memory for read-only function parameters',
        'Batch operations when possible',
        'Use events instead of storage for data that doesn\'t need to be accessed on-chain'
      ]
    };

    // Try to load enhanced patterns
    this.loadEnhancedPatterns();
  }

  // Load enhanced patterns from dataset if available
  private async loadEnhancedPatterns() {
    try {
      // Dynamic import to avoid build errors if file doesn't exist yet
      const enhancedModule = await import('@/data/knowledge-base-config');
      if (enhancedModule.ENHANCED_VULNERABILITY_PATTERNS) {
        // Add enhanced patterns to existing base patterns
        this.knowledgeBase.vulnerabilities.push(...enhancedModule.ENHANCED_VULNERABILITY_PATTERNS);
        this.datasetStatistics = enhancedModule.DATASET_STATISTICS;
        this.datasetPatternsLoaded = true;
        console.log('✅ Enhanced patterns loaded from dataset');
      }
    } catch (error) {
      console.log('ℹ️ Enhanced patterns not available yet, using base patterns');
      // This is expected if the dataset hasn't been processed yet
    }
  }

  // Enhanced analysis with confidence scoring
  analyzeContractWithConfidence(contractCode: string): EnhancedAnalysisResult {
    const vulnerabilities: { [key: string]: string[] } = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    const gasIssues: string[] = [];
    let totalIssues = 0;
    let datasetMatches = 0;
    let totalConfidence = 0;

    // Check for vulnerability patterns
    this.knowledgeBase.vulnerabilities.forEach(vuln => {
      const matches = contractCode.match(vuln.pattern);
      if (matches) {
        vulnerabilities[vuln.severity].push(vuln.description);
        totalIssues += matches.length * this.getSeverityWeight(vuln.severity);
        
        // If this is an enhanced pattern from dataset, increase confidence
        if (vuln.id.includes('enhanced_') && vuln.prevalence) {
          datasetMatches++;
          totalConfidence += vuln.prevalence;
        } else {
          totalConfidence += 0.5; // Base confidence for original patterns
        }
      }
    });

    // Check for gas optimization opportunities
    GAS_OPTIMIZATION_PATTERNS.forEach(pattern => {
      const matches = contractCode.match(pattern.pattern);
      if (matches) {
        gasIssues.push(pattern.optimization);
      }
    });

    // Calculate security score and confidence
    const securityScore = Math.max(0, 5 - Math.floor(totalIssues / 2));
    const confidence = datasetMatches > 0 ? 
      Math.min((totalConfidence / (datasetMatches + vulnerabilities.critical.length + vulnerabilities.high.length)) * 5, 5) : 
      Math.min(totalConfidence, 5);

    // Generate detailed analysis
    const detailedAnalysis = this.generateEnhancedDetailedAnalysis(
      vulnerabilities, 
      gasIssues, 
      datasetMatches,
      confidence
    );

    return {
      vulnerabilities,
      gasOptimizations: gasIssues,
      securityScore,
      detailedAnalysis,
      confidence: Math.round(confidence * 10) / 10, // Round to 1 decimal
      datasetMatches,
      knowledgeBaseSize: this.knowledgeBase.vulnerabilities.length,
      datasetEnhanced: this.datasetPatternsLoaded
    };
  }

  // Original analyze method for backward compatibility
  analyzeContract(contractCode: string): {
    vulnerabilities: { [key: string]: string[] };
    gasOptimizations: string[];
    securityScore: number;
    detailedAnalysis: string;
  } {
    const enhanced = this.analyzeContractWithConfidence(contractCode);
    return {
      vulnerabilities: enhanced.vulnerabilities,
      gasOptimizations: enhanced.gasOptimizations,
      securityScore: enhanced.securityScore,
      detailedAnalysis: enhanced.detailedAnalysis
    };
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private generateEnhancedDetailedAnalysis(
    vulnerabilities: { [key: string]: string[] },
    gasIssues: string[],
    datasetMatches: number,
    confidence: number
  ): string {
    let analysis = 'Enhanced Smart Contract Security Analysis:\n\n';

    // Dataset enhancement indicator
    if (this.datasetPatternsLoaded) {
      analysis += `🔬 Analysis enhanced with ${this.knowledgeBase.vulnerabilities.length} patterns from dataset\n`;
      analysis += `📊 Dataset matches: ${datasetMatches} | Confidence: ${confidence.toFixed(1)}/5\n\n`;
    } else {
      analysis += `ℹ️ Using base patterns. Run dataset processor for enhanced analysis.\n\n`;
    }

    // Vulnerability summary
    const totalVulns = Object.values(vulnerabilities).flat().length;
    if (totalVulns === 0) {
      analysis += '✅ No obvious vulnerabilities detected in static analysis.\n\n';
    } else {
      analysis += `⚠️ Found ${totalVulns} potential security issues:\n`;
      Object.entries(vulnerabilities).forEach(([severity, issues]) => {
        if (issues.length > 0) {
          analysis += `- ${severity.toUpperCase()}: ${issues.length} issues\n`;
        }
      });
      analysis += '\n';
    }

    // Gas optimization summary
    if (gasIssues.length > 0) {
      analysis += `⛽ ${gasIssues.length} gas optimization opportunities identified.\n\n`;
    }

    // Enhanced recommendations
    analysis += 'Enhanced Recommendations:\n';
    if (this.datasetPatternsLoaded && datasetMatches > 0) {
      analysis += '🎯 Dataset-validated patterns detected - high confidence findings\n';
    }
    
    this.knowledgeBase.bestPractices.slice(0, 3).forEach((practice, i) => {
      analysis += `${i + 1}. ${practice}\n`;
    });

    return analysis;
  }

  // Get contextual recommendations based on detected patterns
  getContextualRecommendations(contractCode: string): string[] {
    const recommendations: string[] = [];

    this.knowledgeBase.vulnerabilities.forEach(vuln => {
      if (contractCode.match(vuln.pattern)) {
        recommendations.push(vuln.recommendation);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Enhanced prompt generation with RAG context and dataset information
  generateEnhancedPromptWithDataset(contractCode: string): string {
    const analysis = this.analyzeContractWithConfidence(contractCode);
    const contextualRecommendations = this.getContextualRecommendations(contractCode);

    let datasetInfo = '';
    if (this.datasetPatternsLoaded) {
      datasetInfo = `
DATASET ENHANCEMENT:
- Knowledge base contains ${this.knowledgeBase.vulnerabilities.length} vulnerability patterns
- ${analysis.datasetMatches} dataset patterns matched in this contract
- Analysis confidence: ${analysis.confidence}/5
- Dataset statistics: ${this.datasetStatistics?.totalContracts || 'N/A'} contracts analyzed
`;
    }

    return `You are an expert smart contract security auditor with access to a comprehensive vulnerability database enhanced with real-world contract analysis.

${datasetInfo}

PRE-ANALYSIS FINDINGS:
${Object.entries(analysis.vulnerabilities).map(([severity, issues]) => 
  issues.length > 0 ? `${severity.toUpperCase()}: ${issues.join(', ')}` : ''
).filter(Boolean).join('\n')}

CONTEXTUAL SECURITY KNOWLEDGE:
${contextualRecommendations.slice(0, 5).map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

CONTRACT CODE TO ANALYZE:
${contractCode}

Please provide a comprehensive security audit that:
1. Validates and refines the pre-detected vulnerability patterns
2. Identifies any additional security issues missed by pattern matching
3. Provides specific remediation steps with code examples where possible
4. Considers the confidence level from our dataset analysis
5. Rates the overall security from 0-5 stars with these strict criteria:
   - 5 stars: Zero vulnerabilities, follows all best practices
   - 4 stars: No critical/high issues, minor medium issues only  
   - 3 stars: No critical issues but has high severity issues
   - 2 stars: Has critical vulnerabilities or multiple high severity issues
   - 1 star: Multiple critical and high severity vulnerabilities
   - 0 stars: Fundamental security flaws, unsafe for deployment

IMPORTANT: Consider that patterns with higher dataset confidence (from our ${this.knowledgeBase.vulnerabilities.length}-pattern knowledge base) should be weighted more heavily in your analysis.

Return your analysis in this JSON format:
{
  "stars": number,
  "summary": "concise summary mentioning dataset confidence if applicable", 
  "vulnerabilities": {
    "critical": ["array of critical issues with specific details"],
    "high": ["array of high severity issues with remediation"],
    "medium": ["array of medium severity issues"],
    "low": ["array of low severity issues"]
  },
  "recommendations": ["array of specific remediation steps with code examples"],
  "gasOptimizations": ["array of gas optimization suggestions"]
}`;
  }

  // Get dataset statistics
  getDatasetInfo(): {
    isEnhanced: boolean;
    patternCount: number;
    datasetStats?: any;
  } {
    return {
      isEnhanced: this.datasetPatternsLoaded,
      patternCount: this.knowledgeBase.vulnerabilities.length,
      datasetStats: this.datasetStatistics
    };
  }

  // Reload enhanced patterns (useful after dataset processing)
  async reloadEnhancedPatterns(): Promise<boolean> {
    try {
      // Clear existing enhanced patterns
      this.knowledgeBase.vulnerabilities = this.knowledgeBase.vulnerabilities.filter(
        p => !p.id.includes('enhanced_')
      );
      
      // Reload enhanced patterns
      await this.loadEnhancedPatterns();
      return this.datasetPatternsLoaded;
    } catch (error) {
      console.error('Failed to reload enhanced patterns:', error);
      return false;
    }
  }
}

// Export singleton instance
export const enhancedContractRAG = new EnhancedSmartContractRAG();

// Also export the class for custom instances
// export { EnhancedSmartContractRAG };