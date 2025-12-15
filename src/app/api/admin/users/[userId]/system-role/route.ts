import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { z } from 'zod';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createSystemRoleChangedNotification } from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';

const UpdateSystemRoleSchema = z.object({
  systemRole: z.enum(['USER', 'SYSTEM_ADMIN']),
});

/**
 * PUT /api/admin/users/[userId]/system-role
 * Update a user's system role
 * Only callable by existing SYSTEM_ADMINs
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SYSTEM_ADMINs can modify system roles
    const isAdmin = await isSystemAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Only System Administrators can modify system roles' },
        { status: 403 }
      );
    }

    const { userId } = await context.params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateSystemRoleSchema.parse(body);

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent users from demoting themselves
    if (userId === currentUser.id && validatedData.systemRole !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'You cannot demote yourself from SYSTEM_ADMIN' },
        { status: 400 }
      );
    }

    // Capture old role for notification
    const oldRole = targetUser.role;

    // Update the user's system role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: validatedData.systemRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Create in-app notification (non-blocking)
    try {
      const notification = createSystemRoleChangedNotification(
        currentUser.name || currentUser.email,
        oldRole,
        validatedData.systemRole
      );

      await notificationService.createNotification(
        userId,
        NotificationType.SYSTEM_ROLE_CHANGED,
        notification.title,
        notification.message,
        undefined,
        notification.actionUrl,
        currentUser.id
      );
    } catch (notificationError) {
      logger.error('Failed to create system role changed notification:', notificationError);
    }

    return NextResponse.json(
      successResponse({
        user: updatedUser,
        message: `User ${updatedUser.name || updatedUser.email} updated to ${validatedData.systemRole}`,
      })
    );
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/users/[userId]/system-role');
  }
}



















