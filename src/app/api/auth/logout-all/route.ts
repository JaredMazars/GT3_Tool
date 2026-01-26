import { NextRequest, NextResponse } from 'next/server';
import { deleteAllUserSessions, verifySession } from '@/lib/services/auth/auth';
import { clearRateLimitsForIdentifier, getClientIdentifier, enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';
import { logInfo } from '@/lib/utils/logger';

/**
 * Handle logout from all devices
 * Deletes all sessions for the current user
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS);
  
  try {
    // Get current session token
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user ID
    const session = await verifySession(sessionToken);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }
    
    // Delete all sessions for this user
    await deleteAllUserSessions(session.user.id);
    
    logInfo('User logged out from all devices', { userId: session.user.id });
    
    // Clear rate limits for this IP
    const clientIdentifier = getClientIdentifier(request);
    clearRateLimitsForIdentifier(clientIdentifier);
    
    const response = NextResponse.json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
    
    // Delete session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // Expire in the past (1970)
    });
    
    // Also clear the auth callback URL cookie if it exists
    response.cookies.set('auth_callback_url', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}

/**
 * GET handler redirects to dashboard with logout-all option
 * This allows users to access logout-all via a link
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS);
  
  try {
    // Get current session token
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Verify session and get user ID
    const session = await verifySession(sessionToken);
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Delete all sessions for this user
    await deleteAllUserSessions(session.user.id);
    
    logInfo('User logged out from all devices via GET', { userId: session.user.id });
    
    // Clear rate limits for this IP
    const clientIdentifier = getClientIdentifier(request);
    clearRateLimitsForIdentifier(clientIdentifier);
    
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Delete session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // Expire in the past (1970)
    });
    
    // Also clear the auth callback URL cookie if it exists
    response.cookies.set('auth_callback_url', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (_error) {
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }
}







































