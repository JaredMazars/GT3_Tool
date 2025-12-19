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
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

const UpdateSystemRoleSchema = z.object({
  systemRole: z.enum(['USER', 'SYSTEM_ADMIN']),
}).strict();

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
    
    // Validate userId param
    if (!userId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }
    
    // Only SYSTEM_ADMINs can modify system roles
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      throw new AppError(403, 'Only System Administrators can modify system roles', ErrorCodes.FORBIDDEN);
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
      throw new AppError(404, 'User not found', ErrorCodes.NOT_FOUND);
    }

    // Prevent users from demoting themselves
    if (userId === user.id && data.systemRole !== 'SYSTEM_ADMIN') {
      throw new AppError(400, 'You cannot demote yourself from SYSTEM_ADMIN', ErrorCodes.VALIDATION_ERROR);
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
