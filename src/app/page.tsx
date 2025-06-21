'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import AOS from 'aos';
import 'aos/dist/aos.css';
import {
  Shield,
  ArrowRight,
  Star,
  Code,
  Lightning,
  TwitterLogo,
  GithubLogo,
  DiscordLogo,
  TelegramLogo,
  FileSearch,
  Robot,
  Cube,
  FileText,
  TestTube,
} from 'phosphor-react';
import Image from 'next/image';
import Link from 'next/link';

// Simplified chain config to only include Sepolia testnet
const CHAIN_CONFIG = {
  sepolia: {
    chainId: '0xaa36a7', // 11155111 in hex
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconPath: '/chains/ethereum.svg'
  }
};

interface Audit {
  contractHash: string;
  stars: number;
  summary: string;
  auditor: string;
  timestamp: number;
  chain: string;
}

const features = [
  {
    icon: Shield,
    title: 'AI-Powered Analysis',
    description: 'Advanced smart contract analysis powered by Finetuned AI'
  },
  {
    icon: Lightning,
    title: 'Ethereum Testnet Support',
    description: 'Audit smart contracts on Sepolia testnet'
  },
  {
    icon: Code,
    title: 'On-Chain Verification',
    description: 'All audit reports are stored permanently on the blockchain'
  },
  {
    icon: FileText,
    title: 'Documentation Generation',
    description: 'AI-powered documentation for Solidity contracts'
  },
  {
    icon: TestTube,
    title: 'Test Suite Generation',
    description: 'Multi-framework test case generation'
  },
];

const recentAudits: Audit[] = [
  {
    contractHash: '0x123...abc',
    stars: 5,
    summary: 'No critical vulnerabilities found. Code follows best practices.',
    auditor: '0xABc...123',
    timestamp: 1703116800,
    chain: 'sepolia'
  },
  {
    contractHash: '0x456...def',
    stars: 4,
    summary: 'Minor optimizations suggested. Overall secure implementation.',
    auditor: '0xDEf...456',
    timestamp: 1703030400,
    chain: 'sepolia'
  },
  {
    contractHash: '0x789...ghi',
    stars: 5,
    summary: 'Excellent implementation with robust security measures.',
    auditor: '0xGHi...789',
    timestamp: 1702944000,
    chain: 'sepolia'
  }
];

const steps = [
  {
    icon: FileSearch,
    title: 'Submit Contract',
    description: 'Paste your Solidity smart contract code into our platform'
  },
  {
    icon: Robot,
    title: 'AI Analysis',
    description: 'Our Finetuned AI analyzes your code for vulnerabilities'
  },
  {
    icon: FileText,
    title: 'Generate Docs',
    description: 'Generate comprehensive contract documentation with a single click'
  },
  {
    icon: TestTube,
    title: 'Test Suite',
    description: 'Generate test suite with best practices for popular frameworks'
  },
  {
    icon: Cube,
    title: 'On-Chain Report',
    description: 'Audit report is permanently stored on the blockchain'
  },
  {
    icon: Shield,
    title: 'Verification',
    description: 'Get your smart contract verified and secure'
  }
];

