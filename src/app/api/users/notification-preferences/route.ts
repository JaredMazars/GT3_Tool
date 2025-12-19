import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { CreateNotificationPreferenceSchema, UpdateNotificationPreferenceSchema } from '@/lib/validation/schemas';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/users/notification-preferences
 * Get current user's notification preferences
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
      orderBy: [{ taskId: 'asc' }, { notificationType: 'asc' }],
    });
    return NextResponse.json(successResponse(preferences));
  },
});

/**
 * POST /api/users/notification-preferences
 * Create a new notification preference
 */
export const POST = secureRoute.mutation({
  schema: CreateNotificationPreferenceSchema,
  handler: async (request, { user, data }) => {
    const existing = await prisma.notificationPreference.findFirst({
      where: {
        userId: user.id,
        taskId: data.taskId ?? null,
        notificationType: data.notificationType,
      },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'Preference already exists. Use PUT to update.' }, { status: 400 });
    }

    const preference = await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        taskId: data.taskId || null,
        notificationType: data.notificationType,
        emailEnabled: data.emailEnabled,
      },
    });

    return NextResponse.json(successResponse(preference), { status: 201 });
  },
});

/**
 * PUT /api/users/notification-preferences
 * Update a notification preference
 */
export const PUT = secureRoute.mutation({
  schema: UpdateNotificationPreferenceSchema,
  handler: async (request, { user, data }) => {
    const { searchParams } = new URL(request.url);
    const taskIdStr = searchParams.get('taskId');
    const notificationType = searchParams.get('notificationType');

    if (!notificationType) {
      return NextResponse.json({ success: false, error: 'notificationType query parameter is required' }, { status: 400 });
    }

    const parsedTaskId = taskIdStr ? Number.parseInt(taskIdStr, 10) : null;
    const existing = await prisma.notificationPreference.findFirst({
      where: { userId: user.id, taskId: parsedTaskId, notificationType },
    });

    if (existing) {
      const updated = await prisma.notificationPreference.update({
        where: { id: existing.id },
        data: { emailEnabled: data.emailEnabled },
      });
      return NextResponse.json(successResponse(updated));
    } else {
      const created = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          taskId: parsedTaskId,
          notificationType,
          emailEnabled: data.emailEnabled,
        },
      });
      return NextResponse.json(successResponse(created), { status: 201 });
    }
  },
});
