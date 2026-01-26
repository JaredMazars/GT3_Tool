import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { AppError, ErrorCodes } from './errorHandler';
import { env } from '../config/env';
import { getRedisClient, isRedisAvailable } from '@/lib/cache/redisClient';
import { logger } from './logger';
import { prisma } from '../db/prisma';

/**
 * Redis-backed rate limiter with in-memory fallback
 * Uses sliding window algorithm for accurate rate limiting across instances
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fallback store (when Redis not available)
// Key format: "ip:endpoint" or "identifier:endpoint"
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiter configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RateLimitPresets = {
  // Strict limit for AI endpoints (expensive operations)
  AI_ENDPOINTS: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    keyPrefix: 'ai',
  },
  
  // Moderate limit for file uploads
  FILE_UPLOADS: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    keyPrefix: 'upload',
  },
  
  // Standard limit for regular API calls
  STANDARD: {
    maxRequests: env.rateLimitMaxRequests,
    windowMs: env.rateLimitWindowMs,
    keyPrefix: 'api',
  },
  
  // Lenient limit for read operations
  // Increased to 300 to accommodate legitimate navigation patterns with multiple permission checks
  READ_ONLY: {
    maxRequests: 300,
    windowMs: 60000, // 1 minute
    keyPrefix: 'read',
  },
  
  // Lenient limit for authentication endpoints
  AUTH_ENDPOINTS: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    keyPrefix: 'auth',
  },
} as const;

/**
 * Get client identifier from request (IP address)
 * @param request - Next.js request object
 * @returns Client identifier (IP address or 'unknown')
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (considering proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const firstIp = forwarded.split(',')[0];
    if (firstIp) {
      return firstIp.trim();
    }
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to 'unknown' if we can't determine IP
  // In production, you might want to handle this differently
  return 'unknown';
}

/**
 * Generate rate limit key
 * @param identifier - Client identifier
 * @param endpoint - Endpoint path
 * @param prefix - Optional prefix for different limit types
 * @returns Rate limit key
 */
function getRateLimitKey(
  identifier: string,
  endpoint: string,
  prefix?: string
): string {
  const parts = [identifier, endpoint];
  if (prefix) {
    parts.unshift(prefix);
  }
  return parts.join(':');
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Check rate limit using Redis (distributed) or in-memory (fallback)
 * Uses sliding window algorithm for accurate rate limiting
 * 
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RateLimitPresets.STANDARD
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}> {
  const identifier = getClientIdentifier(request);
  const endpoint = request.nextUrl.pathname;
  const key = getRateLimitKey(identifier, endpoint, config.keyPrefix);
  
  const redis = getRedisClient();
  
  // Use Redis if available (distributed across instances)
  if (redis && isRedisAvailable()) {
    return checkRateLimitRedis(redis, key, config, identifier, endpoint);
  }
  
  // Fallback to in-memory (single instance only)
  return checkRateLimitMemory(key, config);
}

/**
 * Redis-based rate limiting with sliding window
 */
async function checkRateLimitRedis(
  redis: any,
  key: string,
  config: RateLimitConfig,
  identifier: string,
  endpoint: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  try {
    // Use Redis sorted set for sliding window
    // Each request is added with timestamp as score
    const multi = redis.multi();
    
    // Remove old entries outside the window
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Add current request with unique member to avoid collisions
    multi.zadd(key, now, `${now}:${randomBytes(8).toString('hex')}`);
    
    // Count requests in current window
    multi.zcard(key);
    
    // Set expiration to window size + buffer
    multi.expire(key, Math.ceil(config.windowMs / 1000) + 60);
    
    const results = await multi.exec();
    const count = (results?.[2]?.[1] as number) || 0;
    
    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const resetTime = now + config.windowMs;
    
    // Log rate limit violations
    if (!allowed) {
      logger.warn('Rate limit exceeded', {
        identifier,
        endpoint,
        count,
        limit: config.maxRequests,
        windowMs: config.windowMs,
      });
    }
    
    return {
      allowed,
      remaining,
      resetTime,
      limit: config.maxRequests,
    };
  } catch (error) {
    logger.error('Redis rate limit error, falling back to memory', { error });
    // Fallback to in-memory on Redis error
    return checkRateLimitMemory(key, config);
  }
}

