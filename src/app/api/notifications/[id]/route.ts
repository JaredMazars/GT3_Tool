import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { UpdateInAppNotificationSchema } from '@/lib/validation/schemas';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * PATCH /api/notifications/[id]
 * Mark notification as read/unread
 */
export const PATCH = secureRoute.mutationWithParams<typeof UpdateInAppNotificationSchema, { id: string }>({
  schema: UpdateInAppNotificationSchema,
  handler: async (request, { user, data, params }) => {
    const notificationId = Number.parseInt(params.id, 10);

    if (Number.isNaN(notificationId)) {
      return NextResponse.json({ success: false, error: 'Invalid notification ID' }, { status: 400 });
    }

    if (data.isRead) {
      const success = await notificationService.markAsRead(notificationId, user.id);
      if (!success) {
        return NextResponse.json({ success: false, error: 'Notification not found or unauthorized' }, { status: 404 });
      }
    }

    return NextResponse.json(successResponse({ message: 'Notification updated successfully' }));
  },
});

/**
 * DELETE /api/notifications/[id]
 * Delete a single notification
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  handler: async (request, { user, params }) => {
    const notificationId = Number.parseInt(params.id, 10);

    if (Number.isNaN(notificationId)) {
      return NextResponse.json({ success: false, error: 'Invalid notification ID' }, { status: 400 });
    }

    const success = await notificationService.deleteNotification(notificationId, user.id);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Notification not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(successResponse({ message: 'Notification deleted successfully' }));
  },
});
