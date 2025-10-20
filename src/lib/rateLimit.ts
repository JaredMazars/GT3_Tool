import { NextRequest } from 'next/server';
import { AppError, ErrorCodes } from './errorHandler';
import { env } from './env';

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory
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
  READ_ONLY: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    keyPrefix: 'read',
  },
} as const;

/**
 * Get client identifier from request (IP address)
 * @param request - Next.js request object
 * @returns Client identifier (IP address or 'unknown')
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (considering proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
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
 * Check rate limit for a request
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RateLimitPresets.STANDARD
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  const identifier = getClientIdentifier(request);
  const endpoint = request.nextUrl.pathname;
  const key = getRateLimitKey(identifier, endpoint, config.keyPrefix);
  
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
export function enforceRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RateLimitPresets.STANDARD
): void {
  const result = checkRateLimit(request, config);
  
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
 * Get rate limit headers for response
 * @param result - Rate limit check result
 * @returns Headers object with rate limit information
 */
export function getRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetTime: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
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



