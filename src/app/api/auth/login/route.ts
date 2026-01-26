import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/services/auth/auth';
import { logError } from '@/lib/utils/logger';
import { enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';

// Force dynamic rendering (uses cookies and headers)
export const dynamic = 'force-dynamic';

/**
 * Validates that a callback URL is safe to store and redirect to after authentication.
 * Prevents open redirect attacks by ensuring only relative paths or same-origin URLs are allowed.
 */
function validateCallbackUrl(callbackUrl: string | null, baseUrl: string): string {
  const defaultPath = '/dashboard';
  
  if (!callbackUrl || typeof callbackUrl !== 'string') {
    return defaultPath;
  }
  
  const trimmed = callbackUrl.trim();
  if (!trimmed) {
    return defaultPath;
  }
  
  // Allow relative paths starting with / (but not // which could be protocol-relative)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
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
    
    if (parsedUrl.origin === parsedBase.origin) {
      return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
    }
  } catch {
    // Invalid URL, fall through to default
  }
  
  return defaultPath;
}

export async function GET(request: NextRequest) {
  try {
    // Apply lenient rate limiting for auth endpoints
    enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS);
    
    const url = new URL(request.url);
    const rawCallbackUrl = url.searchParams.get('callbackUrl');
    const prompt = url.searchParams.get('prompt');
    
    // Validate callback URL to prevent open redirect attacks
    const baseUrl = process.env.NEXTAUTH_URL || '';
    const callbackUrl = validateCallbackUrl(rawCallbackUrl, baseUrl);
    
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
    const authUrl = await getAuthUrl(redirectUri, prompt);
    
    // Store callback URL in cookie for after authentication
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('auth_callback_url', callbackUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });
    
    return response;
  } catch (error) {
    logError('Login error', error);
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }
}




