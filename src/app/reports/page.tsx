'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { 
  MagnifyingGlass, 
  Star, 
  ArrowSquareOut,
  X,
  FunnelSimple,
  Download,
  FileText,
  ListChecks,
  CircleNotch,
  Copy
} from 'phosphor-react';
import Image from 'next/image';
import { CHAIN_CONFIG } from '@/utils/web3';
import { CONTRACT_ADDRESSES, AUDIT_REGISTRY_ABI, ChainKey } from '@/utils/contracts';

interface AuditReport {
  contractHash: string;
  transactionHash: string;
  stars: number;
  summary: string;
  auditor: string;
  timestamp: number;
  chain: ChainKey;
}

interface FilterState {
  search: string;
  chain: string;
  dateRange: 'all' | 'day' | 'week' | 'month';
  minStars: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    chain: 'all',
    dateRange: 'all',
    minStars: 0
  });

  const getSepoliaExplorerLink = (report: AuditReport): string => {
    // Format the transaction hash for explorer URL
    const formattedHash = report.transactionHash.startsWith('0x')
      ? report.transactionHash 
      : `0x${report.transactionHash}`;
    
    // Use Sepolia Etherscan for all reports
    console.log(`Building Sepolia explorer URL for: ${formattedHash}`);
    return `https://sepolia.etherscan.io/tx/${formattedHash}`;
  };

  // Fetch audits from all supported chains
  const fetchAllChainAudits = async () => {
    setIsLoading(true);
    try {
      const allAudits: AuditReport[] = [];
      const BATCH_SIZE = 50;
  
      for (const [chainKey, chainData] of Object.entries(CHAIN_CONFIG)) {
        try {
          console.log(`Fetching from ${chainKey}...`);
          
          const provider = new ethers.JsonRpcProvider(chainData.rpcUrls[0]);
  
          const contract = new ethers.Contract(
            CONTRACT_ADDRESSES[chainKey as ChainKey],
            AUDIT_REGISTRY_ABI,
            provider
          );
  
          // Get total contracts for this chain
          const totalContracts = await contract.getTotalContracts();
          console.log(`Found ${totalContracts.toString()} contracts on ${chainKey}`);
  
          // Fetch in batches
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
  
              console.log(`Processing batch of ${contractHashes.length} audits`);
              
              for (let i = 0; i < contractHashes.length; i++) {
                try {
                  const filter = contract.filters.AuditRegistered(contractHashes[i]);
                  const currentBlock = await provider.getBlockNumber();
                  const MAX_BLOCK_RANGE = 10000; // About 1-2 days of blocks
                  const startBlock = Math.max(0, currentBlock - MAX_BLOCK_RANGE);
                  
                  const events = await contract.queryFilter(filter, startBlock, currentBlock);
                  const txHash = events[events.length - 1]?.transactionHash || '';
                  
                  allAudits.push({
                    contractHash: contractHashes[i],
                    transactionHash: txHash,
                    stars: Number(stars[i]),
                    summary: summaries[i],
                    auditor: auditors[i],
                    timestamp: Number(timestamps[i]),
                    chain: chainKey as ChainKey
                  });
                  
                  if (txHash) {
                    console.log(`Found tx hash for ${contractHashes[i].slice(0, 8)}: ${txHash.slice(0, 10)}...`);
                  } else {
                    console.log(`No tx hash found for ${contractHashes[i].slice(0, 8)}`);
                  }
                } catch (eventError) {
                  console.error(`Error fetching events for contract ${contractHashes[i].slice(0, 8)}:`, eventError);
                  
                  // Still add the audit even if we can't get the transaction hash
                  allAudits.push({
                    contractHash: contractHashes[i],
                    transactionHash: '',
                    stars: Number(stars[i]),
                    summary: summaries[i],
                    auditor: auditors[i],
                    timestamp: Number(timestamps[i]),
                    chain: chainKey as ChainKey
                  });
                }
              }
              
              processed += contractHashes.length;
              console.log(`Processed ${processed}/${totalContracts} on ${chainKey}`);
  
            } catch (batchError) {
              console.error(`Error fetching batch at ${processed} from ${chainKey}:`, batchError);
              break;
            }
          }
  
        } catch (chainError) {
          console.error(`Error processing chain ${chainKey}:`, chainError);
        }
      }
  
      console.log(`Total audits collected: ${allAudits.length}`);
      setReports(allAudits.sort((a, b) => b.timestamp - a.timestamp));
  
    } catch (error) {
      console.error('Failed to fetch audits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllChainAudits();
  }, []);

  const getFilteredReports = () => {
    return reports.filter(report => {
      if (filters.search && 
          !report.contractHash.toLowerCase().includes(filters.search.toLowerCase()) &&
          !report.auditor.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      if (filters.chain !== 'all' && report.chain !== filters.chain) {
        return false;
      }

      if (filters.minStars > 0 && report.stars < filters.minStars) {
        return false;
      }

      if (filters.dateRange !== 'all') {
        const now = Date.now() / 1000;
        const ranges = {
          day: 86400,
          week: 604800,
          month: 2592000
        };
        if (now - report.timestamp > ranges[filters.dateRange]) {
          return false;
        }
      }

      return true;
    });
  };

  const exportReport = (report: AuditReport) => {
    // Convert BigInt values and format data for export
    const formattedReport = {
      contractHash: report.contractHash,
      stars: Number(report.stars),
      summary: report.summary,
      auditor: report.auditor,
      timestamp: Number(report.timestamp),
      chain: report.chain,
      chainName: CHAIN_CONFIG[report.chain].chainName,
      exportDate: new Date().toISOString(),
      network: {
        name: CHAIN_CONFIG[report.chain].chainName,
        chainId: CHAIN_CONFIG[report.chain].chainId,
        contractAddress: CONTRACT_ADDRESSES[report.chain as ChainKey],
      },
      auditDate: new Date(Number(report.timestamp) * 1000).toLocaleString(),
    };
  
    // Create and download the file
    try {
      const blob = new Blob([JSON.stringify(formattedReport, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${report.contractHash.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block mb-3 px-4 py-1 rounded-full bg-white/10 border border-white/20">
            <span className="text-white text-sm font-semibold">Security Verification</span>
          </div>
          <h1 className="text-3xl font-mono font-bold mb-4 text-white">Audit Reports</h1>
          <p className="text-gray-400">View and analyze smart contract audits across multiple chains</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by contract hash or auditor address..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-200"
              />
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} weight="bold" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg hover:bg-gray-800 hover:border-white/50 transition-all duration-200 flex items-center gap-2"
            >
              <FunnelSimple size={20} className="text-white" weight="bold" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-gray-900/50 border border-gray-800 rounded-lg p-4 shadow-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Chain</label>
                  <select
                    value={filters.chain}
                    onChange={(e) => setFilters({ ...filters, chain: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-200"
                  >
                    <option value="all">All Chains</option>
                    {Object.entries(CHAIN_CONFIG).map(([key, chain]) => (
                      <option key={key} value={key}>{chain.chainName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Time Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as FilterState['dateRange'] })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-200"
                  >
                    <option value="all">All Time</option>
                    <option value="day">Last 24 Hours</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Minimum Stars</label>
                  <select
                    value={filters.minStars}
                    onChange={(e) => setFilters({ ...filters, minStars: Number(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-200"
                  >
                    <option value={0}>Any Rating</option>
                    {[1, 2, 3, 4, 5].map(stars => (
                      <option key={stars} value={stars}>{stars}+ Stars</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Reports Table */}
        <div className="bg-gray-900/50 border border-gray-800 hover:border-white/50 transition-colors duration-300 rounded-lg overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="py-4 px-6 text-left text-sm font-mono text-white">CONTRACT</th>
                  <th className="py-4 px-6 text-left text-sm font-mono text-white">CHAIN</th>
                  <th className="py-4 px-6 text-left text-sm font-mono text-white">RATING</th>
                  <th className="py-4 px-6 text-left text-sm font-mono text-white">AUDITOR</th>
                  <th className="py-4 px-6 text-left text-sm font-mono text-white">DATE</th>
                  <th className="py-4 px-6 text-right text-sm font-mono text-white">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredReports().map((report) => (
                  <tr 
                    key={`${report.contractHash}-${report.chain}`}
                    className="border-b border-gray-800/50 hover:bg-white/10 transition-colors duration-200"
                  >
                    <td className="py-4 px-6 font-mono">
                      {report.contractHash.slice(0, 10)}...{report.contractHash.slice(-8)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-white/20 rounded-full blur-[2px]"></div>
                          <Image
                            src={CHAIN_CONFIG[report.chain].iconPath}
                            alt={CHAIN_CONFIG[report.chain].chainName}
                            width={20}
                            height={20}
                            className="rounded-full relative z-10"
                          />
                        </div>
                        <span>{CHAIN_CONFIG[report.chain].chainName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            weight={i < report.stars ? "fill" : "regular"}
                            className={i < report.stars ? "text-white" : "text-gray-600"}
                            size={16}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono">
                      {report.auditor.slice(0, 6)}...{report.auditor.slice(-4)}
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(report.timestamp * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <ArrowSquareOut size={20} className="text-white" weight="bold" />
                        </button>
                        <button
                          onClick={() => exportReport(report)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
                          title="Export Report"
                        >
                          <Download size={20} className="text-white" weight="bold" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg">
                <CircleNotch className="animate-spin mr-2" size={20} weight="bold" />
                Loading audits...
              </div>
            </div>
          )}

          {!isLoading && getFilteredReports().length === 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg">
                <ListChecks className="mr-2" size={20} weight="bold" />
                No audit reports found matching your criteria
              </div>
            </div>
          )}
        </div>

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl shadow-white/20"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="inline-block mb-2 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                      <span className="text-white text-xs font-medium">Audit Details</span>
                    </div>
                    <h3 className="text-xl font-bold">Contract Security Report</h3>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-1 hover:bg-gray-800 rounded-lg transition-colors duration-200 hover:text-white"
                  >
                    <X size={20} weight="bold" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Chain</label>
                    <div className="flex items-center gap-2 bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-[2px]"></div>
                        <Image
                          src={CHAIN_CONFIG[selectedReport.chain].iconPath}
                          alt={CHAIN_CONFIG[selectedReport.chain].chainName}
                          width={20}
                          height={20}
                          className="rounded-full relative z-10"
                        />
                      </div>
                      <span>{CHAIN_CONFIG[selectedReport.chain].chainName}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Security Rating</label>
                    <div className="flex gap-1 bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          weight={i < selectedReport.stars ? "fill" : "regular"}
                          className={i < selectedReport.stars ? "text-white" : "text-gray-600"}
                          size={20}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Summary</label>
                    <div className="bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70">
                      {selectedReport.summary}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Auditor</label>
                    <div className="font-mono bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70 flex items-center justify-between">
                      <span>{selectedReport.auditor}</span>
                      <a
                        href={`${CHAIN_CONFIG[selectedReport.chain].blockExplorerUrls[0]}/address/${selectedReport.auditor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-gray-300 flex items-center gap-1 transition-colors duration-200"
                      >
                        View on Explorer <ArrowSquareOut size={16} weight="bold" />
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Timestamp</label>
                    <div className="bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70">
                      {new Date(selectedReport.timestamp * 1000).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-800">
                    <button
                      onClick={() => exportReport(selectedReport)}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors duration-200 flex items-center gap-2"
                    >
                      <Download size={20} weight="bold" />
                      Export Report
                    </button>
                    {selectedReport.transactionHash && selectedReport.transactionHash.length > 20 && !selectedReport.transactionHash.includes('-') && (
                      <a
                        href={getSepoliaExplorerLink(selectedReport)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
                      >
                        View on Explorer
                        <ArrowSquareOut size={20} weight="bold" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}