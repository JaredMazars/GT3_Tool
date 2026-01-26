import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateNotificationPreferenceSchema, UpdateNotificationPreferenceSchema } from '@/lib/validation/schemas';
import { secureRoute } from '@/lib/api/secureRoute';

// Maximum preferences to return per user
const MAX_PREFERENCES = 200;

// Explicit select for notification preferences
const preferenceSelect = {
  id: true,
  userId: true,
  taskId: true,
  notificationType: true,
  emailEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/users/notification-preferences
 * Get current user's notification preferences
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
      select: preferenceSelect,
      orderBy: [{ taskId: 'asc' }, { notificationType: 'asc' }, { id: 'asc' }],
      take: MAX_PREFERENCES,
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
      select: { id: true },
    });

    if (existing) {
      throw new AppError(400, 'Preference already exists. Use PUT to update.', ErrorCodes.VALIDATION_ERROR);
    }

    const preference = await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        taskId: data.taskId || null,
        notificationType: data.notificationType,
        emailEnabled: data.emailEnabled,
        updatedAt: new Date(),
      },
      select: preferenceSelect,
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

    // Validate required query parameter
    if (!notificationType) {
      throw new AppError(400, 'notificationType query parameter is required', ErrorCodes.VALIDATION_ERROR);
    }
    
    // Validate notificationType format (alphanumeric with underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(notificationType)) {
      throw new AppError(400, 'Invalid notificationType format', ErrorCodes.VALIDATION_ERROR);
    }

    // Validate taskId if provided
    let parsedTaskId: number | null = null;
    if (taskIdStr) {
      parsedTaskId = Number.parseInt(taskIdStr, 10);
      if (Number.isNaN(parsedTaskId) || parsedTaskId <= 0) {
        throw new AppError(400, 'Invalid taskId parameter', ErrorCodes.VALIDATION_ERROR);
      }
    }

    const existing = await prisma.notificationPreference.findFirst({
      where: { userId: user.id, taskId: parsedTaskId, notificationType },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.notificationPreference.update({
        where: { id: existing.id },
        data: { emailEnabled: data.emailEnabled },
        select: preferenceSelect,
      });
      return NextResponse.json(successResponse(updated));
    } else {
      const created = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          taskId: parsedTaskId,
          notificationType,
          emailEnabled: data.emailEnabled,
          updatedAt: new Date(),
        },
        select: preferenceSelect,
      });
      return NextResponse.json(successResponse(created), { status: 201 });
    }
  },
});
