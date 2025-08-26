/**
 * Blockchain transaction performance tracking utility
 */

interface BlockchainTransactionMetric {
  id: string;
  timestamp: number;
  txHash: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  gasUsed?: number;
  gasPrice?: number;
  gasCost?: number;
  confirmationTime?: number;
  blockNumber?: number;
  network?: string;
  contractAddress?: string;
  functionName?: string;
  error?: string;
}

interface BlockchainPerformanceMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageGasCost: number;
  averageGasUsed: number;
  averageConfirmationTime: number;
  averageTransactionTime: number;
  successRate: number;
  totalGasSpent: number;
}

export class BlockchainTracker {
  private static instance: BlockchainTracker;
  private storageKey = 'blockchain_performance_metrics';
  private metrics: BlockchainTransactionMetric[] = [];
  private maxStoredMetrics = 500;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadMetricsFromStorage();
    }
  }

  static getInstance(): BlockchainTracker {
    if (!BlockchainTracker.instance) {
      BlockchainTracker.instance = new BlockchainTracker();
    }
    return BlockchainTracker.instance;
  }

  /**
   * Start tracking a blockchain transaction
   */
  startTransaction(
    contractAddress?: string, 
    functionName?: string, 
    network?: string
  ): string {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    const metric: BlockchainTransactionMetric = {
      id,
      timestamp: Date.now(),
      txHash: '',
      startTime,
      endTime: 0,
      duration: 0,
      success: false,
      contractAddress,
      functionName,
      network
    };

    this.metrics.push(metric);
    this.saveMetricsToStorage();
    
    console.log(`⛓️  Starting blockchain transaction tracking: ${id}`, {
      contract: contractAddress?.substring(0, 10) + '...',
      function: functionName,
      network
    });
    return id;
  }

  /**
   * Update transaction with hash after sending
   */
  updateTransactionHash(id: string, txHash: string): void {
    const metric = this.metrics.find(m => m.id === id);
    if (metric) {
      metric.txHash = txHash;
      this.saveMetricsToStorage();
      console.log(`📝 Transaction hash updated: ${id} -> ${txHash.substring(0, 10)}...`);
    }
  }

  /**
   * Complete tracking a blockchain transaction
   */
  completeTransaction(
    id: string,
    success: boolean,
    receipt?: {
      gasUsed?: number;
      effectiveGasPrice?: number;
      blockNumber?: number;
    },
    error?: string
  ): void {
    const metric = this.metrics.find(m => m.id === id);
    if (!metric) {
      console.warn(`Blockchain metric not found for ID: ${id}`);
      return;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.success = success;
    metric.error = error;

    if (receipt && success) {
      metric.gasUsed = Number(receipt.gasUsed || 0);
      metric.gasPrice = Number(receipt.effectiveGasPrice || 0);
      metric.gasCost = metric.gasUsed * metric.gasPrice;
      metric.blockNumber = Number(receipt.blockNumber || 0);
    }

    this.saveMetricsToStorage();
    
    console.log(`✅ Completed blockchain transaction tracking: ${id}`, {
      duration: `${metric.duration.toFixed(2)}ms`,
      success,
      gasUsed: metric.gasUsed,
      gasCost: metric.gasCost ? (metric.gasCost / 1e18).toFixed(6) + ' ETH' : 'unknown'
    });
  }

  /**
   * Track confirmation time separately (for when we wait for confirmations)
   */
  trackConfirmationTime(id: string, confirmationTimeMs: number): void {
    const metric = this.metrics.find(m => m.id === id);
    if (metric) {
      metric.confirmationTime = confirmationTimeMs;
      this.saveMetricsToStorage();
      console.log(`⏱️  Confirmation time tracked: ${id} -> ${confirmationTimeMs}ms`);
    }
  }

  /**
   * Get average gas cost for successful transactions
   */
  getAverageGasCost(): number {
    const successfulTxs = this.metrics.filter(m => m.success && m.gasCost && m.gasCost > 0);
    if (successfulTxs.length === 0) return 0;
    
    const totalCost = successfulTxs.reduce((sum, m) => sum + (m.gasCost || 0), 0);
    return totalCost / successfulTxs.length;
  }

  /**
   * Get average gas used for successful transactions
   */
  getAverageGasUsed(): number {
    const successfulTxs = this.metrics.filter(m => m.success && m.gasUsed && m.gasUsed > 0);
    if (successfulTxs.length === 0) return 0;
    
    const totalGas = successfulTxs.reduce((sum, m) => sum + (m.gasUsed || 0), 0);
    return totalGas / successfulTxs.length;
  }

  /**
   * Get average confirmation time
   */
  getAverageConfirmationTime(): number {
    const txsWithConfirmation = this.metrics.filter(m => m.success && m.confirmationTime && m.confirmationTime > 0);
    if (txsWithConfirmation.length === 0) return 0;
    
    const totalTime = txsWithConfirmation.reduce((sum, m) => sum + (m.confirmationTime || 0), 0);
    return totalTime / txsWithConfirmation.length;
  }

  /**
   * Get average transaction processing time
   */
  getAverageTransactionTime(): number {
    const successfulTxs = this.metrics.filter(m => m.success && m.duration > 0);
    if (successfulTxs.length === 0) return 0;
    
    const totalTime = successfulTxs.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / successfulTxs.length;
  }

  /**
   * Get comprehensive blockchain performance metrics
   */
  getMetrics(): BlockchainPerformanceMetrics {
    const successfulTransactions = this.metrics.filter(m => m.success).length;
    const failedTransactions = this.metrics.length - successfulTransactions;
    const totalGasSpent = this.metrics
      .filter(m => m.success && m.gasCost)
      .reduce((sum, m) => sum + (m.gasCost || 0), 0);

    return {
      totalTransactions: this.metrics.length,
      successfulTransactions,
      failedTransactions,
      averageGasCost: this.getAverageGasCost(),
      averageGasUsed: this.getAverageGasUsed(),
      averageConfirmationTime: this.getAverageConfirmationTime(),
      averageTransactionTime: this.getAverageTransactionTime(),
      successRate: this.metrics.length > 0 ? (successfulTransactions / this.metrics.length) * 100 : 0,
      totalGasSpent
    };
  }

  /**
   * Get metrics by network
   */
  getMetricsByNetwork(network: string): BlockchainTransactionMetric[] {
    return this.metrics.filter(m => m.network === network);
  }

  /**
   * Get metrics by contract address
   */
  getMetricsByContract(contractAddress: string): BlockchainTransactionMetric[] {
    return this.metrics.filter(m => 
      m.contractAddress?.toLowerCase() === contractAddress.toLowerCase()
    );
  }

  /**
   * Get recent transaction metrics
   */
  getRecentTransactions(limit: number = 10): BlockchainTransactionMetric[] {
    return this.metrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get failed transactions for debugging
   */
  getFailedTransactions(): BlockchainTransactionMetric[] {
    return this.metrics.filter(m => !m.success);
  }

  /**
   * Get gas usage statistics
   */
  getGasStatistics(): {
    totalGasUsed: number;
    averageGasUsed: number;
    maxGasUsed: number;
    minGasUsed: number;
    totalCostEth: number;
    averageCostEth: number;
  } {
    const successfulTxs = this.metrics.filter(m => m.success && m.gasUsed && m.gasUsed > 0);
    
    if (successfulTxs.length === 0) {
      return {
        totalGasUsed: 0,
        averageGasUsed: 0,
        maxGasUsed: 0,
        minGasUsed: 0,
        totalCostEth: 0,
        averageCostEth: 0
      };
    }

    const gasAmounts = successfulTxs.map(m => m.gasUsed || 0);
    const totalGasUsed = gasAmounts.reduce((sum, gas) => sum + gas, 0);
    const totalCostWei = successfulTxs.reduce((sum, m) => sum + (m.gasCost || 0), 0);

    return {
      totalGasUsed,
      averageGasUsed: totalGasUsed / successfulTxs.length,
      maxGasUsed: Math.max(...gasAmounts),
      minGasUsed: Math.min(...gasAmounts),
      totalCostEth: totalCostWei / 1e18,
      averageCostEth: (totalCostWei / successfulTxs.length) / 1e18
    };
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.saveMetricsToStorage();
    console.log('🧹 Blockchain performance metrics cleared');
  }

  /**
   * Get transaction trends over time
   */
  getTransactionTrends(timeWindowHours: number = 24): {
    hourlyTransactionCounts: number[];
    hourlySuccessRates: number[];
    hourlyAverageGasCosts: number[];
  } {
    const now = Date.now();
    const timeWindow = timeWindowHours * 60 * 60 * 1000;
    const recentMetrics = this.metrics.filter(m => now - m.timestamp <= timeWindow);
    
    const hourlyData: { [hour: string]: BlockchainTransactionMetric[] } = {};
    recentMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp).getHours().toString();
      if (!hourlyData[hour]) hourlyData[hour] = [];
      hourlyData[hour].push(metric);
    });

    const hourlyTransactionCounts = Array.from({ length: 24 }, (_, i) => 
      hourlyData[i.toString()]?.length || 0
    );
    
    const hourlySuccessRates = Array.from({ length: 24 }, (_, i) => {
      const hourMetrics = hourlyData[i.toString()] || [];
      if (hourMetrics.length === 0) return 0;
      const successful = hourMetrics.filter(m => m.success).length;
      return (successful / hourMetrics.length) * 100;
    });
    
    const hourlyAverageGasCosts = Array.from({ length: 24 }, (_, i) => {
      const hourMetrics = hourlyData[i.toString()]?.filter(m => m.success && m.gasCost) || [];
      if (hourMetrics.length === 0) return 0;
      const totalCost = hourMetrics.reduce((sum, m) => sum + (m.gasCost || 0), 0);
      return totalCost / hourMetrics.length;
    });

    return {
      hourlyTransactionCounts,
      hourlySuccessRates,
      hourlyAverageGasCosts
    };
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetricsToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const recentMetrics = this.metrics
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxStoredMetrics);
      
      localStorage.setItem(this.storageKey, JSON.stringify(recentMetrics));
    } catch (error) {
      console.warn('Failed to save blockchain metrics to storage:', error);
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetricsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load blockchain metrics from storage:', error);
      this.metrics = [];
    }
  }
}

// Export singleton instance
export const blockchainTracker = BlockchainTracker.getInstance();