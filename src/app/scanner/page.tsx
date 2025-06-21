'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode,
  Robot,
  CircleNotch,
  ArrowSquareOut,
  Shield,
  CheckCircle,
  Warning,
  MagnifyingGlass
} from 'phosphor-react';
import Image from 'next/image';

// Define the vulnerability analysis interface
interface ScanResult {
  score: number;
  summary: string;
  vulnerabilities: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  recommendations: string[];
}

interface SeverityConfig {
  color: string;
  label: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

// Constants
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

// Sample vulnerabilities for demo
const SAMPLE_VULNERABILITIES = {
  critical: [
    "Reentrancy vulnerability in withdrawFunds() function",
    "Unchecked external call return values"
  ],
  high: [
    "Integer overflow in token calculations",
    "Unprotected selfdestruct capability"
  ],
  medium: [
    "Improper access control on administrative functions",
    "Use of deprecated Solidity features"
  ],
  low: [
    "Missing events for state-changing functions",
    "Inefficient gas usage in loops"
  ]
};

export default function ScannerPage() {
  // State management
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mouse tracking effect for UI effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Simulate scanning a contract
  const scanContract = async () => {
    if (!code.trim()) return;

    setIsScanning(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Count the number of lines to determine "complexity"
    const lineCount = code.split('\n').length;
    
    // Generate a score based on code length (simplified demo)
    let score = 5; // Default perfect score
    if (lineCount > 100) score = 4;
    if (lineCount > 200) score = 3;
    if (lineCount > 300) score = 2;
    
    // Generate random number of vulnerabilities based on score
    const criticalCount = 5 - score;
    const highCount = Math.floor(Math.random() * 3);
    const mediumCount = Math.floor(Math.random() * 3) + 1;
    const lowCount = Math.floor(Math.random() * 4) + 2;
    
    // Create result with random vulnerabilities
    const scanResult: ScanResult = {
      score,
      summary: `Contract analysis complete. Found ${criticalCount + highCount + mediumCount + lowCount} potential vulnerabilities across all severity levels.`,
      vulnerabilities: {
        critical: SAMPLE_VULNERABILITIES.critical.slice(0, criticalCount),
        high: SAMPLE_VULNERABILITIES.high.slice(0, highCount),
        medium: SAMPLE_VULNERABILITIES.medium.slice(0, mediumCount),
        low: SAMPLE_VULNERABILITIES.low.slice(0, lowCount),
      },
      recommendations: [
        "Implement checks-effects-interactions pattern to prevent reentrancy",
        "Add proper input validation for all parameters",
        "Use SafeMath for arithmetic operations",
        "Add events for all state-changing operations",
        "Follow Sepolia testnet gas optimization best practices"
      ]
    };
    
    setResult(scanResult);
    setIsScanning(false);
  };

  return (
    <main className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
            <span className="text-white text-sm font-semibold">Vulnerability Scanner</span>
          </div>
          <h1 className="text-3xl font-mono font-bold mb-4 text-white">Smart Contract Scanner</h1>
          <p className="text-gray-400">Scan your smart contracts for common vulnerabilities and security issues on Sepolia testnet</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Code Input */}
          <div className="flex flex-col h-[700px]">
            <div 
              className="flex-1 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg relative"
              style={{
                '--mouse-x': `${mousePosition.x}px`,
                '--mouse-y': `${mousePosition.y}px`,
              } as React.CSSProperties}
            >
              <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                <FileCode className="text-white" size={20} weight="duotone" />
                <span className="font-mono text-white">Contract Code</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your smart contract code here..."
                className="w-full h-full bg-transparent border-none resize-none focus:outline-none p-6 font-mono text-sm text-white code-input"
              />
            </div>

            {/* Scan Button */}
            <button
              onClick={scanContract}
              disabled={isScanning || !code}
              className={`mt-4 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                isScanning || !code
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-dark-100 hover:bg-dark-200 text-white shadow-lg shadow-white/20'
              }`}
            >
              {isScanning ? (
                <>
                  <CircleNotch className="animate-spin" size={20} weight="bold" />
                  Scanning Contract...
                </>
              ) : (
                <>
                  <MagnifyingGlass size={20} weight="bold" />
                  Scan for Vulnerabilities
                </>
              )}
            </button>
          </div>

          {/* Right Column - Results */}
          <div className="h-[700px]">
            {result ? (
              <div 
                className="h-full bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg relative overflow-auto custom-scrollbar"
                style={{
                  '--mouse-x': `${mousePosition.x}px`,
                  '--mouse-y': `${mousePosition.y}px`,
                } as React.CSSProperties}
              >
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Shield className="text-white" size={20} weight="duotone" />
                    <span className="font-mono text-white">Scan Results</span>
                  </div>
                </div>

                <div className="p-6 overflow-auto">
                  {/* Security Score */}
                  <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">Security Score</h2>
                    <div className="flex items-center gap-2 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <motion.div 
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          {i < result.score ? (
                            <CheckCircle size={32} weight="fill" className="text-white" />
                          ) : (
                            <CheckCircle size={32} weight="bold" className="text-gray-600" />
                          )}
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-gray-400">{result.summary}</p>
                  </div>

                  {/* Vulnerabilities */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold mb-4">Vulnerabilities</h2>
                    
                    {Object.entries(result.vulnerabilities).map(([severity, issues]) => (
                      issues.length > 0 && (
                        <div key={severity} className="mb-4">
                          <div className={`flex items-center gap-2 ${SEVERITY_CONFIGS[severity].color} mb-2`}>
                            {SEVERITY_CONFIGS[severity].icon}
                            <h3 className="font-semibold">{SEVERITY_CONFIGS[severity].label}</h3>
                          </div>
                          <div className={`${SEVERITY_CONFIGS[severity].bgColor} ${SEVERITY_CONFIGS[severity].borderColor} border rounded-lg p-4`}>
                            <ul className="space-y-2">
                              {issues.map((issue, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-1">•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )
                    ))}
                    
                    {Object.values(result.vulnerabilities).every(arr => arr.length === 0) && (
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">
                        <CheckCircle size={20} weight="fill" />
                        <span>No vulnerabilities detected!</span>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h2 className="text-xl font-bold mb-4">Recommendations</h2>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle size={16} className="text-white mt-1" weight="fill" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-900/50 rounded-lg border border-gray-800 p-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-md"></div>
                  <MagnifyingGlass size={64} className="mb-6 relative z-10 text-white" weight="duotone" />
                </div>
                <h3 className="text-xl font-mono mb-4 text-center">Vulnerability Scanner</h3>
                <p className="text-center mb-6">
                  Paste your smart contract code and scan for potential vulnerabilities and security issues optimized for Sepolia testnet.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20">
                    Reentrancy Detection
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20">
                    Access Control
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20">
                    Overflow Protection
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20">
                    Security Best Practices
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .code-input {
          height: 100%;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        }
        
        .code-input::-webkit-scrollbar,
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .code-input::-webkit-scrollbar-track,
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .code-input::-webkit-scrollbar-thumb,
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        
        .code-input::-webkit-scrollbar-thumb:hover,
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </main>
  );
}