// TestCaseGenerator.tsx
"use client"

import React, { JSX, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mistral } from '@mistralai/mistralai';
import {
  FileCode,
  Robot,
  CircleNotch,
  Copy,
  Check,
  TestTube,
  Code,
  Lightning
} from 'phosphor-react';

const mistralClient = new Mistral({
  apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY!
});

type TestFramework = 'hardhat' | 'foundry' | 'remix';

interface TestingOption {
  id: TestFramework;
  name: string;
  description: string;
  icon: JSX.Element;
  features: string[];
}

const TESTING_OPTIONS: TestingOption[] = [
  {
    id: 'hardhat',
    name: 'Hardhat Tests',
    description: 'Generate JavaScript/TypeScript tests using Hardhat and Chai',
    icon: <TestTube size={24} weight="duotone" />,
    features: [
      'JavaScript/TypeScript',
      'Chai assertions',
      'Ethers.js integration',
      'Gas reporting'
    ]
  },
  {
    id: 'foundry',
    name: 'Foundry Tests',
    description: 'Generate Solidity-based tests using Foundry framework',
    icon: <Code size={24} weight="duotone" />,
    features: [
      'Solidity native',
      'Fuzzing support',
      'Gas optimization',
      'Fast execution'
    ]
  },
  {
    id: 'remix',
    name: 'Remix Manual Tests',
    description: 'Generate step-by-step manual testing instructions for Remix IDE',
    icon: <FileCode size={24} weight="duotone" />,
    features: [
      'GUI-based testing',
      'No setup required',
      'Interactive steps',
      'Visual verification'
    ]
  }
];

