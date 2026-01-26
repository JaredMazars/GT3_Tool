import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { UpdateInAppNotificationSchema } from '@/lib/validation/schemas';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * PATCH /api/notifications/[id]
 * Mark notification as read/unread
 */
export const PATCH = secureRoute.mutationWithParams<typeof UpdateInAppNotificationSchema, { id: string }>({
  schema: UpdateInAppNotificationSchema,
  handler: async (request, { user, data, params }) => {
    const notificationId = parseNumericId(params.id, 'Notification');

    if (data.isRead) {
      const success = await notificationService.markAsRead(notificationId, user.id);
      if (!success) {
        throw new AppError(404, 'Notification not found or unauthorized', ErrorCodes.NOT_FOUND);
      }
    } else {
      // Handle marking as unread
      const success = await notificationService.markAsUnread(notificationId, user.id);
      if (!success) {
        throw new AppError(404, 'Notification not found or unauthorized', ErrorCodes.NOT_FOUND);
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
    const notificationId = parseNumericId(params.id, 'Notification');

    const success = await notificationService.deleteNotification(notificationId, user.id);

    if (!success) {
      throw new AppError(404, 'Notification not found or unauthorized', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse({ message: 'Notification deleted successfully' }));
  },
});
