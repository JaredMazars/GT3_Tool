import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/auth';
import { logError } from '@/lib/logger';
import { enforceRateLimit, RateLimitPresets } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    // Apply lenient rate limiting for auth endpoints
    enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS);
    
    const url = new URL(request.url);
    const callbackUrl = url.searchParams.get('callbackUrl') || '/dashboard';
    
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
    const authUrl = await getAuthUrl(redirectUri);
    
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



