import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';

let redis: Redis | null = null;
let isConnected = false;

/**
 * Get Redis client instance
 * Returns null if Redis is not configured (will use in-memory fallback)
 */
export function getRedisClient(): Redis | null {
  // If no connection string, return null (will use in-memory fallback)
  if (!process.env.REDIS_CONNECTION_STRING) {
    return null;
  }

  if (!redis) {
    try {
      const connString = process.env.REDIS_CONNECTION_STRING;
      
      // Parse connection string
      // Azure format: host:port,password=xxx,ssl=True
      // Local format: localhost:6379,password=xxx
      const isAzure = connString.includes('.redis.cache.windows.net');
      
      if (isAzure) {
        // Azure Redis format
        const parts = connString.split(',');
        const [host, port] = (parts[0] || '').split(':');
        const passwordPart = parts.find(p => p.includes('password='));
        // Handle passwords with = characters (common in base64 keys)
        const password = passwordPart ? passwordPart.substring('password='.length) : undefined;
        
        redis = new Redis({
          host: host || 'localhost',
          port: Number.parseInt(port || '6380'), // Default Azure Redis SSL port
          password,
          // Enhanced TLS Security
          tls: {
            servername: host || 'localhost',
            minVersion: 'TLSv1.2', // Enforce minimum TLS version for security
          },
          // Connection pooling and limits
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: Number.parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
          maxLoadingRetryTime: 5000,
          lazyConnect: false,
          // Security: Fail fast if Redis is unavailable
          enableOfflineQueue: false,
          // Performance: Enable auto pipelining for better throughput
          enableAutoPipelining: true,
          // ACL username for Redis 6.0+ (Azure Redis supports this)
          username: process.env.REDIS_USERNAME,
          retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          reconnectOnError(err) {
            const targetErrors = ['READONLY', 'ECONNRESET'];
            return targetErrors.some(target => err.message.includes(target));
          },
        });
      } else {
        // Local Redis format
        const parts = connString.split(',');
        const [host, port] = (parts[0] || '').split(':');
        const passwordPart = parts.find(p => p.includes('password='));
        // Handle passwords with = characters (common in base64 keys)
        const password = passwordPart ? passwordPart.substring('password='.length) : undefined;
        
        redis = new Redis({
          host: host || 'localhost',
          port: Number.parseInt(port || '6379'),
          password,
          // Connection pooling and limits
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: Number.parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
          maxLoadingRetryTime: 5000,
          lazyConnect: false,
          // Security: Fail fast if Redis is unavailable
          enableOfflineQueue: false,
          // Performance: Enable auto pipelining
          enableAutoPipelining: true,
          // ACL username for Redis 6.0+
          username: process.env.REDIS_USERNAME,
          retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });
      }

      redis.on('connect', () => {
        logger.info('Redis client connected', { type: isAzure ? 'Azure' : 'Local' });
        isConnected = true;
      });

      redis.on('ready', () => {
        logger.info('Redis client ready');
        isConnected = true;
      });

      redis.on('error', (err) => {
        logger.error('Redis client error', {
          errorMessage: err.message,
          errorName: err.name,
          errorCode: (err as any).code,
        });
        isConnected = false;
      });

      redis.on('close', () => {
        logger.warn('Redis connection closed');
        isConnected = false;
      });

      redis.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

    } catch (error) {
      logger.error('Failed to create Redis client', error);
      return null;
    }
  }

  return redis;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  if (!redis) {
    return false;
  }
  
  // Check both our flag and the actual connection state
  const status = redis.status;
  const available = isConnected && (status === 'ready' || status === 'connecting');
  
  // If our flag says connected but Redis says otherwise, update the flag
  if (isConnected && status !== 'ready' && status !== 'connecting') {
    isConnected = false;
    logger.warn('Redis connection state mismatch', { 
      ourFlag: isConnected, 
      redisStatus: status 
    });
  }
  
  return available;
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection', error);
    }
    redis = null;
    isConnected = false;
  }
}

/**
 * Ping Redis to check connection
 */
export async function pingRedis(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    logger.warn('Redis ping failed: no client instance');
    return false;
  }
  
  if (!isRedisAvailable()) {
    logger.warn('Redis ping failed: not available', { status: client.status });
    return false;
  }

  try {
    const result = await client.ping();
    const success = result === 'PONG';
    if (success) {
      logger.debug('Redis ping successful');
    } else {
      logger.warn('Redis ping returned unexpected result', { result });
    }
    return success;
  } catch (error) {
    logger.error('Redis ping failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      status: client.status,
    });
    return false;
  }
}

/**
 * Get Redis connection status
 */
export function getRedisStatus(): {
  configured: boolean;
  connected: boolean;
  status: string | null;
} {
  return {
    configured: !!process.env.REDIS_CONNECTION_STRING,
    connected: isConnected,
    status: redis?.status || null,
  };
}


