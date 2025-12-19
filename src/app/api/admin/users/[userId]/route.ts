import { NextResponse } from 'next/server';
import { isSystemAdmin } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { secureRoute } from '@/lib/api/secureRoute';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[userId]
 * Get detailed user information
 * Admin only
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        TaskTeam: {
          include: {
            Task: {
              include: {
                Client: true,
              },
            },
          },
        },
        Session: {
          orderBy: {
            expires: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: targetUser,
    });
  },
});

/**
 * DELETE /api/admin/users/[userId]
 * Remove user from all projects
 * Admin only
 */
export const DELETE = secureRoute.mutationWithParams({
  handler: async (request, { user, params }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Remove user from all projects
    await prisma.taskTeam.deleteMany({
      where: { userId: params.userId },
    });

    return NextResponse.json({
      success: true,
      message: 'User removed from all projects',
    });
  },
});
