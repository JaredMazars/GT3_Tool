import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { notificationService } from '@/lib/services/notifications/notificationService';

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read (optionally filtered by project)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let projectId: number | undefined;

    try {
      const body = await request.json();
      projectId = body.projectId;
    } catch {
      // Body is optional
    }

    const updatedCount = await notificationService.markAllAsRead(user.id, projectId);

    return NextResponse.json(
      successResponse({
        message: 'All notifications marked as read',
        updatedCount,
      })
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/notifications/mark-all-read');
  }
}

