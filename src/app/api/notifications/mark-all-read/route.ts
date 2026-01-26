import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { secureRoute } from '@/lib/api/secureRoute';

// Schema for optional taskId filter
const MarkAllReadSchema = z.object({
  taskId: z.number().int().positive().optional(),
}).strict();

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read (optionally filtered by project)
 */
export const POST = secureRoute.mutation({
  schema: MarkAllReadSchema,
  handler: async (request, { user, data }) => {
    const updatedCount = await notificationService.markAllAsRead(user.id, data?.taskId);

    return NextResponse.json(
      successResponse({
        message: 'All notifications marked as read',
        updatedCount,
      })
    );
  },
});
