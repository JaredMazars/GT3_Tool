import { NextRequest, NextResponse } from 'next/server';
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
    const { prisma } = await import('@/lib/db/prisma');
    await prisma.serviceLineUser.update({
      where: { id },
      data: { role },
    });

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

    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'id must be a valid number' },
        { status: 400 }
      );
    }

    // Delete by ServiceLineUser id
    const { prisma } = await import('@/lib/db/prisma');
    
    // Check if the record exists before attempting deletion
    const existingRecord = await prisma.serviceLineUser.findUnique({
      where: { id },
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

    return NextResponse.json(
      successResponse({ message: 'Access revoked successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/service-line-access');
  }
}

