import { NextResponse } from 'next/server';
import { getUserSystemRole } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, RateLimitPresets } from '@/lib/api/secureRoute';

/**
 * GET /api/auth/me
 * Get current user information including system role
 */
export const GET = secureRoute.query({
  rateLimit: RateLimitPresets.AUTH_ENDPOINTS,
  handler: async (request, { user }) => {
    // Get the system role from database
    const systemRole = await getUserSystemRole(user.id);

    return NextResponse.json(
      successResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: systemRole || user.systemRole || user.role || 'USER',
      }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  },
});
