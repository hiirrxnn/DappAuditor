"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mistral } from '@mistralai/mistralai';
import {
  FileText,
  Copy,
  Check,
  Function as FunctionIcon,
  Database,
  Bell,
  Robot,
  CircleNotch,
  DownloadSimple,
  Lightning,
  Article,
  BookOpen,
  Archive,
  Info,
  Code,
  ListBullets,
  Stack
} from 'phosphor-react';
import { vectorStore } from '@/utils/vectorStore';

const mistralClient = new Mistral({
  apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY!
});

// Enhanced interfaces for comprehensive documentation
interface Parameter {
  name: string;
  type: string;
  description?: string;
  indexed?: boolean;
}

interface Function {
  name: string;
  description: string;
  params: Parameter[];
  returns: Parameter[];
  visibility: string;
  mutability: string;
  modifiers: string[];
  reverts: string[];
  gasOptimization?: string[];
  examples?: string[];
  notes?: string[];
}

interface Event {
  name: string;
  description: string;
  params: Parameter[];
  useCases?: string[];
  emittedBy?: string[];
}

interface Variable {
  name: string;
  type: string;
  visibility: string;
  description: string;
  purpose?: string;
  defaultValue?: string;
}

interface Modifier {
  name: string;
  description: string;
  params: Parameter[];
  purpose: string;
  appliedTo: string[];
}

interface Documentation {
  name: string;
  description: string;
  version: string;
  license: string;
  architecture: string;
  designPatterns: string[];
  inheritanceStructure: string[];
  dependencies: string[];
  usageExamples: string[];
  functions: Function[];
  events: Event[];
  variables: Variable[];
  modifiers: Modifier[];
  constructorDetails: {
    description: string;
    params: Parameter[];
    initialization: string[];
  };
  interfaceCompliance: string[];
  deploymentNotes: string[];
}

const ContractDocsGenerator = () => {
  const [contractCode, setContractCode] = useState<string>('');
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
  console.log(message);
  setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
};

