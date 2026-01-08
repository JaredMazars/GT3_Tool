import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, deleteAllUserSessions, verifySession, getLogoutUrl } from '@/lib/services/auth/auth';
import { clearRateLimitsForIdentifier, getClientIdentifier, enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';
import { logInfo } from '@/lib/utils/logger';

/**
 * Handle logout - clear session cookie and redirect
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS);
  
  // Get current session token
  const sessionToken = request.cookies.get('session')?.value;
  
  // Delete session from database
  if (sessionToken) {
    // Check if user wants to logout from all devices
    const url = new URL(request.url);
    const logoutAll = url.searchParams.get('all') === 'true';
    
    if (logoutAll) {
      // Get user ID from session and delete all their sessions
      const session = await verifySession(sessionToken);
      if (session?.user?.id) {
        await deleteAllUserSessions(session.user.id);
        logInfo('User logged out from all devices', { userId: session.user.id });
      }
    } else {
      // Delete only this session
      const session = await verifySession(sessionToken);
      await deleteSession(sessionToken);
      if (session?.user?.id) {
        logInfo('User logged out', { userId: session.user.id });
      }
    }
  }
  
  // Clear rate limits for this IP
  const clientIdentifier = getClientIdentifier(request);
  clearRateLimitsForIdentifier(clientIdentifier);
  
  // Redirect to Azure AD logout, which will clear SSO session and redirect back to app root
  // Middleware will then redirect unauthenticated users to Azure AD login
  const postLogoutRedirectUri = process.env.NEXTAUTH_URL!;
  const azureLogoutUrl = getLogoutUrl(postLogoutRedirectUri);
  const response = NextResponse.redirect(azureLogoutUrl);
  
  // Delete session cookie using direct Set-Cookie headers for reliability
  const nodeEnv = process.env.NODE_ENV;
  const isProduction = nodeEnv === 'production';
  const sessionCookieHeader = `session=; Path=/; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}; Max-Age=0`;
  const callbackCookieHeader = `auth_callback_url=; Path=/; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}; Max-Age=0`;
  
  response.headers.append('Set-Cookie', sessionCookieHeader);
  response.headers.append('Set-Cookie', callbackCookieHeader);
  
  // Add cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

/**
 * Handle logout via POST - clear session cookie and return redirect URL
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS);
  
  // Get current session token
  const sessionToken = request.cookies.get('session')?.value;
  
  // Delete session from database
  if (sessionToken) {
    const session = await verifySession(sessionToken);
    await deleteSession(sessionToken);
    if (session?.user?.id) {
      logInfo('User logged out via POST', { userId: session.user.id });
    }
  }
  
  // Clear rate limits for this IP
  const clientIdentifier = getClientIdentifier(request);
  clearRateLimitsForIdentifier(clientIdentifier);
  
  // Return Azure AD logout URL which will clear SSO session and redirect back to app root
  // Middleware will then redirect unauthenticated users to Azure AD login
  const postLogoutRedirectUri = process.env.NEXTAUTH_URL!;
  const azureLogoutUrl = getLogoutUrl(postLogoutRedirectUri);
  const response = NextResponse.json({ 
    success: true, 
    message: 'Logged out successfully',
    logoutUrl: azureLogoutUrl
  });
  
  // Delete session cookie using direct Set-Cookie headers for reliability
  const nodeEnv = process.env.NODE_ENV;
  const isProduction = nodeEnv === 'production';
  const sessionCookieHeader = `session=; Path=/; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}; Max-Age=0`;
  const callbackCookieHeader = `auth_callback_url=; Path=/; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}; Max-Age=0`;
  
  response.headers.append('Set-Cookie', sessionCookieHeader);
  response.headers.append('Set-Cookie', callbackCookieHeader);
  
  // Add cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}


