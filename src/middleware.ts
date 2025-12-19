import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionJWTOnly } from '@/lib/services/auth/jwt';

/**
 * Security headers applied to all responses
 * Defined inline because Edge runtime has limited module support
 */
const SECURITY_HEADERS: Record<string, string> = {
  // Prevents MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Prevents page from being embedded in iframes (clickjacking protection)
  'X-Frame-Options': 'DENY',
  // Enables XSS filtering in older browsers
  'X-XSS-Protection': '1; mode=block',
  // Controls Referer header behavior
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Restricts browser features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

/**
 * Apply security headers to a response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip authentication check for auth routes
  if (pathname.startsWith('/api/auth')) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Skip auth check for other public routes
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health')
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Check authentication for protected routes
  const sessionToken = req.cookies.get('session')?.value;
  // Use JWT-only verification in middleware (Edge runtime doesn't support Prisma)
  const session = sessionToken ? await verifySessionJWTOnly(sessionToken) : null;
  const isLoggedIn = !!session;

  // Dashboard routes
  const isDashboard = pathname.startsWith('/dashboard');

  // API routes (except health check and auth)
  const isApiRoute =
    pathname.startsWith('/api') && 
    !pathname.startsWith('/api/health') &&
    !pathname.startsWith('/api/auth');

  // Root path - redirect to Azure AD login if not authenticated
  if (pathname === '/' && !isLoggedIn) {
    const redirectUrl = new URL('/api/auth/login', req.url);
    redirectUrl.searchParams.set('callbackUrl', '/dashboard');
    const redirectResponse = NextResponse.redirect(redirectUrl);
    return applySecurityHeaders(redirectResponse);
  }

  // Redirect to dashboard if user is authenticated and accessing root
  if (pathname === '/' && isLoggedIn) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', req.url));
    return applySecurityHeaders(redirectResponse);
  }

  // Require authentication for dashboard
  if (isDashboard && !isLoggedIn) {
    const redirectUrl = new URL('/api/auth/login', req.url);
    redirectUrl.searchParams.set('callbackUrl', pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    return applySecurityHeaders(redirectResponse);
  }

  // Require authentication for API routes
  if (isApiRoute && !isLoggedIn) {
    const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return applySecurityHeaders(errorResponse);
  }

  // Add pathname to headers for PageAccessGuard
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  
  // Apply security headers to all responses
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