const generateDocs = async () => {
  if (!contractCode.trim()) {
    setError('Please enter contract code to generate documentation');
    return;
  }

  setIsGenerating(true);
  setError(null);
  setDebugInfo([]);

  try {
    addDebugInfo('🔍 Starting documentation generation...');
    
    // Check API keys
    if (!process.env.NEXT_PUBLIC_MISTRAL_API_KEY) {
      console.error('❌ Mistral API key not found');
      setError('Mistral API key not configured. Please check your environment variables.');
      return;
    }

    // Get RAG context via API call instead of direct import
    let ragContext = '';
    let similarContracts: any[] = [];
    
    try {
      addDebugInfo('🔍 Searching for similar contracts via API...');
      
      // Call our API route instead of importing vectorStore directly
      const ragResponse = await fetch('/api/search-similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: contractCode,
          limit: 3
        }),
      });

      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        similarContracts = ragData.results || [];
        addDebugInfo(`📊 Found ${similarContracts.length} similar contracts`);
        
        if (similarContracts.length > 0) {
          ragContext = `
**SIMILAR CONTRACT PATTERNS:**
${similarContracts.map((c, i) => `
${i + 1}. Score: ${c.score?.toFixed(3)}
Type: ${c.metadata?.contractType}
Security: ${c.metadata?.securityLevel}
Code: ${c.chunk.substring(0, 300)}...
Notes: ${c.metadata?.documentationNotes}
`).join('\n')}`;
        }
      } else {
        addDebugInfo('⚠️ RAG API call failed, proceeding without context');
      }
    } catch (ragError) {
      addDebugInfo(`⚠️ RAG failed: ${(ragError as Error).message} - continuing without context`);
    }

    // Build the enhanced prompt with RAG context
    const enhancedPrompt = `You are a senior smart contract developer and technical documentation expert. Generate comprehensive, developer-focused documentation for this smart contract.

${ragContext}

**CONTRACT TO DOCUMENT:**
\`\`\`solidity
${contractCode}
\`\`\`

**CRITICAL: Return ONLY valid JSON with ALL required fields. Focus on comprehensive technical documentation, usage examples, and implementation details.**

{
  "name": "Contract name from the code",
  "description": "Detailed description of the contract's purpose, functionality, and use cases",
  "version": "Version from pragma or 'Unknown'",
  "license": "License identifier or 'Not specified'", 
  "architecture": "Comprehensive architectural overview including design decisions, patterns used, and overall structure",
  "designPatterns": ["List of design patterns implemented"],
  "inheritanceStructure": ["Parent contracts and interfaces inherited"],
  "dependencies": ["External contracts, libraries, or interfaces used"],
  "usageExamples": ["Practical examples of how to interact with this contract"],
  "constructorDetails": {
    "description": "Detailed explanation of constructor functionality",
    "params": [{"name": "param", "type": "type", "description": "Parameter explanation"}],
    "initialization": ["Steps performed during contract deployment"]
  },
  "functions": [
    {
      "name": "function name",
      "description": "Comprehensive explanation of function purpose, business logic, and behavior",
      "params": [{"name": "param", "type": "type", "description": "Detailed parameter explanation"}],
      "returns": [{"name": "return", "type": "type", "description": "Detailed return value explanation"}],
      "visibility": "visibility level",
      "mutability": "state mutability",
      "modifiers": ["list of modifiers applied"],
      "reverts": ["Detailed conditions that cause reverts"],
      "gasOptimization": ["Gas optimization notes and considerations"],
      "examples": ["Code examples showing how to call this function"],
      "notes": ["Additional implementation notes and considerations"]
    }
  ],
  "events": [
    {
      "name": "event name", 
      "description": "Detailed event purpose and when it's emitted",
      "params": [{"name": "param", "type": "type", "indexed": true, "description": "Parameter explanation"}],
      "useCases": ["How this event should be used by external systems"],
      "emittedBy": ["Functions that emit this event"]
    }
  ],
  "variables": [
    {
      "name": "variable name",
      "type": "variable type", 
      "visibility": "visibility level",
      "description": "Comprehensive variable purpose and usage",
      "purpose": "Why this variable exists and its role",
      "defaultValue": "Default or initial value if applicable"
    }
  ],
  "modifiers": [
    {
      "name": "modifier name",
      "description": "What the modifier does and its purpose",
      "params": [{"name": "param", "type": "type", "description": "Parameter explanation"}],
      "purpose": "Why this modifier exists",
      "appliedTo": ["Functions that use this modifier"]
    }
  ],
  "interfaceCompliance": ["ERC standards or interfaces this contract implements"],
  "deploymentNotes": ["Important considerations for deployment"]
}`;

    addDebugInfo('📤 Calling Mistral API...');
    
    const response = await mistralClient.chat.complete({
      model: "mistral-large-latest",
      messages: [{ role: "user", content: enhancedPrompt }],
      responseFormat: { type: "json_object" },
      temperature: 0.1,
      maxTokens: 8192,
    });

    addDebugInfo('📥 Received response from Mistral API');

    const rawContent = response.choices?.[0]?.message?.content;
    let jsonString = typeof rawContent === 'string' ? rawContent : '';
    
    // Clean up the response
    jsonString = jsonString.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.substring(7).trimStart();
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3).trimEnd();
    }

    const parsedDocs = JSON.parse(jsonString) as Documentation;
    
    // Validate and set documentation
    if (!parsedDocs.name || !parsedDocs.description) {
      throw new Error('Response missing required fields');
    }
    
    setDocumentation(parsedDocs);
    addDebugInfo('✅ Documentation generated successfully');
    
    if (similarContracts.length > 0) {
      addDebugInfo(`📊 RAG enhanced documentation with ${similarContracts.length} similar contract patterns`);
    }
    
  } catch (err) {
    const errorMessage = (err as Error).message;
    addDebugInfo(`💥 Generation failed: ${errorMessage}`);
    console.error('Generation failed:', err);
    setError(`Failed to generate documentation: ${errorMessage}`);
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

  const downloadDocs = () => {
    if (!documentation) return;
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);

    const markdownContent = `# ${documentation.name} Documentation

*Version: ${documentation.version} | License: ${documentation.license}*

## Description
${documentation.description}

## Architecture
${documentation.architecture}

## Design Patterns
${documentation.designPatterns.length > 0 ? documentation.designPatterns.map(pattern => `* ${pattern}`).join('\n') : 'No specific design patterns identified.'}

## Inheritance Structure
${documentation.inheritanceStructure.length > 0 ? documentation.inheritanceStructure.map(inherit => `* ${inherit}`).join('\n') : 'No inheritance detected.'}

## Dependencies
${documentation.dependencies.length > 0 ? documentation.dependencies.map(dep => `* ${dep}`).join('\n') : 'No external dependencies.'}

## Interface Compliance
${documentation.interfaceCompliance.length > 0 ? documentation.interfaceCompliance.map(iface => `* ${iface}`).join('\n') : 'No standard interfaces implemented.'}

## Usage Examples
${documentation.usageExamples.length > 0 ? documentation.usageExamples.map(example => `\`\`\`solidity\n${example}\n\`\`\``).join('\n\n') : 'No usage examples available.'}