/**
 * In-memory rate limiting (fallback)
 */
function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // No entry exists or entry has expired
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
      limit: config.maxRequests,
    };
  }
  
  // Entry exists and is still valid
  if (entry.count < config.maxRequests) {
    entry.count++;
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }
  
  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Rate limit middleware function
 * Throws an error if rate limit is exceeded
 * 
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @throws AppError if rate limit exceeded
 */
export async function enforceRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RateLimitPresets.STANDARD
): Promise<void> {
  const result = await checkRateLimit(request, config);
  
  if (!result.allowed) {
    const resetTimeSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    throw new AppError(
      429,
      `Rate limit exceeded. Please try again in ${resetTimeSeconds} seconds.`,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      {
        limit: result.limit,
        resetTime: result.resetTime,
        retryAfter: resetTimeSeconds,
      }
    );
  }
}

/**
 * Check rate limit with bypass for system admins
 * System admins are exempt from rate limiting
 * 
 * @param request - Next.js request object
 * @param userId - Optional user ID to check for admin bypass
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimitWithBypass(
  request: NextRequest,
  userId?: string,
  config: RateLimitConfig = RateLimitPresets.STANDARD
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}> {
  // Check if user is system admin (bypass rate limits)
  if (userId && process.env.RATE_LIMIT_BYPASS_ADMIN === 'true') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      
      if (user?.role === 'SYSTEM_ADMIN') {
        return {
          allowed: true,
          remaining: 999,
          resetTime: Date.now() + config.windowMs,
          limit: 999,
        };
      }
    } catch (error) {
      // If check fails, don't bypass - apply normal rate limiting
      logger.error('Error checking admin bypass', { error });
    }
  }
  
  return checkRateLimit(request, config);
}

/**
 * Get rate limit headers for response
 * Standard headers following IETF draft standard
 * 
 * @param result - Rate limit check result
 * @returns Headers object with rate limit information
 */
export function getRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetTime: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
  
  // Add Retry-After header if rate limited
  if (result.remaining === 0) {
    const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
    headers['Retry-After'] = Math.max(retryAfterSeconds, 1).toString();
  }
  
  return headers;
}

/**
 * Add rate limit headers to a NextResponse
 * 
 * @param response - NextResponse object
 * @param result - Rate limit check result
 * @returns NextResponse with rate limit headers added
 */
export function addRateLimitHeaders(
  response: any,
  result: {
    limit: number;
    remaining: number;
    resetTime: number;
  }
): any {
  const headers = getRateLimitHeaders(result);
  
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  
  return response;
}

/**
 * Reset rate limit for a specific client and endpoint
 * Useful for testing or manual overrides
 * 
 * @param identifier - Client identifier
 * @param endpoint - Endpoint path
 * @param prefix - Optional prefix
 */
