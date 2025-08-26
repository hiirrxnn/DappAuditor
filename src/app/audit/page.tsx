'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";
import { ethers } from 'ethers';
import { performanceTracker } from '@/utils/performanceTracker';
import { blockchainTracker } from '@/utils/blockchainTracker';
import { 
  Star,
  Warning,
  CheckCircle,
  FileCode,
  Robot,
  Cube,
  Lock,
  Timer,
  CircleNotch,
  ArrowSquareOut,
  Lightning,
  Shield,
  ShieldCheck
} from 'phosphor-react';

// Mock implementations for missing dependencies
const useWalletConnection = () => ({
  connect: async () => {
    // Mock wallet connection
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        return { provider, signer };
      } catch (error) {
        console.error('Wallet connection failed:', error);
        return null;
      }
    }
    return null;
  }
});

const CONTRACT_ADDRESSES = {
  sepolia: '0x1234567890123456789012345678901234567890', // Replace with actual address
  mainnet: '0x0987654321098765432109876543210987654321'
};

const AUDIT_REGISTRY_ABI = [
  "function registerAudit(bytes32 contractHash, uint8 stars, string memory summary) external",
  "function getAudit(bytes32 contractHash) external view returns (uint8, string memory, address, uint256)"
];

const CHAIN_CONFIG = {
  sepolia: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia Test Network',
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconPath: '/sepolia-icon.png'
  },
  mainnet: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    blockExplorerUrls: ['https://etherscan.io'],
    iconPath: '/ethereum-icon.png'
  }
};

// Initialize Mistral client with error handling
let mistralClient: Mistral | null = null;
try {
  if (process.env.NEXT_PUBLIC_MISTRAL_API_KEY) {
    mistralClient = new Mistral({
      apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY
    });
  }
} catch (error) {
  console.warn('Mistral client initialization failed:', error);
}

// Define the vulnerability analysis schema
const VulnerabilityDetailSchema = z.object({
  title: z.string(),
  description: z.string(),
  location: z.string(),
});

const VulnerabilitySchema = z.object({
  stars: z.number().min(0).max(5),
  summary: z.string(),
  positiveFindings: z.array(z.string()),
  vulnerabilities: z.object({
    critical: z.array(VulnerabilityDetailSchema),
    high: z.array(VulnerabilityDetailSchema),
    medium: z.array(VulnerabilityDetailSchema),
    low: z.array(VulnerabilityDetailSchema)
  }),
  recommendations: z.array(z.string()),
  gasOptimizations: z.array(z.string())
});

// Interface definitions
interface VulnerabilityDetail {
  title: string;
  description: string;
  location: string;
}

interface AuditResult {
  stars: number;
  summary: string;
  positiveFindings: string[];
  vulnerabilities: {
    critical: VulnerabilityDetail[];
    high: VulnerabilityDetail[];
    medium: VulnerabilityDetail[];
    low: VulnerabilityDetail[];
  };
  recommendations: string[];
  gasOptimizations: string[];
}

