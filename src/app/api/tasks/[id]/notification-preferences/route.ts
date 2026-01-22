import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { UpdateNotificationPreferenceSchema } from '@/lib/validation/schemas';
import { toTaskId } from '@/types/branded';

/**
 * GET /api/tasks/[id]/notification-preferences
 * Get current user's notification preferences for this project
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);

    // Get all notification preferences for this user and project
    // IDOR protection: only return preferences for the current user
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: user.id,
        taskId,
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        notificationType: true,
        emailEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { notificationType: 'asc' },
        { id: 'asc' }, // Deterministic secondary sort
      ],
      take: 100, // Reasonable limit for notification preferences per task
    });

    return NextResponse.json(
      successResponse(preferences),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },
});

/**
 * PUT /api/tasks/[id]/notification-preferences
 * Update notification preference for this project
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  schema: UpdateNotificationPreferenceSchema.strict(),
  handler: async (request: NextRequest, { user, params, data }) => {
    const taskId = toTaskId(params.id);

    // Get notificationType from query parameter
    const { searchParams } = new URL(request.url);
    const notificationType = searchParams.get('notificationType');

    if (!notificationType) {
      throw new AppError(
        400,
        'notificationType query parameter is required',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Try to find existing preference
    // IDOR protection: only find preferences for the current user
    const existing = await prisma.notificationPreference.findFirst({
      where: {
        userId: user.id,
        taskId,
        notificationType,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      // Update existing preference
      const updated = await prisma.notificationPreference.update({
        where: { id: existing.id },
        data: {
          emailEnabled: data.emailEnabled,
        },
        select: {
          id: true,
          userId: true,
          taskId: true,
          notificationType: true,
          emailEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return NextResponse.json(successResponse(updated));
    } else {
      // Create new preference
      const created = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          taskId,
          notificationType,
          emailEnabled: data.emailEnabled,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          userId: true,
          taskId: true,
          notificationType: true,
          emailEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return NextResponse.json(successResponse(created), { status: 201 });
    }
  },
});

