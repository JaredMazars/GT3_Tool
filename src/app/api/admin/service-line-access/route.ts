import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { isSystemAdmin } from '@/lib/services/auth/auth';
import { 
  getUserServiceLines,
  grantServiceLineAccess,
  revokeServiceLineAccess,
  updateServiceLineRole,
  getServiceLineUsers,
  switchAssignmentType,
  getUserAssignmentType,
} from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { 
  createServiceLineAddedNotification, 
  createServiceLineRemovedNotification,
} from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';
import {
  GrantServiceLineAccessSchema,
  RevokeServiceLineAccessSchema,
  UpdateServiceLineRoleSchema,
  SwitchAssignmentTypeSchema,
} from '@/lib/validation/schemas';
import { secureRoute, RateLimitPresets } from '@/lib/api/secureRoute';
import { auditServiceLineAccessChange } from '@/lib/utils/auditLog';
import { getClientIdentifier } from '@/lib/utils/rateLimit';
import { z } from 'zod';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/service-line-access
 * Get all service line access for all users or specific queries (admin only)
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');
    const userId = searchParams.get('userId');
    const getAssignmentType = searchParams.get('assignmentType');

    if (serviceLine) {
      const users = await getServiceLineUsers(serviceLine);
      return NextResponse.json(successResponse(users));
    } else if (userId) {
      const serviceLines = await getUserServiceLines(userId);
      
      if (getAssignmentType === 'true') {
        const serviceLineWithTypes = await Promise.all(
          serviceLines.map(async (sl) => {
            const assignmentType = await getUserAssignmentType(userId, sl.serviceLine);
            return { ...sl, assignmentType };
          })
        );
        return NextResponse.json(successResponse(serviceLineWithTypes));
      }
      
      return NextResponse.json(successResponse(serviceLines));
    } else {
      const allServiceLines = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT'];
      const allData = await Promise.all(
        allServiceLines.map(async (sl) => ({
          serviceLine: sl,
          users: await getServiceLineUsers(sl),
        }))
      );
      return NextResponse.json(successResponse(allData));
    }
  },
});

/**
 * POST /api/admin/service-line-access
 * Grant user access to a service line (admin only)
 */
export const POST = secureRoute.mutation({
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 20 },
  schema: GrantServiceLineAccessSchema,
  handler: async (request, { user, data }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId, type, masterCode, subGroups, role } = data;
    const ipAddress = getClientIdentifier(request);

    if (type === 'main' && masterCode) {
      await grantServiceLineAccess(userId, masterCode, role, 'main');
      
      // Audit log
      await auditServiceLineAccessChange(user.id, userId, masterCode, 'granted', role, ipAddress);
      
      // Notification (non-blocking)
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (targetUser) {
          const notification = createServiceLineAddedNotification(masterCode, user.name || user.email, role);
          await notificationService.createNotification(
            userId,
            NotificationType.SERVICE_LINE_ADDED,
            notification.title,
            notification.message,
            undefined,
            notification.actionUrl,
            user.id
          );
        }
      } catch (notificationError) {
        logger.error('Failed to create service line added notification', notificationError);
      }

      return NextResponse.json(
        successResponse({ message: `Access granted to all sub-groups in ${masterCode}`, type: 'main' }),
        { status: 201 }
      );
    } else if (type === 'subgroup' && subGroups) {
      await grantServiceLineAccess(userId, subGroups, role, 'subgroup');

      return NextResponse.json(
        successResponse({ message: `Access granted to ${subGroups.length} specific sub-group(s)`, type: 'subgroup' }),
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid request: type and corresponding parameters required' },
        { status: 400 }
      );
    }
  },
});

// Schema for PUT that handles both role updates and assignment type switches
const PutSchema = z.union([
  SwitchAssignmentTypeSchema,
  UpdateServiceLineRoleSchema,
]);

/**
 * PUT /api/admin/service-line-access
 * Update user's role or switch assignment type (admin only)
 */
export const PUT = secureRoute.mutation({
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 20 },
  schema: PutSchema,
  handler: async (request, { user, data }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Check if this is a switch assignment type request
    if ('action' in data && data.action === 'switchType') {
      const { userId, masterCode, newType, specificSubGroups } = data as z.infer<typeof SwitchAssignmentTypeSchema>;
      await switchAssignmentType(userId, masterCode, newType, specificSubGroups);

      return NextResponse.json(
        successResponse({ message: `Assignment type switched to ${newType}`, userId, masterCode })
      );
    }

    // Otherwise, it's a role update
    const { userId, serviceLineOrSubGroup, role, isSubGroup } = data as z.infer<typeof UpdateServiceLineRoleSchema>;
    await updateServiceLineRole(userId, serviceLineOrSubGroup, role, isSubGroup);

    // Notification (non-blocking)
    try {
      const notification = {
        title: 'Service Line Role Updated',
        message: `Your role in ${serviceLineOrSubGroup} has been updated to ${role} by ${user.name || user.email}.`,
        actionUrl: '/dashboard',
      };

      await notificationService.createNotification(
        userId,
        NotificationType.SERVICE_LINE_ROLE_CHANGED,
        notification.title,
        notification.message,
        undefined,
        notification.actionUrl,
        user.id
      );
    } catch (notificationError) {
      logger.error('Failed to create role changed notification', notificationError);
    }

    return NextResponse.json(successResponse({ message: 'Role updated successfully' }));
  },
});

/**
 * DELETE /api/admin/service-line-access
 * Revoke user access to a service line or sub-group (admin only)
 */
export const DELETE = secureRoute.mutation({
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 20 },
  handler: async (request, { user }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as 'main' | 'subgroup';
    const masterCode = searchParams.get('masterCode');
    const subGroup = searchParams.get('subGroup');

    const requestData = {
      userId,
      type,
      masterCode: masterCode || undefined,
      subGroups: subGroup ? [subGroup] : undefined,
    };

    const validation = RevokeServiceLineAccessSchema.safeParse(requestData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request parameters', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { userId: validUserId, type: validType, masterCode: validMasterCode, subGroups } = validation.data;
    const ipAddress = getClientIdentifier(request);

    if (validType === 'main' && validMasterCode) {
      await revokeServiceLineAccess(validUserId, validMasterCode, 'main');

      // Audit log
      await auditServiceLineAccessChange(user.id, validUserId, validMasterCode, 'revoked', undefined, ipAddress);

      // Notification (non-blocking)
      try {
        const notification = createServiceLineRemovedNotification(validMasterCode, user.name || user.email);
        await notificationService.createNotification(
          validUserId,
          NotificationType.SERVICE_LINE_REMOVED,
          notification.title,
          notification.message,
          undefined,
          notification.actionUrl,
          user.id
        );
      } catch (notificationError) {
        logger.error('Failed to create service line removed notification', notificationError);
      }

      return NextResponse.json(successResponse({ message: `Access revoked from ${validMasterCode}` }));
    } else if (validType === 'subgroup' && subGroups) {
      await revokeServiceLineAccess(validUserId, subGroups, 'subgroup');

      return NextResponse.json(successResponse({ message: `Access revoked from ${subGroups.length} sub-group(s)` }));
    } else {
      return NextResponse.json({ success: false, error: 'Invalid request parameters' }, { status: 400 });
    }
  },
});
