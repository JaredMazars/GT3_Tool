import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse, parseProjectId } from '@/lib/utils/apiUtils';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { UpdateNotificationPreferenceSchema } from '@/lib/validation/schemas';

/**
 * GET /api/projects/[id]/notification-preferences
 * Get current user's notification preferences for this project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const projectId = parseProjectId(params.id);

    // Check project access
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all notification preferences for this user and project
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: user.id,
        projectId,
      },
      orderBy: { notificationType: 'asc' },
    });

    return NextResponse.json(successResponse(preferences));
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/:id/notification-preferences');
  }
}

/**
 * PUT /api/projects/[id]/notification-preferences
 * Update notification preference for this project
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const projectId = parseProjectId(params.id);

    // Check project access
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const notificationType = searchParams.get('notificationType');

    if (!notificationType) {
      return NextResponse.json(
        { error: 'notificationType query parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = UpdateNotificationPreferenceSchema.parse(body);

    // Try to find existing preference
    const existing = await prisma.notificationPreference.findFirst({
      where: {
        userId: user.id,
        projectId,
        notificationType,
      },
    });

    if (existing) {
      // Update existing preference
      const updated = await prisma.notificationPreference.update({
        where: { id: existing.id },
        data: {
          emailEnabled: validated.emailEnabled,
        },
      });
      return NextResponse.json(successResponse(updated));
    } else {
      // Create new preference
      const created = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          projectId,
          notificationType,
          emailEnabled: validated.emailEnabled,
        },
      });
      return NextResponse.json(successResponse(created), { status: 201 });
    }
  } catch (error) {
    return handleApiError(error, 'PUT /api/projects/:id/notification-preferences');
  }
}

