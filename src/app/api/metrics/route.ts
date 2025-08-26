import { NextRequest, NextResponse } from 'next/server';
import { performanceTracker } from '@/utils/performanceTracker';
import { ragTracker } from '@/utils/ragTracker';
import { blockchainTracker } from '@/utils/blockchainTracker';

/**
 * GET /api/metrics - Returns comprehensive performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Get all performance metrics
    const mistralMetrics = performanceTracker.getMetrics();
    const ragMetrics = ragTracker.getMetrics();
    const blockchainMetrics = blockchainTracker.getMetrics();
    
    // Get recent activity
    const recentMistralAnalyses = performanceTracker.getRecentMetrics(10);
    const recentRAGSearches = ragTracker.getRecentSearchMetrics(10);
    const recentTransactions = blockchainTracker.getRecentTransactions(10);
    
    // Get trends
    const ragTrends = ragTracker.getPerformanceTrends(24);
    const blockchainTrends = blockchainTracker.getTransactionTrends(24);
    
    // Get gas statistics
    const gasStats = blockchainTracker.getGasStatistics();
    
    // Compile comprehensive metrics
    const metricsResponse = {
      timestamp: Date.now(),
      mistralAnalysis: {
        ...mistralMetrics,
        recentAnalyses: recentMistralAnalyses
      },
      ragPerformance: {
        ...ragMetrics,
        recentSearches: recentRAGSearches,
        trends: ragTrends
      },
      blockchain: {
        ...blockchainMetrics,
        recentTransactions: recentTransactions,
        gasStatistics: gasStats,
        trends: blockchainTrends
      },
      summary: {
        totalOperations: mistralMetrics.totalAnalyses + ragMetrics.totalSearches + blockchainMetrics.totalTransactions,
        overallSuccessRate: calculateOverallSuccessRate(mistralMetrics, ragMetrics, blockchainMetrics),
        systemHealth: calculateSystemHealth(mistralMetrics, ragMetrics, blockchainMetrics)
      }
    };
    
    return NextResponse.json(metricsResponse);
    
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve metrics',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * DELETE /api/metrics - Clear all stored metrics
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get counts before clearing
    const mistralMetrics = performanceTracker.getMetrics();
    const ragMetrics = ragTracker.getMetrics();
    const blockchainMetrics = blockchainTracker.getMetrics();
    
    const clearedCounts = {
      mistralAnalyses: mistralMetrics.totalAnalyses,
      ragSearches: ragMetrics.totalSearches,
      blockchainTransactions: blockchainMetrics.totalTransactions
    };
    
    // Clear all metrics
    performanceTracker.clearMetrics();
    ragTracker.clearMetrics();
    blockchainTracker.clearMetrics();
    
    return NextResponse.json({
      message: 'All performance metrics cleared successfully',
      clearedCounts,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Metrics clear error:', error);
    return NextResponse.json({ 
      error: 'Failed to clear metrics',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * POST /api/metrics/export - Export metrics in various formats
 */
export async function POST(request: NextRequest) {
  try {
    const { format = 'json', timeRange = 24 } = await request.json();
    
    // Get metrics data
    const mistralMetrics = performanceTracker.getMetrics();
    const ragMetrics = ragTracker.getMetrics();
    const blockchainMetrics = blockchainTracker.getMetrics();
    
    // Get historical data based on time range
    const timeRangeMs = timeRange * 60 * 60 * 1000; // Convert hours to ms
    const startTime = Date.now() - timeRangeMs;
    
    const historicalMistral = performanceTracker.getMetricsInTimeRange(startTime, Date.now());
    const ragTrends = ragTracker.getPerformanceTrends(timeRange);
    const blockchainTrends = blockchainTracker.getTransactionTrends(timeRange);
    
    const exportData = {
      exportInfo: {
        timestamp: Date.now(),
        format,
        timeRangeHours: timeRange,
        generatedBy: 'DappAuditor Performance Tracker'
      },
      summary: {
        totalAnalyses: mistralMetrics.totalAnalyses,
        totalRAGSearches: ragMetrics.totalSearches,
        totalTransactions: blockchainMetrics.totalTransactions,
        overallSuccessRate: calculateOverallSuccessRate(mistralMetrics, ragMetrics, blockchainMetrics)
      },
      mistralAnalysis: {
        metrics: mistralMetrics,
        historicalData: historicalMistral
      },
      ragPerformance: {
        metrics: ragMetrics,
        trends: ragTrends
      },
      blockchain: {
        metrics: blockchainMetrics,
        gasStatistics: blockchainTracker.getGasStatistics(),
        trends: blockchainTrends
      }
    };
    
    // Format based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="performance-metrics-${Date.now()}.csv"`
        }
      });
    }
    
    // Default to JSON
    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="performance-metrics-${Date.now()}.json"`
      }
    });
    
  } catch (error) {
    console.error('Metrics export error:', error);
    return NextResponse.json({ 
      error: 'Failed to export metrics',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * Calculate overall success rate across all systems
 */
function calculateOverallSuccessRate(
  mistralMetrics: any, 
  ragMetrics: any, 
  blockchainMetrics: any
): number {
  const totalOperations = mistralMetrics.totalAnalyses + ragMetrics.totalSearches + blockchainMetrics.totalTransactions;
  if (totalOperations === 0) return 0;
  
  const totalSuccesses = mistralMetrics.successfulAnalyses + ragMetrics.successfulSearches + blockchainMetrics.successfulTransactions;
  return (totalSuccesses / totalOperations) * 100;
}

/**
 * Calculate system health score
 */
function calculateSystemHealth(
  mistralMetrics: any,
  ragMetrics: any, 
  blockchainMetrics: any
): string {
  const overallSuccessRate = calculateOverallSuccessRate(mistralMetrics, ragMetrics, blockchainMetrics);
  const avgResponseTime = (mistralMetrics.averageResponseTime + ragMetrics.averageSearchTime) / 2;
  
  // Health scoring based on success rate and response time
  if (overallSuccessRate >= 95 && avgResponseTime < 2000) return 'excellent';
  if (overallSuccessRate >= 90 && avgResponseTime < 5000) return 'good';
  if (overallSuccessRate >= 80 && avgResponseTime < 10000) return 'fair';
  if (overallSuccessRate >= 70) return 'poor';
  return 'critical';
}

/**
 * Convert metrics data to CSV format
 */
function convertToCSV(data: any): string {
  const headers = [
    'Timestamp',
    'Total_Analyses',
    'Mistral_Success_Rate',
    'Avg_Response_Time',
    'Total_RAG_Searches',
    'RAG_Success_Rate',
    'Avg_Search_Time',
    'Total_Transactions',
    'Blockchain_Success_Rate',
    'Avg_Gas_Cost',
    'System_Health'
  ];
  
  const row = [
    new Date().toISOString(),
    data.mistralAnalysis.metrics.totalAnalyses,
    data.mistralAnalysis.metrics.successRate.toFixed(2),
    data.mistralAnalysis.metrics.averageResponseTime.toFixed(2),
    data.ragPerformance.metrics.totalSearches,
    data.ragPerformance.metrics.successRate.toFixed(2),
    data.ragPerformance.metrics.averageSearchTime.toFixed(2),
    data.blockchain.metrics.totalTransactions,
    data.blockchain.metrics.successRate.toFixed(2),
    data.blockchain.gasStatistics.averageCostEth.toFixed(6),
    calculateSystemHealth(
      data.mistralAnalysis.metrics,
      data.ragPerformance.metrics,
      data.blockchain.metrics
    )
  ];
  
  return [headers.join(','), row.join(',')].join('\n');
}