/**
 * Performance Monitoring Utility
 * Tracks API response times, cache hit rates, and slow queries
 */

import { logger } from '@/lib/utils/logger';

interface PerformanceMetric {
  endpoint: string;
  duration: number;
  timestamp: Date;
  cacheHit?: boolean;
  queryType?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics in memory
  private readonly SLOW_QUERY_THRESHOLD = 500; // Log queries slower than 500ms

  /**
   * Track an API endpoint execution time
   */
  trackApiCall(endpoint: string, startTime: number, cacheHit: boolean = false) {
    const duration = Date.now() - startTime;
    
    const metric: PerformanceMetric = {
      endpoint,
      duration,
      timestamp: new Date(),
      cacheHit,
    };

    // Add to metrics array
    this.metrics.push(metric);
    
    // Trim if exceeds max
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      logger.warn('Slow API call', {
        endpoint,
        duration,
        cacheHit,
        timestamp: metric.timestamp.toISOString(),
      });
    }

    // Log cache hits for monitoring
    if (cacheHit && process.env.NODE_ENV === 'development') {
      logger.debug('Cache Hit', { endpoint, duration });
    }

    return metric;
  }

  /**
   * Track a database query execution time
   */
  trackQuery(queryType: string, startTime: number) {
    const duration = Date.now() - startTime;
    
    const metric: PerformanceMetric = {
      endpoint: 'database',
      duration,
      timestamp: new Date(),
      queryType,
    };

    this.metrics.push(metric);
    
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      logger.warn('Slow database query', {
        queryType,
        duration,
        timestamp: metric.timestamp.toISOString(),
      });
    }

    return metric;
  }

  /**
   * Get statistics for a specific endpoint
   */
  getEndpointStats(endpoint: string) {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    
    if (endpointMetrics.length === 0) {
      return null;
    }

    const durations = endpointMetrics.map(m => m.duration);
    const cacheHits = endpointMetrics.filter(m => m.cacheHit).length;
    
    return {
      endpoint,
      totalCalls: endpointMetrics.length,
      cacheHits,
      cacheHitRate: (cacheHits / endpointMetrics.length) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
    };
  }

  /**
   * Get overall cache hit rate
   */
  getCacheHitRate() {
    const metricsWithCache = this.metrics.filter(m => m.cacheHit !== undefined);
    if (metricsWithCache.length === 0) return 0;
    
    const hits = metricsWithCache.filter(m => m.cacheHit).length;
    return (hits / metricsWithCache.length) * 100;
  }

  /**
   * Get slow queries (above threshold)
   */
  getSlowQueries(threshold: number = this.SLOW_QUERY_THRESHOLD) {
    return this.metrics
      .filter(m => m.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 50); // Top 50 slowest
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const totalCalls = this.metrics.length;
    const durations = this.metrics.map(m => m.duration);
    const cacheHitRate = this.getCacheHitRate();
    
    return {
      totalCalls,
      cacheHitRate: cacheHitRate.toFixed(2) + '%',
      avgDuration: totalCalls > 0 ? (durations.reduce((a, b) => a + b, 0) / totalCalls).toFixed(2) + 'ms' : '0ms',
      p95Duration: totalCalls > 0 ? this.percentile(durations, 95).toFixed(2) + 'ms' : '0ms',
      p99Duration: totalCalls > 0 ? this.percentile(durations, 99).toFixed(2) + 'ms' : '0ms',
      slowQueriesCount: this.getSlowQueries().length,
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware wrapper to track API performance
 */
export function withPerformanceTracking<T>(
  endpoint: string,
  handler: () => Promise<T>,
  checkCache?: () => boolean
): Promise<T> {
  const startTime = Date.now();
  const cacheHit = checkCache ? checkCache() : false;
  
  return handler().finally(() => {
    performanceMonitor.trackApiCall(endpoint, startTime, cacheHit);
  });
}

/**
 * Query wrapper to track database performance
 */
export async function withQueryTracking<T>(
  queryType: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await query();
    performanceMonitor.trackQuery(queryType, startTime);
    return result;
  } catch (error) {
    performanceMonitor.trackQuery(`${queryType} [ERROR]`, startTime);
    throw error;
  }
}
























