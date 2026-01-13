import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
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
import { secureRoute, RateLimitPresets, Feature } from '@/lib/api/secureRoute';
import { auditServiceLineAccessChange } from '@/lib/utils/auditLog';
import { getClientIdentifier } from '@/lib/utils/rateLimit';
import { invalidateOnServiceLineAccessMutation } from '@/lib/services/cache/cacheInvalidation';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Valid service line codes
const VALID_SERVICE_LINES = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT'] as const;

// Query parameter validation schema for GET
const ServiceLineAccessQuerySchema = z.object({
  serviceLine: z.enum(VALID_SERVICE_LINES).optional(),
  userId: z.string().min(1).optional(), // Azure AD user IDs aren't standard UUIDs, can contain dots
  assignmentType: z.enum(['true', 'false']).optional(),
});

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/service-line-access
 * Get all service line access for all users or specific queries (admin only)
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_SERVICE_LINES,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryResult = ServiceLineAccessQuerySchema.safeParse({
      serviceLine: searchParams.get('serviceLine') ?? undefined,
      userId: searchParams.get('userId') ?? undefined,
      assignmentType: searchParams.get('assignmentType') ?? undefined,
    });

    if (!queryResult.success) {
      throw new AppError(
        400,
        'Invalid query parameters',
        ErrorCodes.VALIDATION_ERROR,
        { errors: queryResult.error.flatten().fieldErrors }
      );
    }

    const { serviceLine, userId, assignmentType } = queryResult.data;

    let data;
    if (serviceLine) {
      const users = await getServiceLineUsers(serviceLine);
      data = users;
    } else if (userId) {
      const serviceLines = await getUserServiceLines(userId);
      
      if (assignmentType === 'true') {
        const serviceLineWithTypes = await Promise.all(
          serviceLines.map(async (sl) => {
            const slAssignmentType = await getUserAssignmentType(userId, sl.serviceLine);
            return { ...sl, assignmentType: slAssignmentType };
          })
        );
        data = serviceLineWithTypes;
      } else {
        data = serviceLines;
      }
    } else {
      const allData = await Promise.all(
        VALID_SERVICE_LINES.map(async (sl) => ({
          serviceLine: sl,
          users: await getServiceLineUsers(sl),
        }))
      );
      data = allData;
    }

    const response = NextResponse.json(successResponse(data));
    // Prevent browser caching for user-specific data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    return response;
  },
});

/**
 * POST /api/admin/service-line-access
 * Grant user access to a service line (admin only)
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_SERVICE_LINES,
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 20 },
  schema: GrantServiceLineAccessSchema,
  handler: async (request, { user, data }) => {
    const { userId, type, masterCode, subGroups, role } = data;
    const ipAddress = getClientIdentifier(request);

    if (type === 'main' && masterCode) {
      await grantServiceLineAccess(userId, masterCode, role, 'main');
      
      // Invalidate user's service line cache
      await invalidateOnServiceLineAccessMutation(userId, masterCode);
      
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
      
      // Invalidate user's service line cache
      await invalidateOnServiceLineAccessMutation(userId);

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
  feature: Feature.MANAGE_SERVICE_LINES,
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 20 },
  schema: PutSchema,
  handler: async (request, { user, data }) => {
    // Check if this is a switch assignment type request
    if ('action' in data && data.action === 'switchType') {
      const { userId, masterCode, newType, specificSubGroups } = data as z.infer<typeof SwitchAssignmentTypeSchema>;
      await switchAssignmentType(userId, masterCode, newType, specificSubGroups);
      
      // Invalidate user's service line cache
      await invalidateOnServiceLineAccessMutation(userId, masterCode);

      return NextResponse.json(
        successResponse({ message: `Assignment type switched to ${newType}`, userId, masterCode })
      );
    }

    // Otherwise, it's a role update
    const { userId, serviceLineOrSubGroup, role, isSubGroup } = data as z.infer<typeof UpdateServiceLineRoleSchema>;
    await updateServiceLineRole(userId, serviceLineOrSubGroup, role, isSubGroup);
    
    // Invalidate user's service line cache
    await invalidateOnServiceLineAccessMutation(userId, isSubGroup ? undefined : serviceLineOrSubGroup);

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
  feature: Feature.MANAGE_SERVICE_LINES,
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 20 },
  handler: async (request, { user }) => {
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
      throw new AppError(
        400,
        'Invalid request parameters',
        ErrorCodes.VALIDATION_ERROR,
        { errors: validation.error.flatten().fieldErrors }
      );
    }

    const { userId: validUserId, type: validType, masterCode: validMasterCode, subGroups } = validation.data;
    const ipAddress = getClientIdentifier(request);

    if (validType === 'main' && validMasterCode) {
      await revokeServiceLineAccess(validUserId, validMasterCode, 'main');
      
      // Invalidate user's service line cache
      await invalidateOnServiceLineAccessMutation(validUserId, validMasterCode);

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
      
      // Invalidate user's service line cache
      await invalidateOnServiceLineAccessMutation(validUserId);

      return NextResponse.json(successResponse({ message: `Access revoked from ${subGroups.length} sub-group(s)` }));
    } else {
      throw new AppError(
        400,
        'Invalid request parameters: type and corresponding code required',
        ErrorCodes.VALIDATION_ERROR
      );
    }
  },
});
