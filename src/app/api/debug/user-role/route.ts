import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute } from '@/lib/api/secureRoute';

export const dynamic = 'force-dynamic';

/**
 * DEBUG ENDPOINT - Check current user's role
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionUser: user,
        dbUser,
        isSystemAdmin: dbUser?.role === 'SYSTEM_ADMIN',
      },
    });
  },
});