export function resetRateLimit(
  identifier: string,
  endpoint: string,
  prefix?: string
): void {
  const key = getRateLimitKey(identifier, endpoint, prefix);
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status for a client
 * @param identifier - Client identifier
 * @param endpoint - Endpoint path
 * @param prefix - Optional prefix
 * @returns Current rate limit entry or null
 */
export function getRateLimitStatus(
  identifier: string,
  endpoint: string,
  prefix?: string
): RateLimitEntry | null {
  const key = getRateLimitKey(identifier, endpoint, prefix);
  return rateLimitStore.get(key) || null;
}

/**
 * Clear all rate limit entries
 * Useful for testing or maintenance
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Clear all rate limit entries for a specific identifier (IP address)
 * Useful when a user logs out to reset their rate limits
 * 
 * @param identifier - Client identifier (IP address)
 */
export function clearRateLimitsForIdentifier(identifier: string): void {
  for (const [key] of rateLimitStore.entries()) {
    if (key.includes(identifier)) {
      rateLimitStore.delete(key);
    }
  }
}

// =============================================================================
// Per-User Rate Limiting
// =============================================================================

/**
 * Rate limit configuration for per-user limiting
 */
export interface UserRateLimitConfig extends RateLimitConfig {
  /** Whether to also apply IP-based limiting */
  includeIpLimit?: boolean;
}

/**
 * Check rate limit for a specific user (in addition to IP-based limiting)
 * This provides defense-in-depth: even if an attacker rotates IPs, they
 * are still limited by their authenticated user account.
 * 
 * @param request - Next.js request object
 * @param userId - Authenticated user ID
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export async function checkUserRateLimit(
  request: NextRequest,
  userId: string,
  config: UserRateLimitConfig = RateLimitPresets.STANDARD
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  limitedBy: 'user' | 'ip' | null;
}> {
  const endpoint = request.nextUrl.pathname;
  
  // Check user-based rate limit
  const userKey = getRateLimitKey(`user:${userId}`, endpoint, config.keyPrefix);
  const redis = getRedisClient();
  
  let userResult: { allowed: boolean; remaining: number; resetTime: number; limit: number };
  
  if (redis && isRedisAvailable()) {
    userResult = await checkRateLimitRedis(redis, userKey, config, userId, endpoint);
  } else {
    userResult = checkRateLimitMemory(userKey, config);
  }
  
  // If user limit exceeded, return immediately
  if (!userResult.allowed) {
    logger.warn('Per-user rate limit exceeded', {
      userId,
      endpoint,
      limit: config.maxRequests,
    });
    
    return {
      ...userResult,
      limitedBy: 'user',
    };
  }
  
  // Optionally also check IP-based limit (default: true)
  if (config.includeIpLimit !== false) {
    const ipResult = await checkRateLimit(request, config);
    
    if (!ipResult.allowed) {
      return {
        ...ipResult,
        limitedBy: 'ip',
      };
    }
    
    // Return the more restrictive result
    const moreRestrictive = userResult.remaining < ipResult.remaining 
      ? { ...userResult, limitedBy: null as 'user' | 'ip' | null }
      : { ...ipResult, limitedBy: null as 'user' | 'ip' | null };
      
    return moreRestrictive;
  }
  
  return {
    ...userResult,
    limitedBy: null,
  };
}

/**
 * Enforce per-user rate limit (throws if exceeded)
 * 
 * @param request - Next.js request object
 * @param userId - Authenticated user ID
 * @param config - Rate limit configuration
 * @throws AppError if rate limit exceeded
 */
export async function enforceUserRateLimit(
  request: NextRequest,
  userId: string,
  config: UserRateLimitConfig = RateLimitPresets.STANDARD
): Promise<void> {
  const result = await checkUserRateLimit(request, userId, config);
  
  if (!result.allowed) {
    const resetTimeSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
    const limitType = result.limitedBy === 'user' ? 'account' : 'IP address';
    
    throw new AppError(
      429,
      `Rate limit exceeded for your ${limitType}. Please try again in ${resetTimeSeconds} seconds.`,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      {
        limit: result.limit,
        resetTime: result.resetTime,
        retryAfter: resetTimeSeconds,
        limitedBy: result.limitedBy,
      }
    );
  }
}

/**
 * Clear all rate limits for a specific user
 * Useful after password change or account recovery
 * 
 * @param userId - User ID to clear limits for
 */
export function clearRateLimitsForUser(userId: string): void {
  const userPrefix = `user:${userId}`;
  for (const [key] of rateLimitStore.entries()) {
    if (key.includes(userPrefix)) {
      rateLimitStore.delete(key);
    }
  }
}

// Export type for config
export type { RateLimitConfig };































