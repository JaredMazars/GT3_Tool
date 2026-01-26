/**
 * Redis Health Monitoring
 * 
 * Provides health check and diagnostics for Redis connections.
 * Useful for monitoring, alerting, and troubleshooting.
 * 
 * Usage:
 * ```typescript
 * const health = await getRedisHealth();
 * if (health.status === 'healthy') {
 *   console.log(`Redis latency: ${health.latency}ms`);
 * }
 * ```
 */

import { getRedisClient, isRedisAvailable } from '@/lib/cache/redisClient';
import { logger } from '@/lib/utils/logger';

/**
 * Redis health status
 */
export type RedisHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';

/**
 * Redis health check result
 */
export interface RedisHealthCheck {
  status: RedisHealthStatus;
  timestamp: Date;
  latency?: number;
  connections?: number;
  usedMemory?: number;
  usedMemoryHuman?: string;
  maxMemory?: number;
  maxMemoryHuman?: string;
  memoryUsagePercent?: number;
  hitRate?: number;
  evictedKeys?: number;
  connectedClients?: number;
  blockedClients?: number;
  totalKeys?: number;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Parse Redis INFO response
 */
function parseRedisInfo(info: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  info.split('\r\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key] = value;
      }
    }
  });
  
  return result;
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Get comprehensive Redis health check
 */
export async function getRedisHealth(): Promise<RedisHealthCheck> {
  const timestamp = new Date();
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    return {
      status: 'unavailable',
      timestamp,
      error: 'Redis client not configured or not available',
    };
  }

  try {
    // Measure latency
    const start = Date.now();
    const pingResult = await redis.ping();
    const latency = Date.now() - start;

    if (pingResult !== 'PONG') {
      return {
        status: 'unhealthy',
        timestamp,
        latency,
        error: 'Redis ping failed',
      };
    }

    // Get server info
    const [memoryInfo, statsInfo, clientsInfo, keyspaceInfo] = await Promise.all([
      redis.info('memory'),
      redis.info('stats'),
      redis.info('clients'),
      redis.info('keyspace'),
    ]);

    const memory = parseRedisInfo(memoryInfo);
    const stats = parseRedisInfo(statsInfo);
    const clients = parseRedisInfo(clientsInfo);
    const keyspace = parseRedisInfo(keyspaceInfo);

    // Parse metrics
    const usedMemory = Number.parseInt(memory.used_memory || '0');
    const maxMemory = Number.parseInt(memory.maxmemory || '0');
    const memoryUsagePercent = maxMemory > 0 ? (usedMemory / maxMemory) * 100 : 0;
    
    const keyspaceHits = Number.parseInt(stats.keyspace_hits || '0');
    const keyspaceMisses = Number.parseInt(stats.keyspace_misses || '0');
    const totalRequests = keyspaceHits + keyspaceMisses;
    const hitRate = totalRequests > 0 ? (keyspaceHits / totalRequests) * 100 : 0;
    
    const evictedKeys = Number.parseInt(stats.evicted_keys || '0');
    const connectedClients = Number.parseInt(clients.connected_clients || '0');
    const blockedClients = Number.parseInt(clients.blocked_clients || '0');
    
    // Calculate total keys across all databases
    let totalKeys = 0;
    Object.keys(keyspace).forEach(key => {
      if (key.startsWith('db')) {
        const value = keyspace[key];
        if (value) {
          const match = value.match(/keys=(\d+)/);
          if (match && match[1]) {
            totalKeys += Number.parseInt(match[1], 10);
          }
        }
      }
    });

    // Determine health status
    let status: RedisHealthStatus = 'healthy';
    
    if (latency > 100) {
      status = 'degraded'; // High latency
    }
    
    if (latency > 500 || memoryUsagePercent > 90 || evictedKeys > 1000) {
      status = 'unhealthy'; // Critical issues
    }

    const healthCheck: RedisHealthCheck = {
      status,
      timestamp,
      latency,
      usedMemory,
      usedMemoryHuman: formatBytes(usedMemory),
      maxMemory: maxMemory > 0 ? maxMemory : undefined,
      maxMemoryHuman: maxMemory > 0 ? formatBytes(maxMemory) : undefined,
      memoryUsagePercent: maxMemory > 0 ? memoryUsagePercent : undefined,
      hitRate,
      evictedKeys,
      connectedClients,
      blockedClients,
      totalKeys,
      details: {
        redisVersion: memory.redis_version,
        uptimeSeconds: Number.parseInt(stats.uptime_in_seconds || '0'),
        totalConnectionsReceived: Number.parseInt(stats.total_connections_received || '0'),
        totalCommandsProcessed: Number.parseInt(stats.total_commands_processed || '0'),
        instantaneousOpsPerSec: Number.parseInt(stats.instantaneous_ops_per_sec || '0'),
      },
    };

    // Log health check
    if (status !== 'healthy') {
      logger.warn('Redis health degraded', { 
        status, 
        latency, 
        memoryUsagePercent,
        hitRate,
        evictedKeys 
      });
    }

    return healthCheck;
  } catch (error) {
    logger.error('Redis health check failed', { error });
    
    return {
      status: 'unhealthy',
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get simple Redis status (quick check)
 */
export async function getRedisStatus(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    return {
      available: false,
      error: 'Redis not configured',
    };
  }

  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;

    return {
      available: true,
      latency,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get queue statistics for monitoring
 */
export async function getQueueStats(): Promise<Record<string, {
  pending: number;
  processing: number;
  failed: number;
  total: number;
}>> {
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    return {};
  }

  try {
    // Get stats for known queues
    const queues = ['documents', 'emails', 'reports'];
    const stats: Record<string, any> = {};

    for (const queueName of queues) {
      const [pending, processing, failed] = await Promise.all([
        redis.zcard(`queue:${queueName}:pending`),
        redis.scard(`queue:${queueName}:processing`),
        redis.scard(`queue:${queueName}:failed`),
      ]);

      stats[queueName] = {
        pending,
        processing,
        failed,
        total: pending + processing + failed,
      };
    }

    return stats;
  } catch (error) {
    logger.error('Error getting queue stats', { error });
    return {};
  }
}


