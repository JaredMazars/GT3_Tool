import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, deleteAllUserSessions, verifySession } from '@/lib/services/auth/auth';
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
  
  // Redirect to signin page instead of Azure AD logout
  // This keeps the user's Azure AD session active but clears app session
  const response = NextResponse.redirect(new URL('/auth/signin', request.url));
  
  // Delete session cookie with all the same options it was set with
  response.cookies.delete('session');
  
  // Also clear the auth callback URL cookie if it exists
  response.cookies.delete('auth_callback_url');
  
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
  
  // Return signin page URL instead of Azure AD logout
  const response = NextResponse.json({ 
    success: true, 
    message: 'Logged out successfully',
    logoutUrl: '/auth/signin'
  });
  
  // Delete session cookie with all the same options it was set with
  response.cookies.delete('session');
  
  // Also clear the auth callback URL cookie if it exists
  response.cookies.delete('auth_callback_url');
  
  // Add cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}


