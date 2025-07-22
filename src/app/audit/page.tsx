'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";
import { ethers } from 'ethers';
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
  MagnifyingGlass,
  Database
} from 'phosphor-react';
import { useWalletConnection } from '@/utils/web3';
import { CONTRACT_ADDRESSES, AUDIT_REGISTRY_ABI } from '@/utils/contracts';
import { CHAIN_CONFIG } from '@/utils/web3';
import { enhancedContractRAG as contractRAG } from '@/utils/enhanced-rag-engine';

// Initialize Mistral client
const mistralClient = new Mistral({
  apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY!
});

// Define the vulnerability analysis schema
const VulnerabilitySchema = z.object({
  stars: z.number().min(0).max(5),
  summary: z.string(),
  vulnerabilities: z.object({
    critical: z.array(z.string()),
    high: z.array(z.string()),
    medium: z.array(z.string()),
    low: z.array(z.string())
  }),
  recommendations: z.array(z.string()),
  gasOptimizations: z.array(z.string())
});

// Interface definitions
interface AuditResult {
  stars: number;
  summary: string;
  vulnerabilities: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  recommendations: string[];
  gasOptimizations: string[];
  ragAnalysis?: {
    detectedPatterns: number;
    confidenceScore: number;
    knowledgeBaseMatches: string[];
  };
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
  const [ragPreAnalysis, setRagPreAnalysis] = useState<any>(null);
  const [showRAGInsights, setShowRAGInsights] = useState(false);

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
    return () => clearInterval(interval);
  }, [cooldown]);

  // Enhanced RAG Pre-analysis when code changes
  useEffect(() => {
    if (code.trim() && isSolidityCode(code)) {
      const analysis = contractRAG.analyzeContractWithConfidence(code);
      setRagPreAnalysis(analysis);
    } else {
      setRagPreAnalysis(null);
    }
  }, [code]);

  // Validation functions
  const isSolidityCode = (code: string): boolean => {
    // More flexible pragma pattern that accepts different version formats
    const pragmaPattern = /pragma\s+solidity\s+(?:\^|\>=|\<=|~)?\s*\d+\.\d+(\.\d+)?|pragma\s+solidity\s+[\d\s\^\>\<\=\.\~]+/;
    const hasPragma = pragmaPattern.test(code);
    
    // Check for contract, library, or interface declarations
    const hasContractLike = /(?:contract|library|interface|abstract\s+contract)\s+\w+/.test(code);
    
    // Additional optional checks to identify Solidity code
    const hasSolidityKeywords = /(?:function|mapping|address|uint\d*|bytes\d*|struct|enum|event|modifier)\s+\w+/.test(code);
    
    // We require either pragma statement or contract-like declaration
    // Plus evidence of Solidity keywords for additional confidence
    return (hasPragma || hasContractLike) && hasSolidityKeywords;
  };

  // Use our new wallet connection hook
  const { connect } = useWalletConnection();
  
  // Detect current network
  const detectCurrentNetwork = async () => {
    try {
      const connection = await connect();
      if (!connection) {
        console.log('No wallet connection available');
        return null;
      }
      
      const { provider } = connection;
      const network = await provider.getNetwork();
      const chainId = '0x' + network.chainId.toString(16);
      
      // Check which network we're on
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
    // Default to sepolia if no chainId is detected
    if (!currentChain) return 'sepolia';
    
    // Return the current chain or default to sepolia
    return currentChain || 'sepolia';
  };

  // Chain registration function
  const registerAuditOnChain = async () => {
    if (!result || !code) return;

    setTxState({ isProcessing: true, hash: null, error: null });

    try {
      const connection = await connect();
      if (!connection) {
        throw new Error('Please connect your wallet first');
      }
      
      const { provider, signer } = connection;
      
      // Calculate contract hash
      const contractHash = ethers.keccak256(
        ethers.toUtf8Bytes(code)
      );

      // Get current chain ID
      const network = await provider.getNetwork();
      const chainId = '0x' + network.chainId.toString(16);
      
      // Check if we're on Sepolia testnet
      const detectedChain = await detectCurrentNetwork();
      
      if (!detectedChain) {
        throw new Error('Please switch to Sepolia testnet to register audits');
      }
      
      if (detectedChain !== 'sepolia') {
        throw new Error('Please switch to Sepolia testnet to register audits');
      }
      
      // Get the proper contract address based on the current network
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

      const receipt = await tx.wait();
      setTxState({
        isProcessing: false,
        hash: receipt.transactionHash,
        error: null
      });
      setIsReviewBlurred(false);
    } catch (error) {
      console.error('Failed to register audit:', error);
      setTxState({
        isProcessing: false,
        hash: null,
        error: (error instanceof Error) ? error.message : 'Failed to register audit'
      });
    }
  };

  // Enhanced analysis function with RAG
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

    try {
      // Generate enhanced prompt with RAG context
      const enhancedPrompt = contractRAG.generateEnhancedPromptWithDataset(code);
      
      const response = await mistralClient.chat.complete({
        // line 306 – just swap to the smaller pool
        model: "mistral-medium-latest",
        messages: [
          {
            role: "system",
            content: "You are a professional smart contract security auditor with access to a comprehensive vulnerability database. Provide detailed, accurate security analysis."
          },
          {
            role: "user",
            content: enhancedPrompt
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
      
      // Validate response against schema
      const validatedResponse = VulnerabilitySchema.parse(parsedResponse);

      // Add RAG analysis metadata
      const ragAnalysis = contractRAG.analyzeContractWithConfidence(code);
      const enhancedResult: AuditResult = {
        ...validatedResponse,
        ragAnalysis: {
          detectedPatterns: ragAnalysis.datasetMatches || 0,
          confidenceScore: ragAnalysis.confidence || 0,
          knowledgeBaseMatches: contractRAG.getContextualRecommendations(code)
        }
      };

      // Enforce strict rating based on vulnerabilities
      if (enhancedResult.vulnerabilities.critical.length > 0) {
        enhancedResult.stars = Math.min(enhancedResult.stars, 2);
      }
      if (enhancedResult.vulnerabilities.high.length > 0) {
        enhancedResult.stars = Math.min(enhancedResult.stars, 3);
      }
      if (enhancedResult.vulnerabilities.critical.length > 2) {
        enhancedResult.stars = 0;
      }

      setResult(enhancedResult);
      setShowResult(true);
      setCooldown(COOLDOWN_TIME);
      
      // Detect the current network when analysis is complete
      await detectCurrentNetwork();
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setError('Analysis failed. Please try again in a few moments.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update current chain when the component loads
  useEffect(() => {
    const checkChain = async () => {
      await detectCurrentNetwork();
    };
    
    checkChain();
  }, []);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
            <span className="text-white text-sm font-semibold flex items-center gap-2">
              <Database size={16} weight="bold" />
              AI Security Analysis with Knowledge Base
            </span>
          </div>
          <h1 className="text-3xl font-mono font-bold text-white mb-4">
            Enhanced Smart Contract Audit
          </h1>
          <p className="text-gray-400">
            Advanced AI-powered security analysis using our curated vulnerability knowledge base from 40,000+ audited contracts
          </p>
          
          {/* RAG Pre-analysis Insights */}
          {/* Enhanced RAG Pre-analysis Insights */}
          {ragPreAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MagnifyingGlass className="text-blue-400" size={20} weight="bold" />
                  <span className="text-blue-400 font-semibold">Knowledge Base Scan</span>
                </div>
                <button
                  onClick={() => setShowRAGInsights(!showRAGInsights)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  {showRAGInsights ? 'Hide' : 'Show'} Details
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {Object.values(ragPreAnalysis.vulnerabilities || {}).flat().length}
                  </div>
                  <div className="text-blue-400">Issues Detected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {ragPreAnalysis.knowledgeBaseSize || 13}
                  </div>
                  <div className="text-blue-400">KB Patterns</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {ragPreAnalysis.datasetEnhanced ? '✓' : '○'}
                  </div>
                  <div className="text-blue-400">Enhanced</div>
                </div>
              </div>

              {showRAGInsights && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-blue-500/20"
                >
                  <div className="text-sm">
                    <div className="mb-2 font-semibold text-blue-400">Pattern Analysis:</div>
                    <div className="text-blue-300">{ragPreAnalysis.detailedAnalysis}</div>
                    {ragPreAnalysis.datasetEnhanced && (
                      <div className="mt-2 text-xs bg-green-500/10 border border-green-500/20 rounded px-2 py-1 text-green-400">
                        ✅ Enhanced with {ragPreAnalysis.knowledgeBaseSize} dataset patterns
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

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
                  <span className="font-mono">Solidity Code</span>
                  {ragPreAnalysis && (
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-green-400">KB Active</span>
                    </div>
                  )}
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
                    className="w-full h-full p-4 bg-transparent font-mono text-sm focus:outline-none resize-none code-editor"
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
                      <div className="text-2xl font-mono mb-2 text-center">Cooldown</div>
                      <div className="flex items-center justify-center gap-2">
                        <Timer className="text-white" size={20} weight="fill" />
                        <span className="text-xl">{cooldown}s</span>
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
                  : 'bg-dark-100 hover:bg-dark-200 text-white shadow-lg shadow-white/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <CircleNotch className="animate-spin" size={20} weight="bold" />
                  Running Enhanced Analysis...
                </>
              ) : (
                <>
                  <Lightning size={20} weight="fill" />
                  Analyze with Knowledge Base
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
                    <span className="font-mono">Enhanced Analysis Results</span>
                    {result.ragAnalysis && (
                      <div className="ml-2 flex items-center gap-1">
                        <Database className="text-green-400" size={16} weight="bold" />
                        <span className="text-xs text-green-400">KB Enhanced</span>
                      </div>
                    )}
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
                  {/* Enhanced Rating with RAG Confidence */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          weight={i < result.stars ? "fill" : "regular"}
                          className={i < result.stars ? "text-white" : "text-gray-600"}
                          size={24}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400">Security Score</span>
                      {result.ragAnalysis && (
                        <span className="text-xs text-green-400">
                          KB Confidence: {result.ragAnalysis.confidenceScore.toFixed(1)}/5
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RAG Analysis Summary */}
                  {result.ragAnalysis && (
                    <div className="mb-6">
                      <h3 className="font-mono text-sm text-white mb-2">KNOWLEDGE BASE ANALYSIS</h3>
                      <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-blue-400">Pattern Matches:</span>
                            <span className="text-white ml-2">{result.ragAnalysis.detectedPatterns}</span>
                          </div>
                          <div>
                            <span className="text-blue-400">KB Recommendations:</span>
                            <span className="text-white ml-2">{result.ragAnalysis.knowledgeBaseMatches.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="font-mono text-sm text-white mb-2">SUMMARY</h3>
                    <div className="bg-gray-800/50 px-4 py-3 rounded-lg border border-gray-700/70 text-white">
                      {result.summary}
                    </div>
                  </div>

                  {/* Vulnerabilities */}
                  <div className="mb-6 space-y-4">
                    <h3 className="font-mono text-sm text-white mb-2">VULNERABILITIES</h3>
                    {Object.entries(result.vulnerabilities).map(([severity, issues]) => {
                      if (issues.length === 0) return null;
                      const config = SEVERITY_CONFIGS[severity];
                      return (
                        <div key={severity} className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4`}>
                          <div className="flex items-center gap-2 mb-2">
                            {config.icon}
                            <span className={`font-semibold ${config.color}`}>{config.label}</span>
                            <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full text-gray-400">
                              {issues.length} issue{issues.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {issues.map((issue, index) => (
                              <li key={index} className="text-gray-300 text-sm">
                                • {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    
                    {Object.values(result.vulnerabilities).every(arr => arr.length === 0) && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-2">
                        <CheckCircle className="text-green-400" size={20} weight="fill" />
                        <span className="text-green-400">No vulnerabilities detected by knowledge base analysis!</span>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Recommendations */}
                  <div className="mb-6">
                    <h3 className="font-mono text-sm text-white mb-2">RECOMMENDATIONS</h3>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="text-white mt-1 flex-shrink-0" size={16} weight="fill" />
                            <span className="text-gray-300">{rec}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {/* Knowledge Base Specific Recommendations */}
                      {result.ragAnalysis && result.ragAnalysis.knowledgeBaseMatches.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="text-xs text-blue-400 mb-2 flex items-center gap-1">
                            <Database size={12} weight="bold" />
                            KNOWLEDGE BASE RECOMMENDATIONS
                          </div>
                          <ul className="space-y-1">
                            {result.ragAnalysis.knowledgeBaseMatches.slice(0, 3).map((rec, index) => (
                              <li key={index} className="text-xs text-blue-300">
                                • {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gas Optimizations */}
                  <div className="mb-6">
                    <h3 className="font-mono text-sm text-white mb-2">GAS OPTIMIZATIONS</h3>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                      <ul className="space-y-2">
                        {result.gasOptimizations.map((opt, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Cube className="text-white mt-1 flex-shrink-0" size={16} weight="fill" />
                            <span className="text-gray-300">{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Register Audit Button Overlay */}
                {isReviewBlurred && (
                  <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/30">
                    <div className="bg-gray-900 p-8 rounded-xl border border-white/30 shadow-xl text-center">
                      <Shield className="text-white mb-6 mx-auto" size={48} weight="duotone" />
                      <h3 className="text-xl font-bold mb-3">Verify Enhanced Security Analysis</h3>
                      <p className="text-gray-400 mb-6 max-w-sm">
                        Register this knowledge-base enhanced audit on the blockchain to verify its security status
                      </p>
                      
                      {/* Analysis Preview */}
                      {result.ragAnalysis && (
                        <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                          <div className="text-xs text-blue-400 mb-2">Analysis Overview</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-white">{result.ragAnalysis.detectedPatterns} Patterns</div>
                            <div className="text-white">{result.ragAnalysis.confidenceScore.toFixed(1)}/5 Confidence</div>
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={registerAuditOnChain}
                        disabled={txState.isProcessing}
                        className="px-8 py-3 bg-dark-100 hover:bg-dark-200 text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg shadow-white/20"
                      >
                        {txState.isProcessing ? (
                          <>
                            <CircleNotch className="animate-spin" size={20} weight="bold" />
                            Registering Enhanced Audit...
                          </>
                        ) : (
                          <>
                            <Lock size={20} weight="fill" />
                            Register Enhanced Audit On-Chain
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
                  <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg">
                    {txState.error}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-gray-900/50 rounded-lg border border-gray-800 flex items-center justify-center text-gray-400 p-8">
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex items-center justify-center">
                      <Shield size={40} className="text-white" weight="duotone" />
                      <Database size={40} className="text-blue-400 -ml-4 -mt-4" weight="bold" />
                    </div>
                  </div>
                  <h3 className="text-xl font-mono mb-4">Enhanced Smart Contract Analyzer</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Paste your Solidity code to get AI-powered analysis enhanced with our knowledge base of 40,000+ audited contracts
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white border border-white/20">
                      Pattern Recognition
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Knowledge Base Enhanced
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white border border-white/20">
                      Real-time Analysis
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
      `}</style>
    </div>
  );
}