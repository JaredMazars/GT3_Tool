import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { NotificationFilters } from '@/types/notification';

/**
 * GET /api/notifications
 * Get user's in-app notifications with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const isReadParam = searchParams.get('isRead');
    const projectIdParam = searchParams.get('projectId');

    const filters: NotificationFilters = {
      page,
      pageSize,
    };

    // Only set isRead filter if explicitly provided
    if (isReadParam !== null && isReadParam !== undefined) {
      filters.isRead = isReadParam === 'true';
    }

    // Only set projectId filter if provided and valid
    if (projectIdParam !== null && projectIdParam !== undefined) {
      const parsedProjectId = parseInt(projectIdParam, 10);
      if (!isNaN(parsedProjectId)) {
        filters.projectId = parsedProjectId;
      }
    }

    const response = await notificationService.getUserNotifications(user.id, filters);

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'GET /api/notifications');
  }
}

/**
 * DELETE /api/notifications
 * Delete all read notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deletedCount = await notificationService.deleteAllRead(user.id);

    return NextResponse.json(
      successResponse({
        message: 'Read notifications deleted',
        deletedCount,
      })
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/notifications');
  }
}

