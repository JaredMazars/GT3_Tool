import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { z } from 'zod';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createSystemRoleChangedNotification } from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';
import { secureRoute, RateLimitPresets } from '@/lib/api/secureRoute';
import { auditUserRoleChange } from '@/lib/utils/auditLog';
import { getClientIdentifier } from '@/lib/utils/rateLimit';

const UpdateSystemRoleSchema = z.object({
  systemRole: z.enum(['USER', 'SYSTEM_ADMIN']),
});

/**
 * PUT /api/admin/users/[userId]/system-role
 * Update a user's system role
 * Only callable by existing SYSTEM_ADMINs
 * 
 * Security: Rate limited, requires SYSTEM_ADMIN, audit logged
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateSystemRoleSchema, { userId: string }>({
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 10 }, // Stricter limit for admin operations
  schema: UpdateSystemRoleSchema,
  handler: async (request, { user, data, params }) => {
    const { userId } = params;
    
    // Only SYSTEM_ADMINs can modify system roles
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only System Administrators can modify system roles' },
        { status: 403 }
      );
    }

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
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Prevent users from demoting themselves
    if (userId === user.id && data.systemRole !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'You cannot demote yourself from SYSTEM_ADMIN' },
        { status: 400 }
      );
    }

    // Capture old role for audit and notification
    const oldRole = targetUser.role;

    // Update the user's system role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: data.systemRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Audit log the role change (critical security event)
    const ipAddress = getClientIdentifier(request);
    await auditUserRoleChange(user.id, userId, oldRole, data.systemRole, ipAddress);

    // Create in-app notification (non-blocking)
    try {
      const notification = createSystemRoleChangedNotification(
        user.name || user.email,
        oldRole,
        data.systemRole
      );

      await notificationService.createNotification(
        userId,
        NotificationType.SYSTEM_ROLE_CHANGED,
        notification.title,
        notification.message,
        undefined,
        notification.actionUrl,
        user.id
      );
    } catch (notificationError) {
      logger.error('Failed to create system role changed notification', notificationError);
    }

    return NextResponse.json(
      successResponse({
        user: updatedUser,
        message: `User ${updatedUser.name || updatedUser.email} updated to ${data.systemRole}`,
      })
    );
  },
});
