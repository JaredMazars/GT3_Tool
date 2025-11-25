/**
 * Rate limiting middleware for API endpoints
 * Prevents abuse by limiting the number of requests per time window
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit tracking
// For production with multiple servers, consider Redis
const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the rate limit (e.g., userId, IP address)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    // First request or window expired, reset counter
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (userLimit.count >= limit) {
    // Rate limit exceeded
    logger.warn('Rate limit exceeded', {
      identifier,
      count: userLimit.count,
      limit,
      resetTime: new Date(userLimit.resetTime).toISOString(),
    });
    return false;
  }

  // Increment counter
  userLimit.count++;
  return true;
}

/**
 * Check rate limit and return appropriate response if exceeded
 * @param request - Next.js request object
 * @param identifier - Unique identifier for rate limiting
 * @param limit - Maximum requests allowed (default: 30)
 * @param windowMs - Time window in ms (default: 60000 = 1 minute)
 * @returns null if allowed, NextResponse with 429 status if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  identifier: string,
  limit: number = 30,
  windowMs: number = 60000
): NextResponse | null {
  if (!rateLimit(identifier, limit, windowMs)) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(windowMs / 1000)),
        },
      }
    );
  }
  return null;
}

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(identifier: string): {
  count: number;
  resetTime: number | null;
} {
  const entry = rateLimitMap.get(identifier);
  if (!entry) {
    return { count: 0, resetTime: null };
  }
  return {
    count: entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Clear rate limit for an identifier
 * Useful for testing or manual intervention
 */
export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats() {
  return {
    totalEntries: rateLimitMap.size,
    entries: Array.from(rateLimitMap.entries()).map(([key, value]) => ({
      identifier: key,
      count: value.count,
      resetTime: new Date(value.resetTime).toISOString(),
    })),
  };
}



