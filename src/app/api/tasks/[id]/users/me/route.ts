import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { toTaskId } from '@/types/branded';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/tasks/[id]/users/me
 * Get current user's role on a task
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(params?.id);

    // Check if user is a system admin first
    const isAdmin = await isSystemAdmin(user.id);
    
    if (isAdmin) {
      return NextResponse.json(
        successResponse({
          role: 'ADMIN',
          userId: user.id,
          isSystemAdmin: true,
        })
      );
    }

    // Get current user's task team membership
    const taskTeam = await prisma.taskTeam.findFirst({
      where: { taskId, userId: user.id },
      select: { role: true, userId: true },
    });

    if (!taskTeam) {
      return NextResponse.json(
        successResponse({
          role: 'VIEWER',
          userId: user.id,
          isSystemAdmin: false,
        })
      );
    }

    return NextResponse.json(
      successResponse({
        role: taskTeam.role,
        userId: taskTeam.userId,
        isSystemAdmin: false,
      })
    );
  },
});
