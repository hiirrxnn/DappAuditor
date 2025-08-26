# Performance Tracking Implementation Task

## Objective
Add comprehensive performance tracking to the DappAuditor codebase to collect real metrics for:
- API response times
- RAG system performance  
- Blockchain transaction metrics
- System usage analytics

## Files to Modify

### 1. Create `src/utils/performanceTracker.ts`
- Implement PerformanceTracker class with methods:
  - trackMistralAnalysis() - track API response times
  - trackTokenUsage() - track token consumption
  - getAverageResponseTime() - calculate averages
  - getSuccessRate() - track success/failure rates

### 2. Create `src/utils/ragTracker.ts`
- Implement RAGPerformanceTracker class with:
  - trackSearch() - track vector search times
  - trackContextUtilization() - track context usage
  - getMetrics() - return relevance scores and utilization rates

### 3. Create `src/utils/blockchainTracker.ts`
- Implement BlockchainTracker class with:
  - trackTransaction() - track gas costs and confirmation times
  - getAverageGasCost() - calculate average gas usage
  - getAverageConfirmationTime() - track transaction times

### 4. Modify `src/app/audit/page.tsx`
- Import and integrate PerformanceTracker
- Wrap analyzeContract() function with tracking
- Add local storage for persistence
- Add console logging for real-time metrics

### 5. Modify `src/app/api/search-similar/route.ts`
- Import and integrate RAGPerformanceTracker
- Track search performance and utilization
- Include metrics in API response

### 6. Create `src/app/api/metrics/route.ts`
- New API endpoint to expose all collected metrics
- Return JSON with aggregated performance data

### 7. Modify `src/utils/vectorStore.ts`
- Integrate RAG tracking into search methods
- Track relevance scores and search times

## Implementation Requirements

- Use TypeScript with proper typing
- Implement error handling for all tracking operations
- Use performance.now() for accurate timing
- Store metrics in localStorage for persistence
- Provide both real-time and aggregated metrics
- Include proper JSDoc comments
- Follow existing code patterns and style

## Success Criteria
After implementation, running analyses should:
1. Log real response times to console
2. Accumulate metrics in localStorage  
3. Provide /api/metrics endpoint with real data
4. Track blockchain transactions when used
5. Show progressive improvement in data quality with usage

## Edge Cases to Handle
- API failures shouldn't break tracking
- Empty/null responses should be handled gracefully
- Browser storage limits should be considered
- Multiple concurrent operations should be tracked correctly