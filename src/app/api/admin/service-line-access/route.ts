import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, isSystemAdmin } from '@/lib/services/auth/auth';
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
import { handleApiError } from '@/lib/utils/errorHandler';
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
import { sanitizeObject } from '@/lib/utils/sanitization';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/service-line-access
 * Get all service line access for all users or specific queries (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');
    const userId = searchParams.get('userId');
    const getAssignmentType = searchParams.get('assignmentType');

    if (serviceLine) {
      // Get users for a specific service line (includes sub-group information)
      const users = await getServiceLineUsers(serviceLine);
      return NextResponse.json(successResponse(users));
    } else if (userId) {
      // Get service lines for a specific user
      const serviceLines = await getUserServiceLines(userId);
      
      // If assignmentType is requested, get assignment type for each service line
      if (getAssignmentType === 'true') {
        const serviceLineWithTypes = await Promise.all(
          serviceLines.map(async (sl) => {
            const assignmentType = await getUserAssignmentType(userId, sl.serviceLine);
            return {
              ...sl,
              assignmentType,
            };
          })
        );
        return NextResponse.json(successResponse(serviceLineWithTypes));
      }
      
      return NextResponse.json(successResponse(serviceLines));
    } else {
      // Get all service line users grouped by service line
      const allServiceLines = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT'];
      const allData = await Promise.all(
        allServiceLines.map(async (sl) => ({
          serviceLine: sl,
          users: await getServiceLineUsers(sl),
        }))
      );
      return NextResponse.json(successResponse(allData));
    }
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/service-line-access');
  }
}

/**
 * POST /api/admin/service-line-access
 * Grant user access to a service line (main or specific sub-groups) (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    // Validate request body
    const validation = GrantServiceLineAccessSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { userId, type, masterCode, subGroups, role } = validation.data;

    // Grant access based on type
    if (type === 'main' && masterCode) {
      await grantServiceLineAccess(userId, masterCode, role, 'main');
      
      // Create in-app notification
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        });

        if (targetUser) {
          const notification = createServiceLineAddedNotification(
            masterCode,
            user.name || user.email,
            role
          );

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
        logger.error('Failed to create service line added notification:', notificationError);
      }

      return NextResponse.json(
        successResponse({ 
          message: `Access granted to all sub-groups in ${masterCode}`,
          type: 'main',
        }),
        { status: 201 }
      );
    } else if (type === 'subgroup' && subGroups) {
      await grantServiceLineAccess(userId, subGroups, role, 'subgroup');

      // Create in-app notification
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        });

        if (targetUser) {
          const notification = {
            title: 'Sub-Service Line Access Granted',
            message: `You have been granted ${role} access to ${subGroups.length} sub-service line group(s) by ${user.name || user.email}.`,
            actionUrl: '/dashboard',
          };

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
        logger.error('Failed to create sub-group access notification:', notificationError);
      }

      return NextResponse.json(
        successResponse({ 
          message: `Access granted to ${subGroups.length} specific sub-group(s)`,
          type: 'subgroup',
        }),
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid request: type and corresponding parameters required' },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/service-line-access');
  }
}

/**
 * PUT /api/admin/service-line-access
 * Update user's role in a service line or sub-group (admin only)
 * Also supports switching assignment type
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    // Check if this is a switch assignment type request
    if (body.action === 'switchType') {
      const validation = SwitchAssignmentTypeSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validation.error.format() },
          { status: 400 }
        );
      }

      const { userId, masterCode, newType, specificSubGroups } = validation.data;
      await switchAssignmentType(userId, masterCode, newType, specificSubGroups);

      return NextResponse.json(
        successResponse({ 
          message: `Assignment type switched to ${newType}`,
          userId,
          masterCode,
        })
      );
    }

    // Otherwise, it's a role update
    const validation = UpdateServiceLineRoleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { userId, serviceLineOrSubGroup, role, isSubGroup } = validation.data;
    await updateServiceLineRole(userId, serviceLineOrSubGroup, role, isSubGroup);

    // Create in-app notification
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (targetUser) {
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
      }
    } catch (notificationError) {
      logger.error('Failed to create role changed notification:', notificationError);
    }

    return NextResponse.json(
      successResponse({ message: 'Role updated successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/service-line-access');
  }
}

/**
 * DELETE /api/admin/service-line-access
 * Revoke user access to a service line or sub-group (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as 'main' | 'subgroup';
    const masterCode = searchParams.get('masterCode');
    const subGroup = searchParams.get('subGroup');

    // Build request object for validation
    const requestData = {
      userId,
      type,
      masterCode: masterCode || undefined,
      subGroups: subGroup ? [subGroup] : undefined,
    };

    const validation = RevokeServiceLineAccessSchema.safeParse(requestData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { userId: validUserId, type: validType, masterCode: validMasterCode, subGroups } = validation.data;

    if (validType === 'main' && validMasterCode) {
      await revokeServiceLineAccess(validUserId, validMasterCode, 'main');

      // Create in-app notification
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: validUserId },
          select: { id: true, name: true, email: true },
        });

        if (targetUser) {
          const notification = createServiceLineRemovedNotification(
            validMasterCode,
            user.name || user.email
          );

          await notificationService.createNotification(
            validUserId,
            NotificationType.SERVICE_LINE_REMOVED,
            notification.title,
            notification.message,
            undefined,
            notification.actionUrl,
            user.id
          );
        }
      } catch (notificationError) {
        logger.error('Failed to create service line removed notification:', notificationError);
      }

      return NextResponse.json(
        successResponse({ message: `Access revoked from ${validMasterCode}` })
      );
    } else if (validType === 'subgroup' && subGroups) {
      await revokeServiceLineAccess(validUserId, subGroups, 'subgroup');

      // Create in-app notification
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: validUserId },
          select: { id: true, name: true, email: true },
        });

        if (targetUser) {
          const notification = {
            title: 'Sub-Service Line Access Revoked',
            message: `Your access to ${subGroups.length} sub-service line group(s) has been revoked by ${user.name || user.email}.`,
            actionUrl: '/dashboard',
          };

          await notificationService.createNotification(
            validUserId,
            NotificationType.SERVICE_LINE_REMOVED,
            notification.title,
            notification.message,
            undefined,
            notification.actionUrl,
            user.id
          );
        }
      } catch (notificationError) {
        logger.error('Failed to create sub-group access revoked notification:', notificationError);
      }

      return NextResponse.json(
        successResponse({ message: `Access revoked from ${subGroups.length} sub-group(s)` })
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/service-line-access');
  }
}
