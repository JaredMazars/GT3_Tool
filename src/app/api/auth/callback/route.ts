import { NextRequest, NextResponse } from 'next/server';
import { handleCallback, createSession } from '@/lib/services/auth/auth';
import { logError } from '@/lib/utils/logger';
import { enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';

export async function GET(request: NextRequest) {
  try {
    // Apply lenient rate limiting for auth endpoints
    enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS);
    
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      return NextResponse.redirect(new URL('/auth/error', request.url));
    }
    
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
    const user = await handleCallback(code, redirectUri);
    
    // Create session token
    const sessionToken = await createSession(user);
    
    // Get callback URL from cookie
    const callbackUrl = request.cookies.get('auth_callback_url')?.value || '/dashboard';
    
    // Construct the redirect URL using the app's base URL
    const baseUrl = process.env.NEXTAUTH_URL || url.origin;
    const redirectUrl = callbackUrl.startsWith('http') 
      ? callbackUrl 
      : `${baseUrl}${callbackUrl.startsWith('/') ? callbackUrl : `/${callbackUrl}`}`;
    
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
    logError('Callback error', error);
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }
}

