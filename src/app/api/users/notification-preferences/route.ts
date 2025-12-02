import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { CreateNotificationPreferenceSchema, UpdateNotificationPreferenceSchema } from '@/lib/validation/schemas';

/**
 * GET /api/users/notification-preferences
 * Get current user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
      orderBy: [
        { projectId: 'asc' },
        { notificationType: 'asc' },
      ],
    });

    return NextResponse.json(successResponse(preferences));
  } catch (error) {
    return handleApiError(error, 'GET /api/users/notification-preferences');
  }
}

/**
 * POST /api/users/notification-preferences
 * Create a new notification preference
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateNotificationPreferenceSchema.parse(body);

    // Check if preference already exists
    const existing = await prisma.notificationPreference.findFirst({
      where: {
        userId: user.id,
        projectId: validated.projectId ?? null,
        notificationType: validated.notificationType,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Preference already exists. Use PUT to update.' },
        { status: 400 }
      );
    }

    const preference = await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        projectId: validated.projectId || null,
        notificationType: validated.notificationType,
        emailEnabled: validated.emailEnabled,
      },
    });

    return NextResponse.json(successResponse(preference), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/users/notification-preferences');
  }
}

/**
 * PUT /api/users/notification-preferences
 * Update a notification preference
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
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
    const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
    const existing = await prisma.notificationPreference.findFirst({
      where: {
        userId: user.id,
        projectId: parsedProjectId,
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
          projectId: projectId ? parseInt(projectId, 10) : null,
          notificationType,
          emailEnabled: validated.emailEnabled,
        },
      });
      return NextResponse.json(successResponse(created), { status: 201 });
    }
  } catch (error) {
    return handleApiError(error, 'PUT /api/users/notification-preferences');
  }
}