## Constructor
**Description:** ${documentation.constructorDetails?.description || 'No constructor details available'}

**Parameters:**
${documentation.constructorDetails?.params?.length ? documentation.constructorDetails.params.map(param => `* \`${param.name}\` (\`${param.type}\`): ${param.description}`).join('\n') : '* No constructor parameters'}

**Initialization Steps:**
${documentation.constructorDetails?.initialization?.length ? documentation.constructorDetails.initialization.map(step => `* ${step}`).join('\n') : '* No specific initialization steps'}

---

## State Variables
${documentation.variables?.map(variable => `
### \`${variable.name}\`
* **Type:** \`${variable.type}\`
* **Visibility:** ${variable.visibility}
* **Description:** ${variable.description}
* **Purpose:** ${variable.purpose || 'Not specified'}
${variable.defaultValue ? `* **Default Value:** \`${variable.defaultValue}\`` : ''}
`).join('\n')}

---

## Modifiers
${documentation.modifiers?.length ? documentation.modifiers.map(modifier => `
### \`${modifier.name}\`
**Purpose:** ${modifier.purpose}

**Description:** ${modifier.description}

**Parameters:**
${modifier.params.length ? modifier.params.map(param => `* \`${param.name}\` (\`${param.type}\`): ${param.description}`).join('\n') : '* None'}

**Applied To:** ${modifier.appliedTo.length ? modifier.appliedTo.join(', ') : 'No functions specified'}
`).join('\n') : 'No custom modifiers found.'}

---

## Functions
${documentation.functions?.map(func => `
### \`${func.name}\`
* **Visibility:** ${func.visibility}
* **Mutability:** ${func.mutability}
* **Modifiers:** ${func.modifiers.length ? func.modifiers.map(m => `\`${m}\``).join(', ') : 'None'}

**Description:**
${func.description}

**Parameters:**
${func.params.length ? func.params.map(param => `* \`${param.name}\` (\`${param.type}\`): ${param.description}`).join('\n') : '* None'}

**Returns:**
${func.returns.length ? func.returns.map(ret => `* \`${ret.name || 'unnamed'}\` (\`${ret.type}\`): ${ret.description}`).join('\n') : '* None'}

**Reverts If:**
${func.reverts.length ? func.reverts.map(revert => `* ${revert}`).join('\n') : '* No specific revert conditions documented'}

${func.examples?.length ? `**Usage Examples:**\n${func.examples.map(example => `\`\`\`solidity\n${example}\n\`\`\``).join('\n\n')}` : ''}

${func.gasOptimization?.length ? `**Gas Optimization Notes:**\n${func.gasOptimization.map(opt => `* ${opt}`).join('\n')}` : ''}

${func.notes?.length ? `**Implementation Notes:**\n${func.notes.map(note => `* ${note}`).join('\n')}` : ''}
`).join('\n')}

