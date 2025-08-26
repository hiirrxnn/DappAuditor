/**
 * Client-side RAG tracker hook - handles localStorage operations in the browser
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

interface ContextMetric {
  id: string;
  timestamp: number;
  searchId: string;
  totalContextLength: number;
  relevantContextLength: number;
  utilizationRate: number;
}

export const useRAGTracker = () => {
  const storageKey = 'rag_performance_metrics';
  const contextStorageKey = 'rag_context_metrics';
  const maxStoredMetrics = 500;

  const saveToLocalStorage = (key: string, data: any[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      const recentData = data
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, maxStoredMetrics);
      
      localStorage.setItem(key, JSON.stringify(recentData));
      console.log(`💾 Saved ${recentData.length} entries to ${key}`);
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  };

  const loadFromLocalStorage = (key: string): any[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`Failed to load ${key}:`, error);
    }
    return [];
  };

  const trackRAGSearch = (trackingData: {
    query: string;
    resultsCount: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    totalContextLength: number;
    relevantContextLength: number;
    utilizationRate: number;
  }, searchTime: number, success: boolean = true, error?: string) => {
    
    console.log('🔧 Client-side RAG tracking started');
    
    // Create search metric
    const searchMetric: RAGSearchMetric = {
      id: `rag_search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      query: trackingData.query,
      startTime: performance.now() - searchTime,
      endTime: performance.now(),
      duration: searchTime,
      success,
      resultsCount: trackingData.resultsCount,
      averageScore: trackingData.averageScore,
      maxScore: trackingData.maxScore,
      minScore: trackingData.minScore,
      error
    };

    // Load existing metrics
    const existingSearchMetrics = loadFromLocalStorage(storageKey);
    const existingContextMetrics = loadFromLocalStorage(contextStorageKey);

    // Add new search metric
    existingSearchMetrics.push(searchMetric);
    saveToLocalStorage(storageKey, existingSearchMetrics);

    // Create context metric
    const contextMetric: ContextMetric = {
      id: `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      searchId: searchMetric.id,
      totalContextLength: trackingData.totalContextLength,
      relevantContextLength: trackingData.relevantContextLength,
      utilizationRate: trackingData.utilizationRate
    };

    // Add context metric
    existingContextMetrics.push(contextMetric);
    saveToLocalStorage(contextStorageKey, existingContextMetrics);

    console.log('✅ Client-side RAG tracking completed:', {
      searchId: searchMetric.id,
      duration: `${searchTime.toFixed(2)}ms`,
      results: trackingData.resultsCount,
      avgScore: trackingData.averageScore.toFixed(3),
      utilization: `${trackingData.utilizationRate.toFixed(1)}%`
    });

    return searchMetric.id;
  };

  const getMetrics = () => {
    const searchMetrics = loadFromLocalStorage(storageKey);
    const contextMetrics = loadFromLocalStorage(contextStorageKey);

    if (searchMetrics.length === 0) {
      return null;
    }

    const successfulSearches = searchMetrics.filter(m => m.success);
    const avgSearchTime = successfulSearches.length > 0 
      ? successfulSearches.reduce((sum, m) => sum + m.duration, 0) / successfulSearches.length 
      : 0;
    
    const avgScore = successfulSearches.length > 0
      ? successfulSearches.reduce((sum, m) => sum + m.averageScore, 0) / successfulSearches.length
      : 0;

    const avgUtilization = contextMetrics.length > 0
      ? contextMetrics.reduce((sum, m) => sum + m.utilizationRate, 0) / contextMetrics.length
      : 0;

    return {
      totalSearches: searchMetrics.length,
      successfulSearches: successfulSearches.length,
      failedSearches: searchMetrics.length - successfulSearches.length,
      averageSearchTime: avgSearchTime,
      averageRelevanceScore: avgScore,
      averageContextUtilization: avgUtilization,
      successRate: searchMetrics.length > 0 ? (successfulSearches.length / searchMetrics.length) * 100 : 0
    };
  };

  return {
    trackRAGSearch,
    getMetrics
  };
};