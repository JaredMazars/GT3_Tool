import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { NotificationFilters } from '@/types/notification';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/notifications
 * Get user's in-app notifications with pagination and filters
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '20', 10);
    const isReadParam = searchParams.get('isRead');
    const taskIdParam = searchParams.get('taskId');

    const filters: NotificationFilters = { page, pageSize };

    if (isReadParam !== null && isReadParam !== undefined) {
      filters.isRead = isReadParam === 'true';
    }

    if (taskIdParam !== null && taskIdParam !== undefined) {
      const parsedTaskId = Number.parseInt(taskIdParam, 10);
      if (!Number.isNaN(parsedTaskId)) {
        filters.taskId = parsedTaskId;
      }
    }

    const response = await notificationService.getUserNotifications(user.id, filters);

    return NextResponse.json(successResponse(response));
  },
});

/**
 * DELETE /api/notifications
 * Delete all read notifications
 */
export const DELETE = secureRoute.mutation({
  handler: async (request, { user }) => {
    const deletedCount = await notificationService.deleteAllRead(user.id);

    return NextResponse.json(
      successResponse({
        message: 'Read notifications deleted',
        deletedCount,
      })
    );
  },
});
