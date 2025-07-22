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
  Shield
} from 'phosphor-react';
import { useWalletConnection } from '@/utils/web3';
import { CONTRACT_ADDRESSES, AUDIT_REGISTRY_ABI } from '@/utils/contracts';
import { CHAIN_CONFIG } from '@/utils/web3';
import { DatasetInfo } from '@/components/DatasetInfo';
import { datasetProcessor } from '@/utils/datasetProcessor';

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
  // Academic dataset state
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [academicPatterns, setAcademicPatterns] = useState<any[]>([]);

  // Load academic dataset on component mount
  useEffect(() => {
    const loadDataset = async () => {
      try {
        const stats = await datasetProcessor.loadDataset();
        setDatasetLoaded(true);
        setAcademicPatterns(stats.vulnerabilityPatterns);
        console.log('✅ Academic dataset loaded successfully');
      } catch (error) {
        console.error('Failed to load academic dataset:', error);
      }
    };

    loadDataset();
  }, []);

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

  // Main analysis function with academic enhancement
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
      // Base prompt
      const basePrompt = `You are a professional smart contract security auditor. Analyze the provided Solidity smart contract with zero tolerance for security issues.
            
      Rating System (Extremely Strict):
      - 5 stars: ONLY if contract has zero vulnerabilities and follows all best practices
      - 4 stars: ONLY if no critical/high vulnerabilities, max 1-2 medium issues
      - 3 stars: No critical but has high severity issues needing attention
      - 2 stars: Has critical vulnerability or multiple high severity issues
      - 1 star: Multiple critical and high severity vulnerabilities
      - 0 stars: Fundamental security flaws making contract unsafe
      
      Critical Issues (Any reduces rating to 2 or lower):
      - Reentrancy vulnerabilities
      - Unchecked external calls
      - Integer overflow/underflow risks
      - Access control flaws
      - Unprotected selfdestruct
      - Missing input validation

      Return response in the following JSON format:
      {
        "stars": number,
        "summary": "string",
        "vulnerabilities": {
          "critical": ["string"],
          "high": ["string"],
          "medium": ["string"],
          "low": ["string"]
        },
        "recommendations": ["string"],
        "gasOptimizations": ["string"]
      }`;

      // Get enhanced prompt with academic patterns
      const enhancedPrompt = datasetLoaded 
        ? datasetProcessor.getEnhancedPrompt(code, basePrompt)
        : basePrompt;

      console.log(datasetLoaded ? '🎓 Using academic-enhanced analysis' : '⚠️  Using standard analysis');

      const response = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: [
          {
            role: "system",
            content: enhancedPrompt
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
      
      // Validate response against schema
      const validatedResponse = VulnerabilitySchema.parse(parsedResponse);

      // Enforce strict rating based on vulnerabilities
      if (validatedResponse.vulnerabilities.critical.length > 0) {
        validatedResponse.stars = Math.min(validatedResponse.stars, 2);
      }
      if (validatedResponse.vulnerabilities.high.length > 0) {
        validatedResponse.stars = Math.min(validatedResponse.stars, 3);
      }
      if (validatedResponse.vulnerabilities.critical.length > 2) {
        validatedResponse.stars = 0;
      }

      setResult(validatedResponse);
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
            <span className="text-white text-sm font-semibold">
              {datasetLoaded ? '🎓 Academic AI Security Analysis' : 'AI Security Analysis'}
            </span>
          </div>
          <h1 className="text-3xl font-mono font-bold text-white mb-4">Smart Contract Audit</h1>
          <p className="text-gray-400">
            {datasetLoaded 
              ? 'Get AI-powered security analysis enhanced with academic research patterns from 57,000+ smart contracts'
              : 'Get instant AI-powered security analysis for your smart contracts on Sepolia testnet'
            }
          </p>
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

        {/* Academic Dataset Info Component */}
        <DatasetInfo />

        {/* Dataset Status Indicator */}
        {datasetLoaded && (
          <div className="mb-6 flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">Academic Dataset Active</span>
            </div>
            <span className="text-green-300 text-xs">
              Enhanced with {academicPatterns.length} formal vulnerability patterns
            </span>
          </div>
        )}

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
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="text-white" size={20} weight="duotone" />
                    <span className="font-mono">Solidity Code</span>
                  </div>
                  {datasetLoaded && (
                    <div className="flex items-center gap-1 text-xs text-blue-400">
                      <Robot size={14} weight="fill" />
                      <span>Academic Enhancement</span>
                    </div>
                  )}
                </div>
                <div className="h-[calc(100%-60px)] custom-scrollbar">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={datasetLoaded 
                      ? "// Paste your Solidity code here...\n// Academic patterns will automatically enhance the analysis\n// Try the vulnerable contract examples from the dataset!"
                      : "// Paste your Solidity code here..."
                    }
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
                  : datasetLoaded
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-dark-100 hover:bg-dark-200 text-white shadow-lg shadow-white/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <CircleNotch className="animate-spin" size={20} weight="bold" />
                  {datasetLoaded ? 'Academic Analysis...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  {datasetLoaded ? <Robot size={20} weight="fill" /> : <Lightning size={20} weight="fill" />}
                  {datasetLoaded ? 'Analyze with Academic AI' : 'Analyze Contract'}
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
                    <span className="font-mono">
                      {datasetLoaded ? 'Academic Analysis Results' : 'Analysis Results'}
                    </span>
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
                          className={i < result.stars ? "text-white" : "text-gray-600"}
                          size={24}
                        />
                      ))}
                    </div>
                    <span className="text-gray-400">Security Score</span>
                    {datasetLoaded && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Academic Enhanced
                      </span>
                    )}
                  </div>

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
                            {datasetLoaded && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Pattern Matched
                              </span>
                            )}
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
                  </div>

                  {/* Recommendations */}
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
                      <h3 className="text-xl font-bold mb-3">
                        {datasetLoaded ? 'Verify Academic Analysis' : 'Verify Contract Security'}
                      </h3>
                      <p className="text-gray-400 mb-6 max-w-sm">
                        {datasetLoaded 
                          ? 'Register this academic-enhanced audit on the blockchain to verify its research-backed security status'
                          : 'Register this audit on the blockchain to verify its security status and view the full report'
                        }
                      </p>
                      <button
                        onClick={registerAuditOnChain}
                        disabled={txState.isProcessing}
                        className={`px-8 py-3 font-bold rounded-lg transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg ${
                          datasetLoaded 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-500/20'
                            : 'bg-dark-100 hover:bg-dark-200 text-white shadow-white/20'
                        }`}
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
                    {datasetLoaded ? (
                      <Robot size={80} className="text-white relative z-10" weight="duotone" />
                    ) : (
                      <Shield size={80} className="text-white relative z-10" weight="duotone" />
                    )}
                  </div>
                  <h3 className="text-xl font-mono mb-4">
                    {datasetLoaded ? 'Academic Smart Contract Analyzer' : 'Smart Contract Analyzer'}
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {datasetLoaded 
                      ? 'Paste your Solidity code to get comprehensive security analysis enhanced with formal patterns from 57,000+ academic research contracts'
                      : 'Paste your Solidity code on the left panel and click \'Analyze Contract\' to get a comprehensive security assessment'
                    }
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                   {datasetLoaded ? (
                     <>
                       <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                         Academic Patterns
                       </span>
                       <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                         Formal Logic Detection
                       </span>
                       <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                         Research Validated
                       </span>
                       <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                         57K+ Contract Dataset
                       </span>
                     </>
                   ) : (
                     <>
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
                     </>
                   )}
                 </div>
               </div>
             </div>
           )}
         </div>
       </div>

       {/* Academic Test Contract Examples */}
       {datasetLoaded && !result && (
         <div className="mt-8 bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-lg p-6">
           <div className="flex items-center gap-2 mb-4">
             <Robot className="text-blue-400" size={20} weight="fill" />
             <h3 className="font-semibold text-blue-400">Test Academic Pattern Detection</h3>
           </div>
           <p className="text-blue-200 text-sm mb-4">
             Try these example contracts that match specific academic vulnerability patterns:
           </p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button
               onClick={() => setCode(`pragma solidity ^0.8.19;

contract ReentrancyExample {
   mapping(address => uint) public balances;
   
   // CALLValueInvocation ∧ RepeatedCallValue pattern
   function vulnerableWithdraw() public {
       uint bal = balances[msg.sender];
       require(bal > 0);
       
       (bool sent, ) = msg.sender.call{value: bal}("");
       require(sent, "Failed to send Ether");
       
       balances[msg.sender] = 0; // State change AFTER call
   }
}`)}
               className="text-left p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors duration-200"
             >
               <div className="font-semibold text-red-400 mb-1">Reentrancy Pattern</div>
               <div className="text-xs text-red-300">CALLValueInvocation ∧ RepeatedCallValue</div>
             </button>
             
             <button
               onClick={() => setCode(`pragma solidity ^0.8.19;

contract TimestampExample {
   // TSInvocation ∨ (TSContaminate ∧ TSRandom) pattern
   function timestampLottery() public payable {
       require(msg.value == 1 ether);
       
       if (block.timestamp % 2 == 0) {
           msg.sender.transfer(2 ether);
       }
   }
}`)}
               className="text-left p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors duration-200"
             >
               <div className="font-semibold text-yellow-400 mb-1">Timestamp Dependency</div>
               <div className="text-xs text-yellow-300">TSInvocation ∨ (TSContaminate ∧ TSRandom)</div>
             </button>
           </div>
         </div>
       )}
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