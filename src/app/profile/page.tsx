'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  Star,
  ArrowSquareOut,
  CircleNotch,
  Wallet,
  User,
  ChartBar,
  ListChecks,
  Lightning
} from 'phosphor-react';
import Image from 'next/image';
import { connectWallet } from '@/utils/web3';
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

export default function ProfilePage() {
  const [address, setAddress] = useState<string | null>(null);
  const [stats, setStats] = useState<AuditStats>({
    totalAudits: 0,
    averageStars: 0,
    chainBreakdown: {},
    recentAudits: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const { address: userAddress } = await connectWallet();
        setAddress(userAddress);
        await fetchUserStats(userAddress);
      } catch (error) {
        console.error('Failed to initialize profile:', error);
      }
    };

    initializeProfile();
  }, []);

  const fetchUserStats = async (userAddress: string) => {
    setIsLoading(true);
    try {
      const allAudits: UserAudit[] = [];
      const chainCounts: Record<string, number> = {};
      let totalStars = 0;
  
      for (const [chainKey, chainData] of Object.entries(CHAIN_CONFIG)) {
        try {
          console.log(`Fetching from ${chainKey}...`);
          const provider = new ethers.JsonRpcProvider(chainData.rpcUrls[0]);
  
          const contract = new ethers.Contract(
            CONTRACT_ADDRESSES[chainKey as keyof typeof CONTRACT_ADDRESSES],
            AUDIT_REGISTRY_ABI,
            provider
          );
  
          // Get all audits in batches
          const BATCH_SIZE = 50;
          const totalContracts = await contract.getTotalContracts();
          let processed = 0;
  
          while (processed < totalContracts) {
            try {
              const {
                contractHashes,
                stars,
                summaries,
                auditors,
                timestamps
              } = await contract.getAllAudits(processed, BATCH_SIZE);
  
              // Filter audits for the current user
              for (let i = 0; i < contractHashes.length; i++) {
                if (auditors[i].toLowerCase() === userAddress.toLowerCase()) {
                  allAudits.push({
                    contractHash: contractHashes[i],
                    stars: Number(stars[i]),
                    summary: summaries[i],
                    timestamp: Number(timestamps[i]),
                    chain: chainKey as keyof typeof CHAIN_CONFIG
                  });
  
                  // Update chain counts and total stars
                  chainCounts[chainKey] = (chainCounts[chainKey] || 0) + 1;
                  totalStars += Number(stars[i]);
                }
              }
  
              processed += contractHashes.length;
            } catch (batchError) {
              console.error(`Error fetching batch at ${processed} from ${chainKey}:`, batchError);
              break;
            }
          }
        } catch (chainError) {
          console.error(`Error fetching from ${chainKey}:`, chainError);
          chainCounts[chainKey] = 0;
        }
      }
  
      const totalAudits = allAudits.length;
      
      setStats({
        totalAudits,
        averageStars: totalAudits > 0 ? totalStars / totalAudits : 0,
        chainBreakdown: chainCounts,
        recentAudits: allAudits
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5)
      });
  
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
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
            <button
              onClick={async () => {
                try {
                  const { address } = await connectWallet();
                  setAddress(address);
                  await fetchUserStats(address);
                } catch (error) {
                  console.error('Failed to connect wallet:', error);
                }
              }}
              className="px-8 py-3 bg-white hover:bg-gray-100 text-black font-bold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-white/20"
            >
              <Lightning weight="fill" size={20} />
              Connect Wallet
            </button>
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
              onClick={() => fetchUserStats(address)}
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

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center">
              <CircleNotch size={40} className="animate-spin text-white mb-4" weight="bold" />
              <span className="text-white">Loading your profile data...</span>
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
                  {Object.entries(stats.chainBreakdown).map(([chain, count]) => (
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
                              width: `${(count / stats.totalAudits) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
                {stats.recentAudits.map((audit) => (
                  <div
                    key={`${audit.contractHash}-${audit.chain}`}
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
                ))}

                {stats.recentAudits.length === 0 && (
                  <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex flex-col items-center">
                      <ListChecks size={48} className="text-white/50 mb-4" weight="duotone" />
                      <p className="text-gray-400 mb-2">No audits found</p>
                      <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white border border-white/20">
                        Start auditing contracts to see them here
                      </span>
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