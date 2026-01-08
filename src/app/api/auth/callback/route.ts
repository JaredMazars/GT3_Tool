import { NextRequest, NextResponse } from 'next/server';
import { handleCallback, createSession } from '@/lib/services/auth/auth';
import { logError, logWarn, logInfo } from '@/lib/utils/logger';
import { enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';

/**
 * Validates that a callback URL is safe to redirect to (same-origin only).
 * Prevents open redirect attacks by ensuring the URL is a relative path
 * or matches the application's base URL.
 */
function validateCallbackUrl(callbackUrl: string, baseUrl: string): string {
  // Default to dashboard for any invalid input
  const defaultPath = '/dashboard';
  
  if (!callbackUrl || typeof callbackUrl !== 'string') {
    return defaultPath;
  }
  
  // Trim and normalize
  const trimmed = callbackUrl.trim();
  
  // Block empty strings
  if (!trimmed) {
    return defaultPath;
  }
  
  // Allow relative paths starting with / (but not // which could be protocol-relative)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    // Additional safety: block javascript: and data: URIs that could be embedded
    const lowerPath = trimmed.toLowerCase();
    if (lowerPath.includes('javascript:') || lowerPath.includes('data:')) {
      return defaultPath;
    }
    return trimmed;
  }
  
  // For absolute URLs, validate they match the base URL origin
  try {
    const parsedUrl = new URL(trimmed);
    const parsedBase = new URL(baseUrl);
    
    // Must match origin exactly
    if (parsedUrl.origin === parsedBase.origin) {
      // Return just the path + query + hash to avoid any edge cases
      return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
    }
  } catch {
    // Invalid URL, fall through to default
  }
  
  // Any other format is rejected
  return defaultPath;
}

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
      const baseUrl = process.env.NEXTAUTH_URL || request.url;
      return NextResponse.redirect(new URL('/auth/error?reason=missing_code', baseUrl));
    }
    
    logInfo('Processing auth callback', { hasCode: !!code });
    
    // Use NEXTAUTH_URL from environment (critical for production deployments)
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
    
    if (!process.env.NEXTAUTH_URL) {
      logError('NEXTAUTH_URL environment variable is not set', new Error('Missing NEXTAUTH_URL'));
      // Fallback to request.url only when NEXTAUTH_URL is missing
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
    
    // Get callback URL from cookie and validate it to prevent open redirect attacks
    const rawCallbackUrl = request.cookies.get('auth_callback_url')?.value || '/dashboard';
    const baseUrl = process.env.NEXTAUTH_URL;
    const validatedPath = validateCallbackUrl(rawCallbackUrl, baseUrl);
    
    // Construct redirect URL using NEXTAUTH_URL to prevent localhost redirects in production
    const redirectUrl = `${baseUrl}${validatedPath.startsWith('/') ? validatedPath : `/${validatedPath}`}`;
    
    logInfo('Auth callback successful', { 
      userId: user.id,
      redirectPath: validatedPath,
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
    response.cookies.set('auth_callback_url', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Extract detailed error information for diagnostics
    const errorDetails: Record<string, unknown> = {
      duration,
      hasCode: !!request.nextUrl.searchParams.get('code'),
      nextAuthUrl: process.env.NEXTAUTH_URL,
      message: error instanceof Error ? error.message : String(error),
    };
    
    // Check for Azure AD specific errors (MSAL errors)
    if (error && typeof error === 'object') {
      const msalError = error as Record<string, unknown>;
      if (msalError.errorCode) {
        errorDetails.azureErrorCode = msalError.errorCode;
      }
      if (msalError.errorMessage) {
        errorDetails.azureErrorMessage = msalError.errorMessage;
      }
      if (msalError.name) {
        errorDetails.errorName = msalError.name;
      }
      // Check for Azure AD error codes in the error message
      const messageStr = typeof errorDetails.message === 'string' ? errorDetails.message : '';
      if (messageStr.includes('AADSTS')) {
        const aadMatch = messageStr.match(/AADSTS\d+/);
        if (aadMatch) {
          errorDetails.azureErrorCode = aadMatch[0];
        }
      }
    }
    
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
        ...errorDetails,
        possibleCause: 'Azure SQL cold-start or network timeout',
        recommendation: 'User should retry login'
      });
      const baseUrl = process.env.NEXTAUTH_URL || request.url;
      return NextResponse.redirect(
        new URL('/auth/error?reason=database_timeout&retry=true', baseUrl)
      );
    }
    
    // Get error message as string for type-safe checks
    const errorMessage = typeof errorDetails.message === 'string' ? errorDetails.message : '';
    const azureErrorCode = typeof errorDetails.azureErrorCode === 'string' ? errorDetails.azureErrorCode : '';
    
    // Check for Azure AD redirect URI mismatch
    const isRedirectUriError = 
      errorMessage.includes('redirect_uri') ||
      azureErrorCode === 'AADSTS50011' ||
      errorMessage.includes('AADSTS50011');
    
    if (isRedirectUriError) {
      logError('Azure AD redirect URI mismatch error', error, {
        ...errorDetails,
        possibleCause: 'Redirect URI not registered in Azure AD or NEXTAUTH_URL incorrect',
        recommendation: 'Verify Azure AD App Registration redirect URIs match NEXTAUTH_URL/api/auth/callback',
        expectedRedirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback`
      });
      const baseUrl = process.env.NEXTAUTH_URL || request.url;
      return NextResponse.redirect(new URL('/auth/error?reason=callback_failed', baseUrl));
    }
    
    // Check for missing admin consent
    const isConsentError = 
      azureErrorCode === 'AADSTS65001' ||
      errorMessage.includes('AADSTS65001') ||
      errorMessage.includes('consent');
    
    if (isConsentError) {
      logError('Azure AD admin consent required', error, {
        ...errorDetails,
        possibleCause: 'Application requires admin consent',
        recommendation: 'Admin must grant consent in Azure Portal'
      });
      const baseUrl = process.env.NEXTAUTH_URL || request.url;
      return NextResponse.redirect(new URL('/auth/error?reason=callback_failed', baseUrl));
    }
    
    // Generic auth callback error with full diagnostics
    logError('Auth callback error', error, {
      ...errorDetails,
      recommendation: 'Check Azure AD configuration and environment variables'
    });
    
    const baseUrl = process.env.NEXTAUTH_URL || request.url;
    return NextResponse.redirect(new URL('/auth/error?reason=callback_failed', baseUrl));
  }
}


