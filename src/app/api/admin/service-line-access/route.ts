import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, isSystemAdmin } from '@/lib/services/auth/auth';
import { 
  getUserServiceLines,
  grantServiceLineAccess,
  revokeServiceLineAccess,
  updateServiceLineRole,
  getServiceLineUsers,
} from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { ServiceLine, ServiceLineRole } from '@/types';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { 
  createServiceLineAddedNotification, 
  createServiceLineRemovedNotification,
  createServiceLineRoleChangedNotification 
} from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/service-line-access
 * Get all service line access for all users (admin only)
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

    if (serviceLine) {
      // Get users for a specific service line
      const users = await getServiceLineUsers(serviceLine);
      return NextResponse.json(successResponse(users));
    } else if (userId) {
      // Get service lines for a specific user
      const serviceLines = await getUserServiceLines(userId);
      return NextResponse.json(successResponse(serviceLines));
    } else {
      // Get all service line users
      const allServiceLines = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR'];
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
 * Grant user access to a service line (admin only)
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

    const body = await request.json();
    const { userId, serviceLine, role } = body;

    if (!userId || !serviceLine) {
      return NextResponse.json(
        { error: 'userId and serviceLine are required' },
        { status: 400 }
      );
    }

    await grantServiceLineAccess(userId, serviceLine, role || 'USER');

    // Create in-app notification (non-blocking)
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (targetUser) {
        const notification = createServiceLineAddedNotification(
          serviceLine,
          user.name || user.email,
          role || 'USER'
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
      successResponse({ message: 'Access granted successfully' }),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/service-line-access');
  }
}

/**
 * PUT /api/admin/service-line-access
 * Update user's role in a service line (admin only)
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

    const body = await request.json();
    const { id, role } = body;

    if (!id || !role) {
      return NextResponse.json(
        { error: 'id and role are required', received: { id, role } },
        { status: 400 }
      );
    }

    // Update by ServiceLineUser id
    // Get existing record to capture old role and user details
    const existingRecord = await prisma.serviceLineUser.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Service line access record not found' },
        { status: 404 }
      );
    }

    const oldRole = existingRecord.role;

    await prisma.serviceLineUser.update({
      where: { id },
      data: { role },
    });

    // Create in-app notification (non-blocking)
    try {
      if (existingRecord.User) {
        const notification = createServiceLineRoleChangedNotification(
          existingRecord.serviceLine,
          user.name || user.email,
          oldRole,
          role
        );

        await notificationService.createNotification(
          existingRecord.userId,
          NotificationType.SERVICE_LINE_ROLE_CHANGED,
          notification.title,
          notification.message,
          undefined,
          notification.actionUrl,
          user.id
        );
      }
    } catch (notificationError) {
      logger.error('Failed to create service line role changed notification:', notificationError);
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
 * Revoke user access to a service line (admin only)
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
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const id = Number.parseInt(idStr, 10);

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'id must be a valid number' },
        { status: 400 }
      );
    }

    // Delete by ServiceLineUser id
    // Check if the record exists before attempting deletion
    const existingRecord = await prisma.serviceLineUser.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Service line access record not found' },
        { status: 404 }
      );
    }

    await prisma.serviceLineUser.delete({
      where: { id },
    });

    // Create in-app notification (non-blocking)
    try {
      if (existingRecord.User) {
        const notification = createServiceLineRemovedNotification(
          existingRecord.serviceLine,
          user.name || user.email
        );

        await notificationService.createNotification(
          existingRecord.userId,
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
      successResponse({ message: 'Access revoked successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/service-line-access');
  }
}