export default function Home() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic'
    });

    const handleMouseMove = (e: MouseEvent) => {
      const elements = document.getElementsByClassName('hover-gradient-effect');
      Array.from(elements).forEach((element) => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        htmlElement.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        htmlElement.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/10 via-[#0A0B0D] to-gray-900/10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-7xl font-mono font-bold mb-6">
                NEXT-GEN<br /> SMART CONTRACT<br />
                <span className="text-white">SECURITY</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8 max-w-xl">
                Secure your smart contracts with AI-powered analysis, documentation, and on-chain verification. Get instant security audits powered by Finetuned AI, now optimized for Sepolia testnet.
              </p>
              <div className="flex gap-4">
                <Link href="/audit">
                  <button className="hover-gradient-effect px-6 py-3 bg-dark-100 hover:bg-dark-200 text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-2">
                    Start Audit <ArrowRight weight="bold" />
                  </button>
                </Link>
                <Link href="/reports">
                  <button className="hover-gradient-effect px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200">
                    View Reports
                  </button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden lg:block relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-lg" />
              <Image
                src="/screenshot.png"
                alt="AuditFi Interface"
                width={600}
                height={400}
                className="rounded-lg shadow-2xl border border-gray-800"
                priority={true}
                layout="responsive"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-gray-900/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
              <span className="text-white text-sm font-semibold">Simple Process</span>
            </div>
            <h2 className="text-4xl font-bold font-mono mb-4">
              How It <span className="text-white">Works</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Secure your smart contracts with our streamlined six-step process
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                data-aos="fade-up"
                data-aos-delay={index * 100}
                className="relative hover-gradient-effect bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-white/50 transition-all duration-300 hover:shadow-lg hover:shadow-white/10"
              >
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-dark-100 rounded-full flex items-center justify-center font-bold text-white shadow-lg shadow-white/20">
                  {index + 1}
                </div>
                <step.icon size={36} className="text-white mb-4" weight="duotone" />
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
                {index < 5 && (
                  <ArrowRight
                    className="absolute -right-4 top-1/2 transform -translate-y-1/2 text-white"
                    size={24}
                    weight="bold"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gray-500/10 rounded-full filter blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
              <span className="text-white text-sm font-semibold">Cutting-edge Solutions</span>
            </div>
            <h2 className="text-4xl font-bold font-mono mb-4">
              Powered by <span className="text-white">Advanced Technology</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Combining AI analysis with blockchain verification for comprehensive smart contract security
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                data-aos="fade-up"
                data-aos-delay={index * 100}
                className="hover-gradient-effect bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-white/50 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <feature.icon size={36} className="text-white mb-4" weight="duotone" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Network Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900/95 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
              <span className="text-white text-sm font-semibold">Network Support</span>
            </div>
            <h2 className="text-4xl font-bold font-mono mb-4">
              <span className="text-white">Ethereum</span> Network Integration
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Optimized for the Ethereum ecosystem with native support for ETH tokens on Sepolia testnet
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <motion.div
              data-aos="fade-up"
              className="hover-gradient-effect flex items-center space-x-6 bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 hover:border-white/50 transition-all duration-300 hover:shadow-lg hover:shadow-white/10"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full filter blur-md"></div>
                <Image
                  src="/chains/ethereum.svg"
                  alt="Ethereum Sepolia Network"
                  width={60}
                  height={60}
                  className="rounded-full relative z-10 ring-2 ring-white/50 p-1"
                />
              </div>
              <div>
                <h3 className="font-semibold text-xl mb-1">Sepolia Testnet</h3>
                <p className="text-gray-400">Native Token: <span className="text-white font-semibold">ETH</span></p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-gray-300 flex items-center space-x-1">
                    <span>Block Explorer</span>
                    <ArrowRight size={14} weight="bold" />
                  </a>
                  <a href="https://ethereum.org/en/developers/docs/" target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-gray-300 flex items-center space-x-1">
                    <span>Developer Docs</span>
                    <ArrowRight size={14} weight="bold" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Recent Audits */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-gray-900 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
            <div>
              <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
                <span className="text-white text-sm font-semibold">Verified Security</span>
              </div>
              <h2 className="text-3xl font-mono font-bold">Recent <span className="text-white">Audits</span></h2>
            </div>
            <Link href="/reports" className="text-white hover:text-gray-300 mt-4 md:mt-0 transition-colors duration-200 flex items-center gap-2 border border-white/20 px-4 py-2 rounded-lg hover:bg-white/10">
              View All Audits <ArrowRight weight="bold" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-800/70 bg-gray-900/50 backdrop-blur-md shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50 text-white text-sm">
                    <th className="py-4 px-4 text-left font-mono font-normal">CONTRACT</th>
                    <th className="py-4 px-4 text-left font-mono font-normal">CHAIN</th>
                    <th className="py-4 px-4 text-left font-mono font-normal">RATING</th>
                    <th className="py-4 px-4 text-left font-mono font-normal">SUMMARY</th>
                    <th className="py-4 px-4 text-left font-mono font-normal">AUDITOR</th>
                    <th className="py-4 px-4 text-left font-mono font-normal">DATE</th>
                    <th className="py-4 px-4 w-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((audit, index) => (
                    <tr
                      key={index}
                      className="border-t border-gray-800/30 hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="py-6 px-4 font-mono text-white">
                        {audit.contractHash}
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="absolute inset-0 bg-white/20 rounded-full filter blur-[1px]"></div>
                            <Image
                              src={CHAIN_CONFIG[audit.chain as keyof typeof CHAIN_CONFIG].iconPath}
                              alt={CHAIN_CONFIG[audit.chain as keyof typeof CHAIN_CONFIG].chainName}
                              width={20}
                              height={20}
                              className="rounded-full relative z-10"
                            />
                          </div>
                          <span className="text-gray-300 text-sm">
                            {CHAIN_CONFIG[audit.chain as keyof typeof CHAIN_CONFIG].chainName}
                          </span>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              weight={i < audit.stars ? "fill" : "regular"}
                              className={i < audit.stars ? "text-white" : "text-gray-800"}
                              size={16}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-6 px-4 text-gray-300 max-w-md">
                        <div className="truncate">
                          {audit.summary}
                        </div>
                      </td>
                      <td className="py-6 px-4 font-mono text-gray-200">
                        {audit.auditor}
                      </td>
                      <td className="py-6 px-4 text-gray-300">
                        {new Date(audit.timestamp * 1000).toLocaleDateString()}
                      </td>
                      <td className="py-6 px-4">
                        <Link href={`/reports/${audit.contractHash}`} className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200">
                          <ArrowRight className="w-4 h-4 text-white" weight="bold" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute left-0 top-1/4 w-1/3 h-1/2 bg-white/10 rounded-full filter blur-3xl"></div>
        <div className="absolute right-0 bottom-1/4 w-1/3 h-1/2 bg-gray-500/10 rounded-full filter blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl shadow-white/5 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-gray-500/10" />
            <div className="relative p-16 text-center">
              <h2 className="text-5xl font-bold font-mono mb-6">
                Ready to <span className="text-white">Secure</span> Your Smart Contracts?
              </h2>
              <p className="text-gray-300 text-lg mb-10 max-w-2xl mx-auto">
                Get started with our AI-powered audit platform and ensure your protocol&apos;s security with enterprise-grade analysis tools
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/audit">
                  <button className="hover-gradient-effect px-8 py-4 bg-dark-100 hover:bg-dark-200 text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-white/20">
                    Start Free Audit <ArrowRight weight="bold" />
                  </button>
                </Link>
                <Link href="/documentation">
                  <button className="hover-gradient-effect px-8 py-4 bg-transparent hover:bg-white/10 text-white border border-white/50 font-bold rounded-lg transition-all duration-200 flex items-center gap-2">
                    View Documentation <FileText weight="bold" />
                  </button>
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-gray-400">
                <div className="flex items-center gap-2">
                  <Shield size={18} weight="fill" className="text-white" />
                  <span>100% Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lightning size={18} weight="fill" className="text-white" />
                  <span>Instant Results</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={18} weight="fill" className="text-white" />
                  <span>Detailed Reports</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/80 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Logo and social */}
            <div>
              <div className="flex items-center mb-4">
                <Image src="/favicon.ico" alt="AuditFi Logo" width={32} height={32} />
                <span className="ml-2 text-xl font-bold">AuditFi</span>
              </div>
              <p className="text-gray-400 mb-4">Secure your smart contracts with AI-powered analysis and on-chain verification.</p>
              <div className="flex items-center space-x-6">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                  <GithubLogo size={24} weight="fill" />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                  <TwitterLogo size={24} weight="fill" />
                </a>
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                  <DiscordLogo size={24} weight="fill" />
                </a>
                <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                  <TelegramLogo size={24} weight="fill" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/audit" className="text-gray-400 hover:text-white transition-colors">
                    Start Audit
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className="text-gray-400 hover:text-white transition-colors">
                    Reports
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="text-gray-400 hover:text-white transition-colors">
                    Search
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="https://ethereum.org/en/developers/docs/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    Community
                  </a>
                </li>
                <li>
                  <a href="" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} AuditFi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}