---

## Events
${documentation.events?.map(event => `
### \`${event.name}\`
**Description:** ${event.description}

**Parameters:**
${event.params.length ? event.params.map(param => `* \`${param.name}\` (\`${param.type}\`)${param.indexed ? ' - *indexed*' : ''}: ${param.description || 'No description'}`).join('\n') : '* None'}

${event.useCases?.length ? `**Use Cases:**\n${event.useCases.map(useCase => `* ${useCase}`).join('\n')}` : ''}

${event.emittedBy?.length ? `**Emitted By:** ${event.emittedBy.join(', ')}` : ''}
`).join('\n')}

---

## Deployment Notes
${documentation.deploymentNotes.length > 0 ? documentation.deploymentNotes.map(note => `* ${note}`).join('\n') : 'No specific deployment considerations noted.'}
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentation.name.toLowerCase().replace(/\s/g, '-')}-documentation.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <div className="min-h-screen py-12 bg-zinc-900 text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
            <span className="text-white text-sm font-semibold">Smart Contract Documentation Generator</span>
          </div>
          <h1 className="text-3xl font-mono font-bold mb-4 text-white">Comprehensive Contract Documentation</h1>
          <p className="text-gray-400">Generate detailed, developer-focused documentation with AI-powered analysis and contextual examples</p>
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
            <div className="bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg">
              <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                <FileText className="text-white" size={20} weight="duotone" />
                <span className="font-mono text-white">Contract Input</span>
              </div>
              <textarea
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
                placeholder="Paste your smart contract code here..."
                className="w-full h-[600px] bg-transparent p-6 font-mono text-sm resize-none focus:outline-none focus:border-white focus:ring-1 focus:ring-white/50 transition-all duration-200 text-white custom-scrollbar"
              />
            </div>
            <button
              onClick={generateDocs}
              disabled={!contractCode || isGenerating}
              className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-200 ${isGenerating || !contractCode
                ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                }`}
            >
              {isGenerating ? (
                <>
                  <CircleNotch className="animate-spin" size={20} weight="bold" />
                  Generating Documentation...
                </>
              ) : (
                <>
                  <BookOpen size={20} weight="fill" />
                  Generate Comprehensive Documentation
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col">
            <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-white/50 transition-colors duration-300 shadow-lg">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Article className="text-white" size={20} weight="duotone" />
                  <span className="font-mono text-white">Documentation</span>
                </div>
                {documentation && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(documentation, null, 2))}
                      className="text-white hover:text-gray-300 text-sm flex items-center gap-1 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-white/10"
                    >
                      {copySuccess ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                      {copySuccess ? 'Copied!' : 'Copy JSON'}
                    </button>
                    <button
                      onClick={downloadDocs}
                      className="text-white hover:text-gray-300 text-sm flex items-center gap-1 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-white/10"
                    >
                      {downloadSuccess ? <Check size={16} weight="bold" /> : <DownloadSimple size={16} weight="bold" />}
                      {downloadSuccess ? 'Downloaded!' : 'Download MD'}
                    </button>
                  </div>
                )}
              </div>

              <div className="h-[600px] overflow-auto p-6 custom-scrollbar">
                {documentation ? (
                  <div className="space-y-6">
                    {/* Header */}
                    <div>
                      <h2 className="text-2xl font-bold mb-2 text-white">{documentation.name}</h2>
                      <p className="text-gray-300 mb-3">{documentation.description}</p>
                      <div className="flex gap-4 mb-4">
                        <span className="text-sm bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/20">v{documentation.version}</span>
                        <span className="text-sm bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/20">{documentation.license} License</span>
                      </div>
                    </div>

                    {/* Architecture */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                        <Archive className="text-white" size={20} weight="duotone" />
                        Architecture
                      </h3>
                      <p className="text-gray-300 text-sm bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        {documentation.architecture}
                      </p>
                    </div>

                    {/* Design Patterns */}
                    {documentation.designPatterns && documentation.designPatterns.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                          <Stack className="text-blue-400" size={20} weight="duotone" />
                          Design Patterns
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {documentation.designPatterns.map((pattern, i) => (
                            <span key={i} className="text-sm bg-blue-500/10 text-blue-300 px-3 py-1 rounded-full border border-blue-500/20">
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inheritance Structure */}
                    {documentation.inheritanceStructure && documentation.inheritanceStructure.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                          <Code className="text-purple-400" size={20} weight="duotone" />
                          Inheritance Structure
                        </h3>
                        <ul className="space-y-1">
                          {documentation.inheritanceStructure.map((inherit, i) => (
                            <li key={i} className="text-gray-300 text-sm bg-purple-500/10 border border-purple-500/20 rounded p-2">
                              {inherit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Usage Examples */}
                    {documentation.usageExamples && documentation.usageExamples.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                          <Lightning className="text-yellow-400" size={20} weight="duotone" />
                          Usage Examples
                        </h3>
                        <div className="space-y-3">
                          {documentation.usageExamples.map((example, i) => (
                            <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded p-3">
                              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{example}</pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Constructor Details */}
                    {documentation.constructorDetails && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                          <Robot className="text-green-400" size={20} weight="duotone" />
                          Constructor
                        </h3>
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded p-4">
                          <p className="text-gray-300 text-sm mb-3">{documentation.constructorDetails.description}</p>
                          
                          {documentation.constructorDetails.params.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-white font-semibold mb-2">Parameters:</h4>
                              {documentation.constructorDetails.params.map((param, i) => (
                                <div key={i} className="ml-3 text-sm mb-1">
                                  <span className="text-green-300 font-mono">{param.name}</span>
                                  <span className="text-gray-500"> ({param.type})</span>
                                  {param.description && <span className="text-gray-300"> - {param.description}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {documentation.constructorDetails.initialization.length > 0 && (
                            <div>
                              <h4 className="text-white font-semibold mb-2">Initialization Steps:</h4>
                              <ul className="space-y-1">
                                {documentation.constructorDetails.initialization.map((step, i) => (
                                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                    <span className="text-green-400">•</span>
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Modifiers */}
                    {documentation.modifiers && documentation.modifiers.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                          <ListBullets className="text-orange-400" size={20} weight="duotone" />
                          Modifiers ({documentation.modifiers.length})
                        </h3>
                        <div className="space-y-4">
                          {documentation.modifiers.map((modifier, index) => (
                            <div key={index} className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/70 hover:border-white/50 transition-colors duration-200">
                              <div className="font-mono text-white mb-2">{modifier.name}</div>
                              <p className="text-sm text-gray-300 mb-3">{modifier.description}</p>
                              <p className="text-sm text-orange-300 mb-3"><strong>Purpose:</strong> {modifier.purpose}</p>
                              
                              {modifier.params.length > 0 && (
                                <div className="bg-gray-900/50 rounded p-3 mb-3">
                                  <div className="text-sm text-gray-300 mb-2 font-semibold">Parameters:</div>
                                  {modifier.params.map((param, i) => (
                                    <div key={i} className="text-sm flex items-start gap-2 mb-1">
                                      <span className="text-white font-mono">{param.name}</span>
                                      <span className="text-gray-500">({param.type})</span>
                                      {param.description && <span className="text-gray-300"> - {param.description}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {modifier.appliedTo.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-gray-300 font-semibold">Applied to: </span>
                                  <span className="text-orange-200">{modifier.appliedTo.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Functions */}
                    {documentation.functions && documentation.functions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <FunctionIcon className="text-white" size={20} weight="duotone" />
                          <h3 className="text-lg font-semibold text-white">Functions ({documentation.functions.length})</h3>
                        </div>
                        <div className="space-y-4">
                          {documentation.functions.map((func, index) => (
                            <div key={index} className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/70 hover:border-white/50 transition-colors duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-white text-lg">{func.name}</span>
                                <span className="text-sm px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/20">{func.visibility}</span>
                                <span className="text-sm px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">{func.mutability}</span>
                              </div>
                              <p className="text-sm text-gray-300 mb-3">{func.description}</p>

                              {/* Parameters */}
                              {func.params.length > 0 && (
                                <div className="mt-2 bg-gray-900/50 rounded p-3">
                                  <div className="text-sm text-gray-300 mb-2 font-semibold">Parameters:</div>
                                  {func.params.map((param, i) => (
                                    <div key={i} className="ml-3 text-sm flex flex-col mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-mono">{param.name}</span>
                                        <span className="text-gray-500">({param.type})</span>
                                      </div>
                                      {param.description && (
                                        <span className="text-gray-300 text-xs ml-2 mt-1">{param.description}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Returns */}
                              {func.returns.length > 0 && (
                                <div className="mt-2 bg-gray-900/50 rounded p-3">
                                  <div className="text-sm text-gray-300 mb-2 font-semibold">Returns:</div>
                                  {func.returns.map((ret, i) => (
                                    <div key={i} className="ml-3 text-sm flex flex-col mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-mono">{ret.name || 'unnamed'}</span>
                                        <span className="text-gray-500">({ret.type})</span>
                                      </div>
                                      {ret.description && (
                                        <span className="text-gray-300 text-xs ml-2 mt-1">{ret.description}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reverts */}
                              {func.reverts.length > 0 && (
                                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded p-3">
                                  <div className="text-sm text-red-300 font-semibold mb-2">Reverts If:</div>
                                  {func.reverts.map((revert, i) => (
                                    <div key={i} className="text-sm text-red-200 mb-1">• {revert}</div>
                                  ))}
                                </div>
                              )}

                              {/* Examples */}
                              {func.examples && func.examples.length > 0 && (
                                <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded p-3">
                                  <div className="text-sm text-green-300 font-semibold mb-2">Usage Examples:</div>
                                  {func.examples.map((example, i) => (
                                    <div key={i} className="text-sm text-green-200 mb-2 font-mono bg-gray-900/50 p-2 rounded">
                                      {example}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Gas Optimization */}
                              {func.gasOptimization && func.gasOptimization.length > 0 && (
                                <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                                  <div className="text-sm text-yellow-300 font-semibold mb-2">Gas Optimization:</div>
                                  {func.gasOptimization.map((opt, i) => (
                                    <div key={i} className="text-sm text-yellow-200 mb-1">• {opt}</div>
                                  ))}
                                </div>
                              )}

                              {/* Implementation Notes */}
                              {func.notes && func.notes.length > 0 && (
                                <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded p-3">
                                  <div className="text-sm text-blue-300 font-semibold mb-2">Implementation Notes:</div>
                                  {func.notes.map((note, i) => (
                                    <div key={i} className="text-sm text-blue-200 mb-1">• {note}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Events */}
                    {documentation.events && documentation.events.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Bell className="text-white" size={20} weight="duotone" />
                          <h3 className="text-lg font-semibold text-white">Events ({documentation.events.length})</h3>
                        </div>
                        <div className="space-y-4">
                          {documentation.events.map((event, index) => (
                            <div key={index} className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/70 hover:border-white/50 transition-colors duration-200">
                              <div className="font-mono text-white mb-2">{event.name}</div>
                              <p className="text-sm text-gray-300 mb-3">{event.description}</p>
                              
                              {/* Event Parameters */}
                              {event.params.length > 0 && (
                                <div className="bg-gray-900/50 rounded p-3 mb-3">
                                  <div className="text-sm text-gray-300 mb-2 font-semibold">Parameters:</div>
                                  {event.params.map((param, i) => (
                                    <div key={i} className="text-sm flex items-center mb-1">
                                      <span className="text-white font-mono">{param.name}</span>
                                      <span className="text-gray-500 mx-1">({param.type})</span>
                                      {param.indexed && (
                                        <span className="text-sm px-2 py-0.5 ml-2 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">indexed</span>
                                      )}
                                      {param.description && (
                                        <span className="text-gray-300 text-xs ml-2"> - {param.description}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Use Cases */}
                              {event.useCases && event.useCases.length > 0 && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 mb-3">
                                  <div className="text-sm text-blue-300 font-semibold mb-2">Use Cases:</div>
                                  {event.useCases.map((useCase, i) => (
                                    <div key={i} className="text-sm text-blue-200 mb-1">• {useCase}</div>
                                  ))}
                                </div>
                              )}

                              {/* Emitted By */}
                              {event.emittedBy && event.emittedBy.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-gray-300 font-semibold">Emitted by: </span>
                                  <span className="text-purple-200">{event.emittedBy.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* State Variables */}
                    {documentation.variables && documentation.variables.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Database className="text-white" size={20} weight="duotone" />
                          <h3 className="text-lg font-semibold text-white">State Variables ({documentation.variables.length})</h3>
                        </div>
                        <div className="space-y-4">
                          {documentation.variables.map((variable, index) => (
                            <div key={index} className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/70 hover:border-white/50 transition-colors duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-white">{variable.name}</span>
                                <div className="flex space-x-2">
                                  <span className="text-sm px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/20">{variable.type}</span>
                                  <span className="text-sm px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">{variable.visibility}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-300 mb-2">{variable.description}</p>
                              
                              {variable.purpose && (
                                <p className="text-sm text-blue-300 mb-2"><strong>Purpose:</strong> {variable.purpose}</p>
                              )}
                              
                              {variable.defaultValue && (
                                <p className="text-sm text-green-300"><strong>Default Value:</strong> <code className="bg-gray-900/50 px-1 rounded">{variable.defaultValue}</code></p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interface Compliance */}
                    {documentation.interfaceCompliance && documentation.interfaceCompliance.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                          <Check className="text-green-400" size={20} weight="duotone" />
                          Interface Compliance
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {documentation.interfaceCompliance.map((iface, i) => (
                            <span key={i} className="text-sm bg-green-500/10 text-green-300 px-3 py-1 rounded-full border border-green-500/20">
                              {iface}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deployment Notes */}
                    {documentation.deploymentNotes && documentation.deploymentNotes.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                          <Info className="text-cyan-400" size={20} weight="duotone" />
                          Deployment Notes
                        </h3>
                        <ul className="space-y-2">
                          {documentation.deploymentNotes.map((note, i) => (
                            <li key={i} className="text-gray-300 text-sm flex items-start gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded p-3">
                              <Info className="text-cyan-400 mt-0.5 flex-shrink-0" size={16} weight="fill" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
                      <BookOpen size={64} className="text-white relative z-10 mb-6" weight="duotone" />
                    </div>
                    <h3 className="text-xl font-mono mb-4">Comprehensive Documentation Generator</h3>
                    <p className="text-gray-500 mb-6 text-center max-w-md">
                      Paste your contract code and generate detailed technical documentation with AI-powered analysis and contextual examples
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Architecture Analysis
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Design Patterns
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                        Usage Examples
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                        Gas Optimization
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        Implementation Notes
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Deployment Guidance
                      </span>
                    </div>
                    
                    {/* Documentation Status Indicator */}
                    <div className="mt-6 flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-gray-400">Documentation Engine Ready</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default ContractDocsGenerator;