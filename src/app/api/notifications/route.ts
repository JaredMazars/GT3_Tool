import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { secureRoute } from '@/lib/api/secureRoute';

// Query params schema with string coercion (URL params are always strings)
const NotificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  taskId: z.coerce.number().int().positive().optional(),
  types: z.string().optional().transform(val => val ? val.split(',').filter(Boolean) : undefined),
  readStatus: z.enum(['all', 'unread', 'read']).optional(),
}).strict();

/**
 * GET /api/notifications
 * Get user's in-app notifications with pagination and filters
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    
    const queryParams = NotificationQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      isRead: searchParams.get('isRead') ?? undefined,
      taskId: searchParams.get('taskId') ?? undefined,
      types: searchParams.get('types') ?? undefined,
      readStatus: searchParams.get('readStatus') ?? undefined,
    });

    const response = await notificationService.getUserNotifications(user.id, {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      isRead: queryParams.isRead,
      taskId: queryParams.taskId,
      types: queryParams.types,
      readStatus: queryParams.readStatus,
    });

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
