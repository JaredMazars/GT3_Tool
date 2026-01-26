export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserSystemRole } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, RateLimitPresets } from '@/lib/api/secureRoute';

/**
 * GET /api/auth/me
 * Get current user information including system role and employee code
 */
export const GET = secureRoute.query({
  rateLimit: RateLimitPresets.AUTH_ENDPOINTS,
  handler: async (request, { user }) => {
    // Get the system role from database
    const systemRole = await getUserSystemRole(user.id);

    // Get employee code by matching user email with Employee.WinLogon
    const employee = await prisma.employee.findFirst({
      where: {
        WinLogon: {
          equals: user.email,
        },
      },
      select: {
        EmpCode: true,
      },
    });

    return NextResponse.json(
      successResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: systemRole || user.systemRole || user.role || 'USER',
        employeeCode: employee?.EmpCode || null,
      }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  },
});
