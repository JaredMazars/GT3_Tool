import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { toTaskId } from '@/types/branded';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const taskId = toTaskId(params?.id);

    // Check if user is a system admin first
    const isAdmin = await isSystemAdmin(user.id);
    
    if (isAdmin) {
      // System admins have full ADMIN rights on all tasks
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
      where: {
        taskId,
        userId: user.id,
      },
      select: {
        role: true,
        userId: true,
      },
    });

    if (!taskTeam) {
      // User is not on the task team - return default VIEWER role
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
  } catch (error) {
    return handleApiError(error, 'Get Current User Task Role');
  }
}











