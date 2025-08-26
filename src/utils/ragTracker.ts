/**
 * RAG (Retrieval-Augmented Generation) performance tracking utility
 */

interface RAGSearchMetric {
  id: string;
  timestamp: number;
  query: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  resultsCount: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  error?: string;
}

interface ContextUtilizationMetric {
  id: string;
  timestamp: number;
  searchId: string;
  contextLength: number;
  relevantContextLength: number;
  utilizationRate: number;
  topKResults: number;
}

interface RAGPerformanceMetrics {
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  averageSearchTime: number;
  averageResultsCount: number;
  averageRelevanceScore: number;
  averageContextUtilization: number;
  successRate: number;
}

export class RAGPerformanceTracker {
  private static instance: RAGPerformanceTracker;
  private storageKey = 'rag_performance_metrics';
  private contextStorageKey = 'rag_context_metrics';
  private searchMetrics: RAGSearchMetric[] = [];
  private contextMetrics: ContextUtilizationMetric[] = [];
  private maxStoredMetrics = 500;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadMetricsFromStorage();
    }
  }

  static getInstance(): RAGPerformanceTracker {
    if (!RAGPerformanceTracker.instance) {
      RAGPerformanceTracker.instance = new RAGPerformanceTracker();
    }
    return RAGPerformanceTracker.instance;
  }

  /**
   * Start tracking a RAG search operation
   */
  startSearch(query: string): string {
    const id = `rag_search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    const metric: RAGSearchMetric = {
      id,
      timestamp: Date.now(),
      query: query.substring(0, 200), // Limit query length for storage
      startTime,
      endTime: 0,
      duration: 0,
      success: false,
      resultsCount: 0,
      averageScore: 0,
      maxScore: 0,
      minScore: 0
    };

    this.searchMetrics.push(metric);
    this.saveSearchMetricsToStorage();
    
    console.log(`🔍 Starting RAG search tracking: ${id}`, { query: query.substring(0, 50) + '...' });
    return id;
  }

  /**
   * Complete tracking a RAG search operation
   */
  completeSearch(
    id: string,
    success: boolean,
    results: Array<{ score?: number }> = [],
    error?: string
  ): void {
    const metric = this.searchMetrics.find(m => m.id === id);
    if (!metric) {
      console.warn(`RAG search metric not found for ID: ${id}`);
      return;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.success = success;
    metric.error = error;

    if (results.length > 0) {
      const scores = results.map(r => r.score || 0).filter(s => s > 0);
      metric.resultsCount = results.length;
      
      if (scores.length > 0) {
        metric.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        metric.maxScore = Math.max(...scores);
        metric.minScore = Math.min(...scores);
      }
    }

    this.saveSearchMetricsToStorage();
    
    console.log(`✅ Completed RAG search tracking: ${id}`, {
      duration: `${metric.duration.toFixed(2)}ms`,
      success,
      resultsCount: metric.resultsCount,
      averageScore: metric.averageScore.toFixed(3)
    });
  }

  /**
   * Track context utilization for a search
   */
  trackContextUtilization(
    searchId: string,
    contextLength: number,
    relevantContextLength: number,
    topKResults: number = 5
  ): void {
    const utilizationRate = contextLength > 0 ? (relevantContextLength / contextLength) * 100 : 0;
    
    const contextMetric: ContextUtilizationMetric = {
      id: `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      searchId,
      contextLength,
      relevantContextLength,
      utilizationRate,
      topKResults
    };

    this.contextMetrics.push(contextMetric);
    this.saveContextMetricsToStorage();
    
    console.log(`📊 Context utilization tracked:`, {
      searchId,
      utilizationRate: `${utilizationRate.toFixed(1)}%`,
      contextLength,
      relevantLength: relevantContextLength
    });
    
    // Force save search metrics as well to ensure everything persists
    this.saveSearchMetricsToStorage();
  }

  /**
   * Get average search time for successful searches
   */
  getAverageSearchTime(): number {
    const successfulSearches = this.searchMetrics.filter(m => m.success && m.duration > 0);
    if (successfulSearches.length === 0) return 0;
    
    const totalTime = successfulSearches.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / successfulSearches.length;
  }

  /**
   * Get average context utilization rate
   */
  getAverageContextUtilization(): number {
    if (this.contextMetrics.length === 0) return 0;
    
    const totalUtilization = this.contextMetrics.reduce((sum, m) => sum + m.utilizationRate, 0);
    return totalUtilization / this.contextMetrics.length;
  }

  /**
   * Get average relevance score across all searches
   */
  getAverageRelevanceScore(): number {
    const searchesWithScores = this.searchMetrics.filter(m => m.success && m.averageScore > 0);
    if (searchesWithScores.length === 0) return 0;
    
    const totalScore = searchesWithScores.reduce((sum, m) => sum + m.averageScore, 0);
    return totalScore / searchesWithScores.length;
  }

  /**
   * Get comprehensive RAG performance metrics
   */
  getMetrics(): RAGPerformanceMetrics {
    const successfulSearches = this.searchMetrics.filter(m => m.success).length;
    const failedSearches = this.searchMetrics.length - successfulSearches;
    const avgResultsCount = this.searchMetrics.length > 0 
      ? this.searchMetrics.reduce((sum, m) => sum + m.resultsCount, 0) / this.searchMetrics.length 
      : 0;

    return {
      totalSearches: this.searchMetrics.length,
      successfulSearches,
      failedSearches,
      averageSearchTime: this.getAverageSearchTime(),
      averageResultsCount: avgResultsCount,
      averageRelevanceScore: this.getAverageRelevanceScore(),
      averageContextUtilization: this.getAverageContextUtilization(),
      successRate: this.searchMetrics.length > 0 ? (successfulSearches / this.searchMetrics.length) * 100 : 0
    };
  }

  /**
   * Get recent search metrics
   */
  getRecentSearchMetrics(limit: number = 10): RAGSearchMetric[] {
    return this.searchMetrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get context utilization metrics for a specific search
   */
  getContextMetricsForSearch(searchId: string): ContextUtilizationMetric[] {
    return this.contextMetrics.filter(m => m.searchId === searchId);
  }

  /**
   * Get search performance trends over time
   */
  getPerformanceTrends(timeWindowHours: number = 24): {
    hourlySearchCounts: number[];
    hourlyAverageResponseTimes: number[];
    hourlySuccessRates: number[];
  } {
    const now = Date.now();
    const timeWindow = timeWindowHours * 60 * 60 * 1000;
    const recentMetrics = this.searchMetrics.filter(m => now - m.timestamp <= timeWindow);
    
    // Group by hour
    const hourlyData: { [hour: string]: RAGSearchMetric[] } = {};
    recentMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp).getHours().toString();
      if (!hourlyData[hour]) hourlyData[hour] = [];
      hourlyData[hour].push(metric);
    });

    const hourlySearchCounts = Array.from({ length: 24 }, (_, i) => 
      hourlyData[i.toString()]?.length || 0
    );
    
    const hourlyAverageResponseTimes = Array.from({ length: 24 }, (_, i) => {
      const hourMetrics = hourlyData[i.toString()]?.filter(m => m.success && m.duration > 0) || [];
      if (hourMetrics.length === 0) return 0;
      return hourMetrics.reduce((sum, m) => sum + m.duration, 0) / hourMetrics.length;
    });
    
    const hourlySuccessRates = Array.from({ length: 24 }, (_, i) => {
      const hourMetrics = hourlyData[i.toString()] || [];
      if (hourMetrics.length === 0) return 0;
      const successful = hourMetrics.filter(m => m.success).length;
      return (successful / hourMetrics.length) * 100;
    });

    return {
      hourlySearchCounts,
      hourlyAverageResponseTimes,
      hourlySuccessRates
    };
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics(): void {
    this.searchMetrics = [];
    this.contextMetrics = [];
    this.saveSearchMetricsToStorage();
    this.saveContextMetricsToStorage();
    console.log('🧹 RAG performance metrics cleared');
  }

  /**
   * Save search metrics to localStorage
   */
  private saveSearchMetricsToStorage(): void {
    console.log(`🔧 saveSearchMetricsToStorage called, window undefined: ${typeof window === 'undefined'}`);
    console.log(`🔧 Current searchMetrics length: ${this.searchMetrics.length}`);
    
    if (typeof window === 'undefined') {
      console.log('🔧 Window is undefined, skipping save');
      return;
    }
    
    try {
      const recentMetrics = this.searchMetrics
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxStoredMetrics);
      
      console.log(`🔧 About to save ${recentMetrics.length} metrics to key: ${this.storageKey}`);
      
      const jsonString = JSON.stringify(recentMetrics);
      console.log(`🔧 JSON string length: ${jsonString.length}`);
      
      localStorage.setItem(this.storageKey, jsonString);
      
      // Verify it was saved
      const saved = localStorage.getItem(this.storageKey);
      console.log(`💾 RAG search metrics saved successfully: ${recentMetrics.length} entries, verified: ${saved !== null}`);
      
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log(`🔧 Verified saved data has ${parsed.length} entries`);
      }
      
    } catch (error) {
      console.error('Failed to save RAG search metrics to storage:', error);
      // Try to save with a different approach
      try {
        const simpleMetrics = this.searchMetrics.map(m => ({
          id: m.id,
          timestamp: m.timestamp,
          success: m.success,
          duration: m.duration,
          resultsCount: m.resultsCount
        }));
        console.log(`🔧 Trying simplified format with ${simpleMetrics.length} metrics`);
        localStorage.setItem(this.storageKey, JSON.stringify(simpleMetrics.slice(0, this.maxStoredMetrics)));
        console.log(`💾 RAG metrics saved in simplified format`);
      } catch (secondError) {
        console.error('Failed to save RAG metrics even in simplified format:', secondError);
      }
    }
  }

  /**
   * Save context metrics to localStorage
   */
  private saveContextMetricsToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const recentMetrics = this.contextMetrics
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxStoredMetrics);
      
      localStorage.setItem(this.contextStorageKey, JSON.stringify(recentMetrics));
    } catch (error) {
      console.warn('Failed to save RAG context metrics to storage:', error);
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetricsFromStorage(): void {
    try {
      const searchStored = localStorage.getItem(this.storageKey);
      if (searchStored) {
        this.searchMetrics = JSON.parse(searchStored);
        console.log(`📥 Loaded ${this.searchMetrics.length} RAG search metrics from storage`);
      }

      const contextStored = localStorage.getItem(this.contextStorageKey);
      if (contextStored) {
        this.contextMetrics = JSON.parse(contextStored);
        console.log(`📥 Loaded ${this.contextMetrics.length} RAG context metrics from storage`);
      }
    } catch (error) {
      console.warn('Failed to load RAG metrics from storage:', error);
      this.searchMetrics = [];
      this.contextMetrics = [];
    }
  }

  /**
   * Force refresh metrics from localStorage (for debugging)
   */
  refreshFromStorage(): void {
    this.loadMetricsFromStorage();
  }

  /**
   * Force save all metrics to storage (for debugging)
   */
  forceSave(): void {
    this.saveSearchMetricsToStorage();
    this.saveContextMetricsToStorage();
  }
}

// Export singleton instance
export const ragTracker = RAGPerformanceTracker.getInstance();