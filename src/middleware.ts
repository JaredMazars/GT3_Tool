import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionJWTOnly } from '@/lib/services/auth/jwt';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip authentication check for auth routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Skip auth check for other public routes
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
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
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if user is authenticated and accessing root
  if (pathname === '/' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Require authentication for dashboard
  if (isDashboard && !isLoggedIn) {
    const redirectUrl = new URL('/api/auth/login', req.url);
    redirectUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Require authentication for API routes
  if (isApiRoute && !isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

