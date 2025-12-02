import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { UpdateInAppNotificationSchema } from '@/lib/validation/schemas';

/**
 * PATCH /api/notifications/[id]
 * Mark notification as read/unread
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const notificationId = parseInt(params.id, 10);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = UpdateInAppNotificationSchema.parse(body);

    if (validated.isRead) {
      const success = await notificationService.markAsRead(notificationId, user.id);
      if (!success) {
        return NextResponse.json(
          { error: 'Notification not found or unauthorized' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      successResponse({ message: 'Notification updated successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'PATCH /api/notifications/:id');
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a single notification
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const notificationId = parseInt(params.id, 10);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const success = await notificationService.deleteNotification(notificationId, user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Notification not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse({ message: 'Notification deleted successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/notifications/:id');
  }
}

