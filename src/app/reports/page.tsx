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
  Copy,
  Warning
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
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    chain: 'all',
    dateRange: 'all',
    minStars: 0
  });

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Test contract connection
  const testContractConnection = async () => {
    addDebugInfo('Testing contract connection...');
    
    try {
      const chainData = CHAIN_CONFIG.sepolia;
      const contractAddress = CONTRACT_ADDRESSES.sepolia;
      
      addDebugInfo(`Contract address: ${contractAddress}`);
      addDebugInfo(`Using RPC: ${chainData.rpcUrls[0]}`);
      
      // Try multiple RPC providers
      const rpcUrls = [
        'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        'https://rpc.sepolia.org',
        'https://eth-sepolia.public.blastapi.io'
      ];
      
      let provider: ethers.JsonRpcProvider | null = null;
      
      for (const rpcUrl of rpcUrls) {
        try {
          addDebugInfo(`Trying RPC: ${rpcUrl}`);
          const testProvider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Test connection
          const blockNumber = await testProvider.getBlockNumber();
          addDebugInfo(`Connected to ${rpcUrl}, latest block: ${blockNumber}`);
          
          provider = testProvider;
          break;
        } catch (rpcError) {
          addDebugInfo(`RPC ${rpcUrl} failed: ${(rpcError as Error).message}`);
        }
      }
      
      if (!provider) {
        throw new Error('All RPC providers failed');
      }
      
      // Test contract
      const contract = new ethers.Contract(
        contractAddress,
        AUDIT_REGISTRY_ABI,
        provider
      );
      
      // Check if contract exists
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        throw new Error('Contract not deployed at this address');
      }
      
      addDebugInfo('Contract exists, checking for data...');
      
      // Try to get total contracts
      try {
        const totalContracts = await contract.getTotalContracts();
        addDebugInfo(`Total contracts in registry: ${totalContracts.toString()}`);
        
        if (totalContracts === 0n) {
          addDebugInfo('No audits found in contract');
          return { provider, contract, totalContracts: 0 };
        }
        
        return { provider, contract, totalContracts: Number(totalContracts) };
      } catch (contractError) {
        addDebugInfo(`Contract call failed: ${(contractError as Error).message}`);
        throw contractError;
      }
      
    } catch (error) {
      addDebugInfo(`Connection test failed: ${(error as Error).message}`);
      throw error;
    }
  };

  // Fetch audits with better error handling
  const fetchAllChainAudits = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo([]);
    
    try {
      addDebugInfo('Starting audit fetch...');
      
      // Test connection first
      const { provider, contract, totalContracts } = await testContractConnection();
      
      if (totalContracts === 0) {
        addDebugInfo('No audits to fetch');
        setReports([]);
        return;
      }
      
      const allAudits: AuditReport[] = [];
      const BATCH_SIZE = 10; // Smaller batch size for testing
      
      let processed = 0;
      while (processed < totalContracts) {
        try {
          addDebugInfo(`Fetching batch: ${processed} to ${Math.min(processed + BATCH_SIZE, totalContracts)}`);
          
          const {
            contractHashes,
            stars,
            summaries,
            auditors,
            timestamps
          } = await contract.getAllAudits(processed, BATCH_SIZE);
          
          addDebugInfo(`Received ${contractHashes.length} audits in batch`);
          
          for (let i = 0; i < contractHashes.length; i++) {
            try {
              allAudits.push({
                contractHash: contractHashes[i],
                transactionHash: '', // We'll skip tx hash for now to avoid complexity
                stars: Number(stars[i]),
                summary: summaries[i],
                auditor: auditors[i],
                timestamp: Number(timestamps[i]),
                chain: 'sepolia'
              });
              
            } catch (auditError) {
              addDebugInfo(`Error processing audit ${i}: ${(auditError as Error).message}`);
            }
          }
          
          processed += contractHashes.length;
          
          // Break if we got less than requested (end of data)
          if (contractHashes.length < BATCH_SIZE) {
            break;
          }
          
        } catch (batchError) {
          addDebugInfo(`Batch error: ${(batchError as Error).message}`);
          break;
        }
      }
      
      addDebugInfo(`Total audits collected: ${allAudits.length}`);
      setReports(allAudits.sort((a, b) => b.timestamp - a.timestamp));
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      addDebugInfo(`Fetch failed: ${errorMessage}`);
      setError(errorMessage);
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
    const formattedReport = {
      contractHash: report.contractHash,
      stars: Number(report.stars),
      summary: report.summary,
      auditor: report.auditor,
      timestamp: Number(report.timestamp),
      chain: report.chain,
      chainName: CHAIN_CONFIG[report.chain].chainName,
      exportDate: new Date().toISOString(),
      auditDate: new Date(Number(report.timestamp) * 1000).toLocaleString(),
    };
  
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
          
          {/* Debug Information */}
          {debugInfo.length > 0 && (
            <details className="mt-4 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <summary className="cursor-pointer text-white font-mono text-sm">Debug Information ({debugInfo.length} messages)</summary>
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
            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-start gap-2">
              <Warning size={20} weight="bold" className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Connection Error</div>
                <div className="text-sm">{error}</div>
                <button 
                  onClick={fetchAllChainAudits}
                  className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
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
                {getFilteredReports().map((report, index) => (
                  <tr 
                    key={`${report.contractHash}-${report.chain}-${index}`}
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

          {!isLoading && !error && getFilteredReports().length === 0 && reports.length === 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg">
                <ListChecks className="mr-2" size={20} weight="bold" />
                No audit reports found. Try deploying and auditing a contract first.
              </div>
            </div>
          )}

          {!isLoading && !error && getFilteredReports().length === 0 && reports.length > 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg">
                <ListChecks className="mr-2" size={20} weight="bold" />
                No audit reports match your current filters
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
                    <label className="block text-sm text-gray-400 mb-1">Contract Hash</label>
                    <div className="font-mono bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70 flex items-center justify-between">
                      <span>{selectedReport.contractHash}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedReport.contractHash)}
                        className="text-white hover:text-gray-300 flex items-center gap-1 transition-colors duration-200"
                      >
                        <Copy size={16} weight="bold" />
                      </button>
                    </div>
                  </div>

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