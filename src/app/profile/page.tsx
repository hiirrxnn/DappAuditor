'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { 
  Star,
  ArrowSquareOut,
  CircleNotch,
  Wallet,
  User,
  ChartBar,
  ListChecks,
  Lightning,
  Warning,
  CheckCircle,
  Copy
} from 'phosphor-react';
import Image from 'next/image';
import { CHAIN_CONFIG } from '@/utils/web3';
import { CONTRACT_ADDRESSES, AUDIT_REGISTRY_ABI } from '@/utils/contracts';

interface AuditStats {
  totalAudits: number;
  averageStars: number;
  chainBreakdown: Record<string, number>;
  recentAudits: UserAudit[];
}

interface UserAudit {
  contractHash: string;
  stars: number;
  summary: string;
  timestamp: number;
  chain: keyof typeof CHAIN_CONFIG;
}

interface ContractInfo {
  isDeployed: boolean;
  totalContracts: number;
  blockNumber: number;
  contractAddress: string;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<AuditStats>({
    totalAudits: 0,
    averageStars: 0,
    chainBreakdown: {},
    recentAudits: []
  });
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const verifyContractDeployment = async () => {
    addDebugInfo('🔍 Verifying contract deployment...');
    
    const contractAddress = CONTRACT_ADDRESSES.sepolia;
    addDebugInfo(`Contract address: ${contractAddress}`);
    
    // Try multiple RPC providers
    const rpcUrls = [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.drpc.org',
      'https://rpc2.sepolia.org',
      'https://eth-sepolia.public.blastapi.io'
    ];
    
    let provider: ethers.JsonRpcProvider | null = null;
    
    for (const rpcUrl of rpcUrls) {
      try {
        addDebugInfo(`🌐 Trying RPC: ${rpcUrl}`);
        const testProvider = new ethers.JsonRpcProvider(rpcUrl, {
          name: 'sepolia',
          chainId: 11155111
        });
        
        const blockNumber = await Promise.race([
          testProvider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]) as number;
        
        addDebugInfo(`✅ Connected to ${rpcUrl}, block: ${blockNumber}`);
        provider = testProvider;
        break;
      } catch (rpcError) {
        addDebugInfo(`❌ RPC failed: ${(rpcError as Error).message.slice(0, 50)}...`);
      }
    }
    
    if (!provider) {
      throw new Error('All RPC providers failed');
    }
    
    // Check contract deployment
    const code = await provider.getCode(contractAddress);
    const blockNumber = await provider.getBlockNumber();
    
    if (code === '0x') {
      setContractInfo({
        isDeployed: false,
        totalContracts: 0,
        blockNumber,
        contractAddress
      });
      throw new Error(`❌ Contract not found at ${contractAddress}`);
    }
    
    addDebugInfo('✅ Contract is deployed!');
    
    // Test contract functions
    const contract = new ethers.Contract(contractAddress, AUDIT_REGISTRY_ABI, provider);
    
    try {
      const totalContracts = await Promise.race([
        contract.getTotalContracts(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
      ]) as bigint;
      
      const totalContractsNum = Number(totalContracts);
      addDebugInfo(`📊 Total contracts in registry: ${totalContractsNum}`);
      
      setContractInfo({
        isDeployed: true,
        totalContracts: totalContractsNum,
        blockNumber,
        contractAddress
      });
      
      return { provider, contract, totalContractsNum };
    } catch (contractError) {
      addDebugInfo(`❌ Contract function call failed: ${(contractError as Error).message}`);
      throw new Error('Contract deployed but functions not working properly');
    }
  };

  const fetchUserStats = async (userAddress: string) => {
    setIsLoading(true);
    setError(null);
    setDebugInfo([]);
    
    try {
      addDebugInfo(`👤 Fetching stats for: ${userAddress}`);
      
      const { provider, contract, totalContractsNum } = await verifyContractDeployment();
      
      if (totalContractsNum === 0) {
        addDebugInfo('ℹ️ Contract is empty - no audits registered yet');
        setStats({
          totalAudits: 0,
          averageStars: 0,
          chainBreakdown: { sepolia: 0 },
          recentAudits: []
        });
        return;
      }
      
      addDebugInfo(`🔍 Searching for audits by ${userAddress.slice(0, 8)}...`);
      
      const allAudits: UserAudit[] = [];
      const chainCounts: Record<string, number> = {};
      let totalStars = 0;
      
      const BATCH_SIZE = 5;
      let processed = 0;
      
      while (processed < totalContractsNum) {
        try {
          addDebugInfo(`📦 Fetching batch ${processed}-${Math.min(processed + BATCH_SIZE, totalContractsNum)}`);
          
          const {
            contractHashes,
            stars,
            summaries,
            auditors,
            timestamps
          } = await Promise.race([
            contract.getAllAudits(processed, BATCH_SIZE),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000))
          ]) as any;
          
          addDebugInfo(`📋 Got ${contractHashes.length} audits in batch`);
          
          // Filter for user's audits
          for (let i = 0; i < contractHashes.length; i++) {
            if (auditors[i].toLowerCase() === userAddress.toLowerCase()) {
              addDebugInfo(`🎯 Found user audit: ${contractHashes[i].slice(0, 8)}... (${Number(stars[i])} stars)`);
              
              allAudits.push({
                contractHash: contractHashes[i],
                stars: Number(stars[i]),
                summary: summaries[i],
                timestamp: Number(timestamps[i]),
                chain: 'sepolia'
              });
              
              chainCounts.sepolia = (chainCounts.sepolia || 0) + 1;
              totalStars += Number(stars[i]);
            }
          }
          
          processed += contractHashes.length;
          
          if (contractHashes.length < BATCH_SIZE) {
            addDebugInfo('📄 Reached end of data');
            break;
          }
          
        } catch (batchError) {
          addDebugInfo(`❌ Batch error: ${(batchError as Error).message}`);
          processed += BATCH_SIZE;
        }
      }
      
      const totalAudits = allAudits.length;
      addDebugInfo(`🎯 Found ${totalAudits} audits for this user`);
      
      setStats({
        totalAudits,
        averageStars: totalAudits > 0 ? totalStars / totalAudits : 0,
        chainBreakdown: chainCounts,
        recentAudits: allAudits
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5)
      });
      