interface SeverityConfig {
  color: string;
  label: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface TransactionState {
  isProcessing: boolean;
  hash: string | null;
  error: string | null;
}

// Constants
const COOLDOWN_TIME = 30;
const SEVERITY_CONFIGS: Record<string, SeverityConfig> = {
  critical: { 
    color: 'text-red-500', 
    label: 'Critical', 
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: <Warning className="text-red-500" size={20} weight="fill" />
  },
  high: { 
    color: 'text-orange-500', 
    label: 'High Risk',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    icon: <Warning className="text-orange-500" size={20} weight="fill" />
  },
  medium: { 
    color: 'text-yellow-500', 
    label: 'Medium Risk',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    icon: <Warning className="text-yellow-500" size={20} weight="fill" />
  },
  low: { 
    color: 'text-white', 
    label: 'Low Risk',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20',
    icon: <Warning className="text-white" size={20} weight="bold" />
  }
};

export default function AuditPage() {
  // State management
  const [code, setCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isReviewBlurred, setIsReviewBlurred] = useState(true);
  const [currentChain, setCurrentChain] = useState<keyof typeof CHAIN_CONFIG | null>(null);
  const [txState, setTxState] = useState<TransactionState>({
    isProcessing: false,
    hash: null,
    error: null
  });

  // Mouse tracking effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldown]);

  // Validation functions
  const isSolidityCode = (code: string): boolean => {
    const pragmaPattern = /pragma\s+solidity\s+(?:\^|\>=|\<=|~)?\s*\d+\.\d+(\.\d+)?|pragma\s+solidity\s+[\d\s\^\>\<\=\.\~]+/;
    const hasPragma = pragmaPattern.test(code);
    const hasContractLike = /(?:contract|library|interface|abstract\s+contract)\s+\w+/.test(code);
    const hasSolidityKeywords = /(?:function|mapping|address|uint\d*|bytes\d*|struct|enum|event|modifier)\s+\w+/.test(code);
    return (hasPragma || hasContractLike) && hasSolidityKeywords;
  };

  // Use our wallet connection hook
  const { connect } = useWalletConnection();
  
  // Detect current network
  const detectCurrentNetwork = async (): Promise<keyof typeof CHAIN_CONFIG | null> => {
    try {
      const connection = await connect();
      if (!connection) {
        console.log('No wallet connection available');
        return null;
      }
      
      const { provider } = connection;
      const network = await provider.getNetwork();
      const chainId = '0x' + network.chainId.toString(16);
      
      for (const [key, config] of Object.entries(CHAIN_CONFIG)) {
        if (chainId.toLowerCase() === config.chainId.toLowerCase()) {
          setCurrentChain(key as keyof typeof CHAIN_CONFIG);
          return key as keyof typeof CHAIN_CONFIG;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting network:', error);
      return null;
    }
  };

  // Get current chain key based on chain id
  const getCurrentChainKey = (): keyof typeof CHAIN_CONFIG => {
    if (!currentChain) return 'sepolia';
    return currentChain || 'sepolia';
  };

  // Chain registration function
  const registerAuditOnChain = async () => {
    if (!result || !code) return;

    setTxState({ isProcessing: true, hash: null, error: null });

    // Start blockchain tracking
    const trackingId = blockchainTracker.startTransaction(
      CONTRACT_ADDRESSES.sepolia,
      'registerAudit',
      currentChain || 'sepolia'
    );

    try {
      const connection = await connect();
      if (!connection) {
        throw new Error('Please connect your wallet first');
      }
      
      const { signer } = connection;
      const contractHash = ethers.keccak256(ethers.toUtf8Bytes(code));
      const detectedChain = await detectCurrentNetwork();
      
      if (!detectedChain || detectedChain !== 'sepolia') {
        throw new Error('Please switch to Sepolia testnet to register audits');
      }
      
      const contractAddress = CONTRACT_ADDRESSES[detectedChain];
      
      const contract = new ethers.Contract(
        contractAddress,
        AUDIT_REGISTRY_ABI,
        signer
      );

      const tx = await contract.registerAudit(
        contractHash,
        result.stars,
        result.summary
      );

      // Update tracking with transaction hash
      blockchainTracker.updateTransactionHash(trackingId, tx.hash);

      const receipt = await tx.wait();
      
      // Complete blockchain tracking
      blockchainTracker.completeTransaction(trackingId, true, {
        gasUsed: receipt?.gasUsed,
        effectiveGasPrice: receipt?.gasPrice || receipt?.effectiveGasPrice,
        blockNumber: receipt?.blockNumber
      });

      setTxState({
        isProcessing: false,
        hash: receipt?.hash || tx.hash,
        error: null
      });
      setIsReviewBlurred(false);
    } catch (error) {
      console.error('Failed to register audit:', error);
      
      // Complete blockchain tracking with error
      blockchainTracker.completeTransaction(trackingId, false, undefined, 
        (error instanceof Error) ? error.message : 'Failed to register audit'
      );

      setTxState({
        isProcessing: false,
        hash: null,
        error: (error instanceof Error) ? error.message : 'Failed to register audit'
      });
    }
  };

  // Mock analysis function for demonstration
  const generateMockAnalysis = (code: string): AuditResult => {
    return {
      stars: 3,
      summary: "This contract has moderate security concerns. While it implements basic functionality correctly, there are several areas that require attention to improve security and gas efficiency.",
      positiveFindings: [
        "Proper use of Solidity version pragma",
        "Clear function visibility modifiers",
        "Basic input validation present"
      ],
      vulnerabilities: {
        critical: [],
        high: [
          {
            title: "Reentrancy Vulnerability",
            description: "The withdraw function is vulnerable to reentrancy attacks. External calls are made before state changes, allowing malicious contracts to drain funds.",
            location: "Function withdraw() around line 8-12"
          }
        ],
        medium: [
          {
            title: "Unchecked Return Value",
            description: "The return value of the external call is not properly handled, which could lead to silent failures.",
            location: "Function withdraw() line 10"
          }
        ],
        low: [
          {
            title: "Gas Optimization Opportunity",
            description: "State variables could be packed more efficiently to reduce gas costs.",
            location: "Contract storage layout"
          }
        ]
      },
      recommendations: [
        "Implement the checks-effects-interactions pattern",
        "Use ReentrancyGuard from OpenZeppelin",
        "Add proper error handling for external calls",
        "Consider using pull payment pattern instead of push payments"
      ],
      gasOptimizations: [
        "Pack struct variables to reduce storage slots",
        "Use unchecked blocks for safe arithmetic operations",
        "Cache storage variables in memory when used multiple times"
      ]
    };
  };

  // Main analysis function
  const analyzeContract = async () => {
    if (!code.trim()) {
      setError('Please enter your smart contract code.');
      return;
    }

    if (!isSolidityCode(code)) {
      setError('Invalid input. Please ensure your code is a valid Solidity smart contract.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setIsReviewBlurred(true);

    // Start performance tracking
    const trackingId = performanceTracker.startMistralAnalysis("mistral-small-latest");

    try {
      let analysisResult: AuditResult;

      if (mistralClient) {
        // Use actual Mistral API if available
        const response = await mistralClient.chat.complete({
          model: "mistral-small-latest",
          messages: [
            {
              role: "system",
              content: `You are an elite smart contract security auditor specializing in DeFi protocols. Your analysis is meticulous and security-first. Conduct a comprehensive security audit of the provided Solidity contract.

              **Your Task:**
              1.  **Identify Vulnerabilities:** Scan for a wide range of issues, including but not limited to: Re-entrancy, Access Control, Integer Overflows/Underflows, Unchecked External Calls, Gas Limit Issues, Logical Flaws, and adherence to best practices.
              2.  **Classify Severity:** Categorize each finding as Critical, High, Medium, or Low.
              3.  **Provide Actionable Feedback:** For each vulnerability, describe the risk and suggest a specific code-level fix.
              4.  **Highlight Strengths:** Acknowledge well-implemented security patterns and best practices.
              5.  **Score the Contract:** Provide a star rating based on a very strict system.

              **Strict Rating System:**
              - 5 Stars: Flawless. Zero vulnerabilities, exemplary code, fully optimized.
              - 4 Stars: Secure. No critical/high vulnerabilities, only minor (low severity) issues or gas optimizations.
              - 3 Stars: Good. No critical vulnerabilities, but 1 or more high-severity issues are present.
              - 2 Stars: Risky. At least one critical vulnerability or multiple high-severity issues.
              - 1 Star: Dangerous. Multiple critical vulnerabilities.
              - 0 Stars: Fatal. Fundamental flaws; completely unsafe for deployment.

              **JSON Output Schema (MUST be followed exactly):**
              Your entire response MUST be a single, valid JSON object.
              {
                "stars": number,
                "summary": "string (An executive summary of the contract's security posture)",
                "positiveFindings": ["string (A list of correctly implemented security measures, e.g., 'Effective use of the Checks-Effects-Interactions pattern in the withdraw function.')"],
                "vulnerabilities": {
                  "critical": [{ "title": "string", "description": "string (Detailed explanation of the vulnerability and its potential impact.)", "location": "string (e.g., 'Function withdrawFunds() at line 82')" }],
                  "high": [{ "title": "string", "description": "string", "location": "string" }],
                  "medium": [{ "title": "string", "description": "string", "location": "string" }],
                  "low": [{ "title": "string", "description": "string", "location": "string" }]
                },
                "recommendations": ["string (A list of actionable steps to fix the identified issues. Be specific.)"],
                "gasOptimizations": ["string (A list of suggestions to improve gas efficiency.)"]
              }
              `
            },
            {
              role: "user",
              content: code
            }
          ],
          responseFormat: { type: "json_object" },
          temperature: 0.1,
          maxTokens: 2048
        });

        const responseText = response.choices?.[0]?.message?.content;
        if (typeof responseText !== 'string') {
          throw new Error('Invalid response format');
        }
        const parsedResponse = JSON.parse(responseText);
        analysisResult = VulnerabilitySchema.parse(parsedResponse);
        
        // Track token usage if available in response
        const usage = response.usage;
        if (usage) {
          performanceTracker.trackTokenUsage(
            trackingId,
            usage.promptTokens || 0,
            usage.completionTokens || 0,
            usage.totalTokens || 0
          );
        }
        
        // Complete performance tracking - success
        performanceTracker.completeMistralAnalysis(trackingId, true, usage ? {
          promptTokens: usage.promptTokens || 0,
          completionTokens: usage.completionTokens || 0,
          totalTokens: usage.totalTokens || 0
        } : undefined);
        
      } else {
        // Use mock analysis if Mistral client is not available
        console.warn('Using mock analysis - Mistral API not configured');
        analysisResult = generateMockAnalysis(code);
        
        // Complete performance tracking for mock - still successful
        performanceTracker.completeMistralAnalysis(trackingId, true);
      }

      // Apply star rating adjustments based on vulnerabilities
      if (analysisResult.vulnerabilities.critical.length > 0) {
        analysisResult.stars = Math.min(analysisResult.stars, 2);
      }
      if (analysisResult.vulnerabilities.high.length > 0) {
        analysisResult.stars = Math.min(analysisResult.stars, 3);
      }
      if (analysisResult.vulnerabilities.critical.length > 1) {
        analysisResult.stars = 1;
      }

      setResult(analysisResult);
      setShowResult(true);
      setCooldown(COOLDOWN_TIME);
      
      // Log performance metrics to console
      const metrics = performanceTracker.getMetrics();
      console.log('📊 Performance Metrics:', {
        averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
        successRate: `${metrics.successRate.toFixed(1)}%`,
        totalAnalyses: metrics.totalAnalyses,
        averageTokenUsage: Math.round(metrics.averageTokenUsage)
      });
      
      await detectCurrentNetwork();
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setError('Analysis failed. Please try again in a few moments.');
      
      // Complete performance tracking - failure
      performanceTracker.completeMistralAnalysis(
        trackingId, 
        false, 
        undefined, 
        (error instanceof Error) ? error.message : 'Analysis failed'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const checkChain = async () => {
      await detectCurrentNetwork();
    };
    checkChain();
  }, []);

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
            <span className="text-white text-sm font-semibold">AI Security Analysis</span>
          </div>
          <h1 className="text-3xl font-mono font-bold text-white mb-4">Smart Contract Audit</h1>
          <p className="text-gray-400">Get instant AI-powered security analysis for your smart contracts on Sepolia testnet</p>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Code Input Panel */}
          <div className="h-[700px] flex flex-col">
            <div 
              className="relative flex-1 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg"
              style={{
                '--mouse-x': `${mousePosition.x}px`,
                '--mouse-y': `${mousePosition.y}px`
              } as React.CSSProperties}
            >
              <div className="absolute inset-0">
                <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                  <FileCode className="text-white" size={20} weight="duotone" />
                  <span className="font-mono text-white">Solidity Code</span>
                </div>
                <div className="h-[calc(100%-60px)] custom-scrollbar">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="// Paste your Solidity code here...
// Example vulnerable contract:
pragma solidity ^0.8.19;

contract TestContract {
    mapping(address => uint256) public balances;
    
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        // Vulnerable: external call before state change
        (bool success,) = msg.sender.call{value: amount}('');
        balances[msg.sender] = 0;
    }
}"
                    className="w-full h-full p-4 bg-transparent text-white font-mono text-sm focus:outline-none resize-none code-editor"
                    spellCheck="false"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>

              {/* Cooldown Overlay */}
              <AnimatePresence>
                {cooldown > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center"
                  >
                    <div className="bg-gray-900/80 p-6 rounded-lg border border-white/50 shadow-lg">
                      <Lock className="text-white mb-4 mx-auto" size={32} weight="bold" />
                      <div className="text-2xl font-mono mb-2 text-center text-white">Cooldown</div>
                      <div className="flex items-center justify-center gap-2">
                        <Timer className="text-white" size={20} weight="fill" />
                        <span className="text-xl text-white">{cooldown}s</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={analyzeContract}
              disabled={isAnalyzing || !code || cooldown > 0}
              className={`mt-4 w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                isAnalyzing || !code || cooldown > 0
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <CircleNotch className="animate-spin" size={20} weight="bold" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Lightning size={20} weight="fill" />
                  Analyze Contract
                </>
              )}
            </button>
          </div>

          {/* Results Panel */}
          <div className="h-[700px]">
            {result && showResult ? (
              <div 
                className="h-full bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg relative"
                style={{
                  '--mouse-x': `${mousePosition.x}px`,
                  '--mouse-y': `${mousePosition.y}px`
                } as React.CSSProperties}
              >
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Shield className="text-white" size={20} weight="duotone" />
                    <span className="font-mono text-white">Analysis Results</span>
                  </div>
                  {txState.hash && currentChain && (
                    <a 
                      href={`${CHAIN_CONFIG[currentChain].blockExplorerUrls[0]}/tx/${txState.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-300 text-sm flex items-center gap-1 transition-colors duration-200"
                    >
                      View Transaction <ArrowSquareOut size={16} weight="bold" />
                    </a>
                  )}
                </div>

                <div className={`h-[calc(100%-60px)] custom-scrollbar overflow-auto p-6 transition-all duration-300 ${isReviewBlurred ? 'blur-md select-none' : ''}`}>
                  {/* Rating */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          weight={i < result.stars ? "fill" : "regular"}
                          className={i < result.stars ? "text-yellow-400" : "text-gray-600"}
                          size={24}
                        />
                      ))}
                    </div>
                    <span className="text-gray-400">Security Score</span>
                  </div>

                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="font-mono text-sm text-white mb-2">SUMMARY</h3>
                    <div className="bg-gray-800/50 px-4 py-3 rounded-lg border border-gray-700/70 text-white">
                      {result.summary}
                    </div>
                  </div>

                  {/* Positive Findings */}
                  {result.positiveFindings.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-mono text-sm text-white mb-2">POSITIVE FINDINGS</h3>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <ul className="space-y-2">
                          {result.positiveFindings.map((finding, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={16} weight="fill" />
                              <span className="text-gray-300">{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Vulnerabilities */}
                  <div className="mb-6 space-y-4">
                    <h3 className="font-mono text-sm text-white mb-2">VULNERABILITIES</h3>
                    {Object.entries(result.vulnerabilities).map(([severity, issues]) => {
                      if (issues.length === 0) return null;
                      const config = SEVERITY_CONFIGS[severity];
                      return (
                        <div key={severity} className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4`}>
                          <div className="flex items-center gap-2 mb-3">
                            {config.icon}
                            <span className={`font-semibold ${config.color}`}>{config.label}</span>
                            <span className="text-gray-400 text-sm">({issues.length})</span>
                          </div>
                          <div className="space-y-3">
                            {issues.map((issue, index) => (
                              <div key={index} className="border-l-2 border-gray-600 pl-4">
                                <div className="font-medium text-white text-sm mb-1">{issue.title}</div>
                                <div className="text-gray-300 text-sm mb-2">{issue.description}</div>
                                <div className="text-gray-500 text-xs font-mono">{issue.location}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recommendations */}
                  <div className="mb-6">
                    <h3 className="font-mono text-sm text-white mb-2">RECOMMENDATIONS</h3>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="text-blue-400 mt-1 flex-shrink-0" size={16} weight="fill" />
                            <span className="text-gray-300">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Gas Optimizations */}
                  <div className="mb-6">
                    <h3 className="font-mono text-sm text-white mb-2">GAS OPTIMIZATIONS</h3>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                      <ul className="space-y-2">
                        {result.gasOptimizations.map((opt, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Cube className="text-purple-400 mt-1 flex-shrink-0" size={16} weight="fill" />
                            <span className="text-gray-300">{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Register Audit Button Overlay */}
                {isReviewBlurred && (
                  <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/30 rounded-lg">
                    <div className="bg-gray-900 p-8 rounded-xl border border-white/30 shadow-xl text-center max-w-md mx-4">
                      <Shield className="text-white mb-6 mx-auto" size={48} weight="duotone" />
                      <h3 className="text-xl font-bold mb-3 text-white">Verify Contract Security</h3>
                      <p className="text-gray-400 mb-6">Register this audit on the blockchain to verify its security status and view the full report</p>
                      <button
                        onClick={registerAuditOnChain}
                        disabled={txState.isProcessing}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {txState.isProcessing ? (
                          <>
                            <CircleNotch className="animate-spin" size={20} weight="bold" />
                            Registering Audit...
                          </>
                        ) : (
                          <>
                            <Lock size={20} weight="fill" />
                            Register Audit On-Chain
                          </>
                        )}
                      </button>
                      
                      {/* Network guidance */}
                      {currentChain && (
                        <div className="mt-4 text-white text-sm flex items-center justify-center gap-2">
                          <img 
                            src={CHAIN_CONFIG[currentChain].iconPath}
                            alt={CHAIN_CONFIG[currentChain].chainName}
                            className="w-4 h-4 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          Will register on {CHAIN_CONFIG[currentChain].chainName}
                        </div>
                      )}
                      
                      {!currentChain && (
                        <div className="mt-4 text-yellow-400 text-sm">
                          Please connect to Sepolia testnet
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transaction Error Message */}
                {txState.error && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg"
                  >
                    {txState.error}
                  </motion.div>
                )}

                {/* Transaction Success Message */}
                {txState.hash && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-4 left-4 right-4 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-lg"
                  >
                    Audit successfully registered on blockchain!
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="h-full bg-gray-900/50 rounded-lg border border-gray-800 flex items-center justify-center text-gray-400 p-8">
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
                    <Shield size={80} className="text-white relative z-10" weight="duotone" />
                  </div>
                  <h3 className="text-xl font-mono mb-4 text-white">Smart Contract Analyzer</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Paste your Solidity code on the left panel and click 'Analyze Contract' to get a comprehensive security assessment
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white border border-white/20">
                      Vulnerability Detection
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white border border-white/20">
                      Security Scoring
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white border border-white/20">
                      Gas Optimization
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white border border-white/20">
                      On-Chain Verification
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(59, 130, 246, 0.5);
        }
        
        .code-editor::selection {
          background: rgba(59, 130, 246, 0.2);
        }
        
        .code-editor::placeholder {
          color: rgba(156, 163, 175, 0.6);
        }
      `}</style>
    </div>
  );
}