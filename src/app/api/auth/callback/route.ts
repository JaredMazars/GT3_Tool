import { NextRequest, NextResponse } from 'next/server';
import { handleCallback, createSession } from '@/lib/services/auth/auth';
import { logError, logWarn, logInfo } from '@/lib/utils/logger';
import { enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';

// Force dynamic rendering (uses cookies and headers)
export const dynamic = 'force-dynamic';

/**
 * Timeout wrapper for async operations
 * Prevents callback from hanging indefinitely if database is unresponsive
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms: ${operation}`));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply lenient rate limiting for auth endpoints
    enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS);
    
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      logWarn('Auth callback called without authorization code');
      return NextResponse.redirect(new URL('/auth/error?reason=missing_code', request.url));
    }
    
    logInfo('Processing auth callback', { hasCode: !!code });
    
    // Use NEXTAUTH_URL from environment (critical for production deployments)
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
    
    if (!process.env.NEXTAUTH_URL) {
      logError('NEXTAUTH_URL environment variable is not set', new Error('Missing NEXTAUTH_URL'));
      return NextResponse.redirect(new URL('/auth/error?reason=config_error', request.url));
    }
    
    // Wrap entire callback flow with timeout (45 seconds to allow for Azure SQL cold-start)
    const { user, sessionToken } = await withTimeout(
      (async () => {
        // Exchange code for user info (includes database operations with retry logic)
        const user = await handleCallback(code, redirectUri);
        
        // Create session token (includes database operation with retry logic)
        const sessionToken = await createSession(user);
        
        return { user, sessionToken };
      })(),
      45000, // 45 second timeout
      'Auth callback flow'
    );
    
    // Get callback URL from cookie
    const callbackUrl = request.cookies.get('auth_callback_url')?.value || '/dashboard';
    
    // CRITICAL: Construct redirect URL using NEXTAUTH_URL to prevent localhost redirects in production
    const baseUrl = process.env.NEXTAUTH_URL;
    const redirectUrl = callbackUrl.startsWith('http') 
      ? callbackUrl 
      : `${baseUrl}${callbackUrl.startsWith('/') ? callbackUrl : `/${callbackUrl}`}`;
    
    logInfo('Auth callback successful', { 
      userId: user.id,
      email: user.email,
      redirectUrl,
      duration: Date.now() - startTime 
    });
    
    // Set session cookie and redirect
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // No maxAge = session cookie (expires when browser closes)
    });
    
    // Clear callback URL cookie
    response.cookies.delete('auth_callback_url');
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Check if this is a database connection/timeout error
    const isDatabaseError = 
      error instanceof Error && (
        error.message.includes('timeout') ||
        error.message.includes('connect') ||
        error.message.includes('database') ||
        error.message.includes('P1001') ||
        error.message.includes('P1017')
      );
    
    if (isDatabaseError) {
      logError('Database connection error during auth callback', error, {
        duration,
        possibleCause: 'Azure SQL cold-start or network timeout',
        recommendation: 'User should retry login'
      });
      return NextResponse.redirect(
        new URL('/auth/error?reason=database_timeout&retry=true', request.url)
      );
    }
    
    logError('Auth callback error', error, { duration });
    return NextResponse.redirect(new URL('/auth/error?reason=callback_failed', request.url));
  }
}

