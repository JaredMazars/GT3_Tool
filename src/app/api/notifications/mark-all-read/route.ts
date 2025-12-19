import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read (optionally filtered by project)
 */
export const POST = secureRoute.mutation({
  handler: async (request, { user }) => {
    let taskId: number | undefined;

    try {
      const body = await request.json();
      taskId = body.taskId;
    } catch {
      // Body is optional
    }

    const updatedCount = await notificationService.markAllAsRead(user.id, taskId);

    return NextResponse.json(
      successResponse({
        message: 'All notifications marked as read',
        updatedCount,
      })
    );
  },
});
