import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';

/**
 * GET /api/standard-tasks?serviceLine={servLineCode}
 * 
 * Fetches standard tasks filtered by service line code
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to manage tasks
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TASKS);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to view standard tasks' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');

    if (!serviceLine) {
      return NextResponse.json(
        { error: 'serviceLine parameter is required' },
        { status: 400 }
      );
    }

    // Fetch standard tasks filtered by service line
    const standardTasks = await prisma.standardTask.findMany({
      where: {
        ServLineCode: serviceLine,
      },
      select: {
        id: true,
        GSStdTaskID: true,
        StdTaskCode: true,
        StdTaskDesc: true,
        ServLineCode: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        StdTaskCode: 'asc',
      },
    });

    return NextResponse.json(successResponse(standardTasks));
  } catch (error) {
    return handleApiError(error, 'Get Standard Tasks');
  }
}

