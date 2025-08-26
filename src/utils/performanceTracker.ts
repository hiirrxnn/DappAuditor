/**
 * Performance tracking utility for API response times and token usage
 */

interface MistralAnalysisMetric {
  id: string;
  timestamp: number;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  model?: string;
}

interface PerformanceMetrics {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  averageResponseTime: number;
  totalResponseTime: number;
  averageTokenUsage: number;
  totalTokenUsage: number;
  successRate: number;
}

export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private storageKey = 'mistral_performance_metrics';
  private metrics: MistralAnalysisMetric[] = [];
  private maxStoredMetrics = 1000;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadMetricsFromStorage();
    }
  }

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Start tracking a Mistral API analysis
   */
  startMistralAnalysis(model: string = 'mistral-small-latest'): string {
    const id = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    const metric: MistralAnalysisMetric = {
      id,
      timestamp: Date.now(),
      startTime,
      endTime: 0,
      duration: 0,
      success: false,
      model
    };

    this.metrics.push(metric);
    this.saveMetricsToStorage();
    
    console.log(`🚀 Starting Mistral analysis tracking: ${id}`);
    return id;
  }

  /**
   * Complete tracking a Mistral API analysis
   */
  completeMistralAnalysis(
    id: string, 
    success: boolean, 
    tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number },
    error?: string
  ): void {
    const metric = this.metrics.find(m => m.id === id);
    if (!metric) {
      console.warn(`Performance metric not found for ID: ${id}`);
      return;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.success = success;
    metric.tokenUsage = tokenUsage;
    metric.error = error;

    this.saveMetricsToStorage();
    
    console.log(`✅ Completed Mistral analysis tracking: ${id}`, {
      duration: `${metric.duration.toFixed(2)}ms`,
      success,
      tokens: tokenUsage?.totalTokens || 'unknown'
    });
  }

  /**
   * Track token usage for an analysis
   */
  trackTokenUsage(
    analysisId: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens: number
  ): void {
    const metric = this.metrics.find(m => m.id === analysisId);
    if (metric) {
      metric.tokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens
      };
      this.saveMetricsToStorage();
    }
  }

  /**
   * Get average response time for all successful analyses
   */
  getAverageResponseTime(): number {
    const successfulMetrics = this.metrics.filter(m => m.success && m.duration > 0);
    if (successfulMetrics.length === 0) return 0;
    
    const totalTime = successfulMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / successfulMetrics.length;
  }

  /**
   * Get success rate as a percentage
   */
  getSuccessRate(): number {
    if (this.metrics.length === 0) return 0;
    const successfulAnalyses = this.metrics.filter(m => m.success).length;
    return (successfulAnalyses / this.metrics.length) * 100;
  }

  /**
   * Get average token usage per analysis
   */
  getAverageTokenUsage(): number {
    const metricsWithTokens = this.metrics.filter(m => m.tokenUsage && m.success);
    if (metricsWithTokens.length === 0) return 0;
    
    const totalTokens = metricsWithTokens.reduce((sum, m) => sum + (m.tokenUsage?.totalTokens || 0), 0);
    return totalTokens / metricsWithTokens.length;
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const successfulAnalyses = this.metrics.filter(m => m.success).length;
    const failedAnalyses = this.metrics.length - successfulAnalyses;
    const totalTokenUsage = this.metrics
      .filter(m => m.tokenUsage)
      .reduce((sum, m) => sum + (m.tokenUsage?.totalTokens || 0), 0);

    return {
      totalAnalyses: this.metrics.length,
      successfulAnalyses,
      failedAnalyses,
      averageResponseTime: this.getAverageResponseTime(),
      totalResponseTime: this.metrics
        .filter(m => m.success && m.duration > 0)
        .reduce((sum, m) => sum + m.duration, 0),
      averageTokenUsage: this.getAverageTokenUsage(),
      totalTokenUsage,
      successRate: this.getSuccessRate()
    };
  }

  /**
   * Get recent metrics (last N analyses)
   */
  getRecentMetrics(limit: number = 10): MistralAnalysisMetric[] {
    return this.metrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.saveMetricsToStorage();
    console.log('🧹 Performance metrics cleared');
  }

  /**
   * Get metrics within a time range
   */
  getMetricsInTimeRange(startTime: number, endTime: number): MistralAnalysisMetric[] {
    return this.metrics.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetricsToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Keep only the most recent metrics to avoid storage overflow
      const recentMetrics = this.metrics
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxStoredMetrics);
      
      localStorage.setItem(this.storageKey, JSON.stringify(recentMetrics));
    } catch (error) {
      console.warn('Failed to save performance metrics to storage:', error);
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
      console.warn('Failed to load performance metrics from storage:', error);
      this.metrics = [];
    }
  }
}

// Export singleton instance
export const performanceTracker = PerformanceTracker.getInstance();