export default function TestCaseGenerator() {
  const [contractCode, setContractCode] = useState('');
  const [generatedTests, setGeneratedTests] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<TestFramework>('hardhat');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getPromptForFramework = (code: string, framework: TestFramework) => {
    const basePrompt = `You are an expert in smart contract testing. Generate comprehensive test cases for the following smart contract:

Contract code:
${code}

Requirements:
- Test all main contract functions
- Include edge cases and error conditions
- Test access control
- Verify state changes
- Check event emissions
- Add gas optimization checks where relevant`;

    const frameworkSpecific = {
      hardhat: `
Additional Requirements:
- Use Hardhat and Chai with latest practices
- Include complete test setup with TypeScript
- Add proper describe/it blocks
- Include deployment scripts
- Add comprehensive assertions
- Include gas usage reporting
Return ONLY the complete test file code without any extra text.`,

      foundry: `
Additional Requirements:
- Use Foundry's Solidity testing framework
- Include setUp() function
- Use forge std assertions
- Add fuzzing where appropriate
- Include proper test annotations
- Add gas optimization tests
Return ONLY the complete test file code without any extra text.`,

      remix: `
Additional Requirements:
- Create step-by-step manual testing instructions
- Include specific input values to test
- Add expected outcomes for each step
- Include verification steps
- Add troubleshooting notes
- Include deployment instructions
Return a structured list of testing steps without any extra text.`
    };

    return basePrompt + frameworkSpecific[framework];
  };

  const generateTests = async () => {
    if (!contractCode.trim()) {
      setError('Please enter contract code to generate tests');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: [
          {
            role: "user",
            content: getPromptForFramework(contractCode, selectedFramework),
          },
        ],
        temperature: 0.1,
        maxTokens: 4096,
      });

      const generatedText = response.choices?.[0]?.message?.content || '';

      let cleanCode = '';
      if (typeof generatedText === 'string') {
        // Remove any markdown-style code blocks (```)
        cleanCode = generatedText
          .replace(/```[a-z]*\n/g, '')
          .replace(/```/g, '')
          .replace(/\*/g, '')
          .trim();
      } else {
        setGeneratedTests('');
      }

      setGeneratedTests(cleanCode);

    } catch (error) {
      console.error('Test generation failed:', error);
      setError('Failed to generate test cases. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-zinc-900 text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
            <span className="text-white text-sm font-semibold">Test Suite Generation</span>
          </div>
          <h1 className="text-3xl font-mono font-bold mb-4 text-white">Test Case Generator</h1>
          <p className="text-gray-400">Generate comprehensive test cases for your smart contracts using different testing frameworks</p>
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

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex flex-col space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {TESTING_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedFramework(option.id)}
                  className={`p-4 rounded-lg border transition-all duration-200 text-left h-full hover:shadow-md
                    ${selectedFramework === option.id
                      ? 'border-white bg-white/10 text-white shadow-white/5'
                      : 'border-gray-800 hover:border-white/50'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`${selectedFramework === option.id ? 'text-white' : 'text-gray-400'}`}>
                      {option.icon}
                    </div>
                    <span className="font-semibold text-white">{option.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{option.description}</p>
                </button>
              ))}
            </div>

            <div
              className="bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/30 transition-colors duration-300 shadow-lg"
            >
              <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                <Code className="text-white" size={20} weight="duotone" />
                <span className="font-mono text-white">Contract Code</span>
              </div>

              <textarea
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
                placeholder="Paste your smart contract code here..."
                className="w-full h-[400px] bg-transparent p-6 font-mono text-sm resize-none focus:outline-none focus:border-white focus:ring-1 focus:ring-white/50 transition-all duration-200 text-white"
              />
            </div>
            
            <button
              onClick={generateTests}
              disabled={!contractCode || isGenerating}
              className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-200 ${isGenerating || !contractCode
                ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-dark-100 hover:bg-dark-200 text-white shadow-lg shadow-white/20'
                }`}
            >
              {isGenerating ? (
                <>
                  <CircleNotch className="animate-spin" size={20} weight="bold" />
                  Generating {TESTING_OPTIONS.find(opt => opt.id === selectedFramework)?.name}...
                </>
              ) : (
                <>
                  <Lightning size={20} weight="fill" />
                  Generate {TESTING_OPTIONS.find(opt => opt.id === selectedFramework)?.name}
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col">
            <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/30 transition-colors duration-300 shadow-lg">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TestTube className="text-white" size={20} weight="duotone" />
                  <span className="font-mono text-white">Generated {TESTING_OPTIONS.find(opt => opt.id === selectedFramework)?.name}</span>
                </div>
                {generatedTests && (
                  <button
                    onClick={() => copyToClipboard(generatedTests)}
                    className="text-white hover:text-gray-300 text-sm flex items-center gap-1 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-white/10"
                  >
                    {copySuccess ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                    {copySuccess ? 'Copied!' : 'Copy Code'}
                  </button>
                )}
              </div>

              <div className="code-container">
                {generatedTests ? (
                  <>
                    <div className="line-numbers">
                      {Array.from({ length: generatedTests.split('\n').length }, (_, i) => i + 1).map(lineNumber => (
                        <span key={lineNumber} className="line-number">
                          {lineNumber}
                        </span>
                      ))}
                    </div>
                    <pre className="code-input font-mono text-sm whitespace-pre-wrap text-white p-4 custom-scrollbar">{generatedTests}</pre>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/10 rounded-full blur-md"></div>
                      <TestTube size={48} className="mb-4 relative z-10 text-white" weight="duotone" />
                    </div>
                    <p>Select a framework, enter your contract code, and generate tests</p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {TESTING_OPTIONS.find(opt => opt.id === selectedFramework)?.features.map((feature) => (
                        <span
                          key={feature}
                          className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .code-container {
          position: relative;
          width: 100%;
          height: 600px; /* Set a fixed height for the container */
        }

        .line-numbers {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          padding: 4px;
          text-align: right;
          color: #6b7280;
          font-size: 14px;
          font-family: monospace;
          white-space: nowrap;
          overflow-y: auto; /* Add vertical scroll for line numbers */
          z-index: 1;
          background-color: #1f2937;
          border-right: 1px solid #374151;
        }

        .line-number {
          display: block;
          padding: 0 8px;
        }

        .code-input {
          padding-left: 50px; /* Adjust based on line number width */
          z-index: 2;
          height: 100%;
          overflow-y: scroll;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        }

        .code-input::-webkit-scrollbar {
          width: 6px;
        }

        .code-input::-webkit-scrollbar-track {
          background: transparent;
        }

        .code-input::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .code-input::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}