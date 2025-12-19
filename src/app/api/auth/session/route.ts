import { NextResponse } from 'next/server';
import { secureRoute, RateLimitPresets } from '@/lib/api/secureRoute';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session
 * Get current session information
 */
export const GET = secureRoute.query({
  rateLimit: RateLimitPresets.AUTH_ENDPOINTS,
  handler: async (request, { user }) => {
    return NextResponse.json({ user });
  },
});
