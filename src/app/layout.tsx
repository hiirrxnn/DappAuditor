'use client';

import '@/app/globals.css'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CHAIN_CONFIG, ChainKey } from '@/utils/web3';
import { SignOut, List, X, CaretDown, CaretUp } from 'phosphor-react';
// import Logo from '/public/logo.svg';
import WalletConnectButton from '@/components/WalletConnectButton';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { RainbowKitProviderWrapper } from '@/providers/rainbow-kit-provider';

interface RootLayoutProps {
  children: React.ReactNode;
}

function MainLayout({ children }: RootLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChainMenuOpen, setIsChainMenuOpen] = useState(false);
  
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isNetworkSwitching } = useSwitchChain();
  
  // Find current chain key based on chain id
  const getCurrentChainKey = (): ChainKey => {
    // Default to sepolia if no chainId is detected
    if (!chainId) return 'sepolia';
    
    // Find the matching network in CHAIN_CONFIG
    const networkEntry = Object.entries(CHAIN_CONFIG).find(([_, config]) => 
      config.chainId.toLowerCase() === `0x${chainId.toString(16)}`.toLowerCase()
    );
    
    // Return the matched network or default to sepolia
    return networkEntry ? networkEntry[0] as ChainKey : 'sepolia';
  };
  
  const currentChain = getCurrentChainKey();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#chain-switcher')) {
        setIsChainMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChainSwitch = (chainKey: ChainKey) => {
    if (isNetworkSwitching) return;
    
    const chainId = parseInt(CHAIN_CONFIG[chainKey].chainId, 16);
    switchChain({ chainId });
    setIsChainMenuOpen(false);
  };

  const formatAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="bg-[#0A0B0D] text-white min-h-screen">
      <nav className="fixed w-full z-50 border-b border-gray-800/60 bg-[#0A0B0D]/90 backdrop-blur-xl shadow-md shadow-gray-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-[10px] group-hover:bg-white/30 transition-all duration-300"></div>
                <Image 
                  src="/logo.svg"
                  alt="AuditFi Logo"
                  width={34}
                  height={34}
                  className="relative z-10 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-xl font-mono font-bold text-white group-hover:text-gray-300 transition-colors duration-200">
                AuditFi
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {/* Nav Links */}
              <NavLink href="/contract-builder">Contract-builder</NavLink>
              <NavLink href="/testcase-generator">Test</NavLink>
              <NavLink href="/audit">Audit</NavLink>
              <NavLink href="/reports">Reports</NavLink>
              <NavLink href="/documentor">Documentor</NavLink>
              <NavLink href="/profile">Profile</NavLink>

              {/* Wallet Connection and Chain Switcher */}
              {address ? (
                <>
                  {/* Chain Switcher - Only shown when wallet is connected */}
                  <div className="relative ml-4" id="chain-switcher">
                    <button
                      onClick={() => !isNetworkSwitching && setIsChainMenuOpen(!isChainMenuOpen)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                        isNetworkSwitching 
                          ? 'bg-gray-700 cursor-not-allowed' 
                          : 'bg-gray-800/50 border border-gray-700/50 hover:border-white/50 hover:bg-gray-800/70'
                      } transition-all duration-200`}
                      disabled={isNetworkSwitching}
                    >
                      {CHAIN_CONFIG[currentChain] && (
                        <div className="relative">
                          <div className="absolute inset-0 bg-white/20 rounded-full blur-[5px]"></div>
                          <Image 
                            src={CHAIN_CONFIG[currentChain].iconPath}
                            alt={CHAIN_CONFIG[currentChain].chainName}
                            width={20}
                            height={20}
                            className="rounded-full relative z-10"
                          />
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {isNetworkSwitching ? 'Switching...' : (CHAIN_CONFIG[currentChain]?.chainName || 'Select Network')}
                      </span>
                      {isChainMenuOpen ? (
                        <CaretUp weight="bold" className="w-4 h-4 text-white" />
                      ) : (
                        <CaretDown weight="bold" className="w-4 h-4 text-white" />
                      )}
                    </button>

                    {/* Network Dropdown */}
                    {isChainMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-dark-50/80 backdrop-blur-fancy border border-dark-200 overflow-hidden z-50"
                      >
                        <div className="p-1">
                          {Object.entries(CHAIN_CONFIG).map(([key, chain]) => (
                            <button
                              key={key}
                              onClick={() => handleChainSwitch(key as ChainKey)}
                              className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg ${
                                currentChain === key 
                                  ? 'bg-white/10 text-white border-l-2 border-white' 
                                  : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                              } transition-all duration-200`}
                              disabled={isNetworkSwitching}
                            >
                              <Image 
                                src={chain.iconPath}
                                alt={chain.chainName}
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                              <span>
                                {isNetworkSwitching && currentChain === key ? 'Switching...' : chain.chainName}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </>
              ) : null}
              
              <div className="ml-4">
                <WalletConnectButton />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-colors duration-200"
            >
              {isOpen ? (
                <X weight="bold" className="w-5 h-5 text-white" />
              ) : (
                <List weight="bold" className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-dark-50/90 backdrop-blur-md border-b border-gray-800"
          >
            <div className="px-4 pt-2 pb-3 space-y-1">
              <MobileNavLink href="/contract-builder">Contract-builder</MobileNavLink>
              <MobileNavLink href="/testcase-generator">Test</MobileNavLink>
              <MobileNavLink href="/audit">Audit</MobileNavLink>
              <MobileNavLink href="/reports">Reports</MobileNavLink>
              <MobileNavLink href="/documentor">Documentor</MobileNavLink>
              <MobileNavLink href="/profile">Profile</MobileNavLink>
              
              {address && (
                <div className="pt-4 pb-1">
                  <p className="px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Select Network</p>
                  <div className="mt-2 space-y-1">
                    {Object.entries(CHAIN_CONFIG).map(([key, chain]) => (
                      <button
                        key={key}
                        onClick={() => handleChainSwitch(key as ChainKey)}
                        className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg ${
                          currentChain === key 
                            ? 'bg-white/10 text-white border-l-2 border-white' 
                            : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                        } transition-all duration-200`}
                        disabled={isNetworkSwitching}
                      >
                        <Image 
                          src={chain.iconPath}
                          alt={chain.chainName}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                        <span>
                          {isNetworkSwitching && currentChain === key ? 'Switching...' : chain.chainName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile Wallet Connection */}
              <div className="pt-4 pb-3">
                <div className="px-3">
                  <WalletConnectButton />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <RainbowKitProviderWrapper>
          <MainLayout>{children}</MainLayout>
        </RainbowKitProviderWrapper>
        
        {/* Debug script for MetaMask connection */}
        <script dangerouslySetInnerHTML={{
          __html: `
          if (window.ethereum) {
            console.log('MetaMask is installed!');
            console.log('Ethereum provider:', window.ethereum);
          } else {
            console.log('MetaMask is not installed!');
          }
          `
        }} />
      </body>
    </html>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

// Desktop Navigation Link
function NavLink({ href, children }: NavLinkProps) {
  return (
    <Link 
      href={href} 
      className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
    >
      {children}
    </Link>
  );
}

// Mobile Navigation Link
function MobileNavLink({ href, children }: NavLinkProps) {
  return (
    <Link 
      href={href}
      className="block px-3 py-2 rounded-lg text-base text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors duration-200"
    >
      {children}
    </Link>
  );
}