      if (totalAudits === 0) {
        addDebugInfo('💡 No audits found for this address');
        addDebugInfo('💡 Go to /audit page to create some audit records');
      }
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      addDebugInfo(`💥 Error: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchUserStats(address);
    } else {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center space-y-6 mt-20">
            <div className="relative w-20 h-20 mb-2">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
              <Wallet size={80} className="text-white relative z-10" weight="duotone" />
            </div>
            <h2 className="text-2xl font-mono">Connect Your Wallet</h2>
            <p className="text-gray-400 max-w-md text-center">Connect your wallet to view your audit profile and see your security verification statistics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-gray-900/50 border border-gray-800 hover:border-white/30 transition-colors duration-300 rounded-lg p-6 mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
                <span className="text-white text-sm font-semibold">Auditor Dashboard</span>
              </div>
              <h1 className="text-3xl font-mono font-bold mb-2">Auditor Profile</h1>
              <div className="flex items-center space-x-2 text-gray-400 bg-gray-800/50 rounded-lg px-3 py-1.5 border border-gray-700/50 inline-flex">
                <User size={16} className="text-white" weight="bold" />
                <span className="font-mono">{address}</span>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <ArrowSquareOut size={16} weight="bold" />
                </a>
              </div>
            </div>
            <button
              onClick={() => address && fetchUserStats(address)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
              title="Refresh Stats"
            >
              <CircleNotch 
                size={24} 
                weight="bold"
                className={`text-white ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Contract Status */}
        {contractInfo && (
          <div className={`mb-8 px-4 py-3 rounded-lg border flex items-start gap-3 ${
            contractInfo.isDeployed 
              ? 'bg-green-500/10 border-green-500/20 text-green-300' 
              : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}>
            {contractInfo.isDeployed ? (
              <CheckCircle size={20} weight="bold" className="mt-0.5 flex-shrink-0" />
            ) : (
              <Warning size={20} weight="bold" className="mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-semibold mb-1">
                {contractInfo.isDeployed ? '✅ Contract Deployed Successfully!' : '❌ Contract Not Found'}
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span>Address:</span>
                  <code className="bg-black/20 px-2 py-0.5 rounded font-mono text-xs">
                    {contractInfo.contractAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(contractInfo.contractAddress)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div>Network: Sepolia Testnet (Block #{contractInfo.blockNumber})</div>
                {contractInfo.isDeployed && (
                  <div>Total Audits in Registry: {contractInfo.totalContracts}</div>
                )}
              </div>
              {contractInfo.isDeployed && contractInfo.totalContracts === 0 && (
                <div className="mt-2 text-yellow-300 text-sm">
                  💡 Contract is empty. Go to <a href="/audit" className="underline">/audit</a> to create some audit records!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug Information */}
        {debugInfo.length > 0 && (
          <details className="mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <summary className="cursor-pointer text-white font-mono text-sm">
              Debug Information ({debugInfo.length} messages)
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-xs text-gray-400 font-mono mb-1">
                  {info}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-start gap-2">
            <Warning size={20} weight="bold" className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Profile Loading Error</div>
              <div className="text-sm">{error}</div>
              <button 
                onClick={() => address && fetchUserStats(address)}
                className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center">
              <CircleNotch size={40} className="animate-spin text-white mb-4" weight="bold" />
              <span className="text-white">Verifying deployment and loading data...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Stats Cards */}
            <div className="space-y-8">
              {/* Overall Stats */}
              <div className="bg-gray-900/50 border border-gray-800 hover:border-white/30 transition-colors duration-300 rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <ChartBar size={20} className="text-white" weight="duotone" />
                  <h2 className="text-xl font-mono">Overall Statistics</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/50 hover:border-white/30 transition-colors duration-300">
                    <div className="text-3xl font-bold text-white">{stats.totalAudits}</div>
                    <div className="text-sm text-white mt-1">Total Audits</div>
                  </div>
                  <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/50 hover:border-white/30 transition-colors duration-300">
                    <div className="flex items-center space-x-1">
                      <span className="text-3xl font-bold text-white">
                        {stats.averageStars.toFixed(1)}
                      </span>
                      <Star weight="fill" className="text-white" size={20} />
                    </div>
                    <div className="text-sm text-white mt-1">Average Rating</div>
                  </div>
                </div>
              </div>

              {/* Chain Distribution */}
              <div className="bg-gray-900/50 border border-gray-800 hover:border-white/30 transition-colors duration-300 rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Lightning size={20} className="text-white" weight="duotone" />
                  <h2 className="text-xl font-mono">Chain Distribution</h2>
                </div>
                <div className="space-y-4">
                  {Object.entries(stats.chainBreakdown).length > 0 ? (
                    Object.entries(stats.chainBreakdown).map(([chain, count]) => (
                      <div key={chain} className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-white/20 rounded-full blur-[2px]"></div>
                          <Image
                            src={CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG].iconPath}
                            alt={CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG].chainName}
                            width={24}
                            height={24}
                            className="rounded-full relative z-10"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span>{CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG].chainName}</span>
                            <span className="text-gray-400 px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-xs border border-white/20">{count} audits</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white"
                              style={{
                                width: `${stats.totalAudits > 0 ? (count / stats.totalAudits) * 100 : 0}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      No audit history found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Audits */}
            <div className="bg-gray-900/50 border border-gray-800 hover:border-white/30 transition-colors duration-300 rounded-lg p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks size={20} className="text-white" weight="duotone" />
                <h2 className="text-xl font-mono">Recent Audits</h2>
              </div>
              <div className="space-y-4">
                {stats.recentAudits.length > 0 ? (
                  stats.recentAudits.map((audit, index) => (
                    <div
                      key={`${audit.contractHash}-${audit.chain}-${index}`}
                      className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/50 hover:border-white/30 transition-colors duration-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-mono text-sm px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
                          {audit.contractHash.slice(0, 8)}...{audit.contractHash.slice(-6)}
                        </div>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              weight={i < audit.stars ? "fill" : "regular"}
                              className={i < audit.stars ? "text-white" : "text-gray-600"}
                              size={16}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 mb-3">{audit.summary}</div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <div className="absolute inset-0 bg-white/20 rounded-full blur-[1px]"></div>
                            <Image
                              src={CHAIN_CONFIG[audit.chain].iconPath}
                              alt={CHAIN_CONFIG[audit.chain].chainName}
                              width={16}
                              height={16}
                              className="rounded-full relative z-10"
                            />
                          </div>
                          <span className="text-gray-400">{CHAIN_CONFIG[audit.chain].chainName}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-900/80 text-gray-400 border border-gray-700/50">
                          {new Date(audit.timestamp * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex flex-col items-center">
                      <ListChecks size={48} className="text-white/50 mb-4" weight="duotone" />
                      <p className="text-gray-400 mb-2">No audits found for this address</p>
                      <a 
                        href="/audit" 
                        className="text-xs px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
                      >
                        Go to Audit Page →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}