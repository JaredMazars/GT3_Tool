import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getRolePermissions, UserRole } from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';

/**
 * GET /api/permissions/roles/[role]
 * Get all permissions for a specific role
 * Requires SYSTEM_ADMIN role
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ role: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is SYSTEM_ADMIN
    if (user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { role } = await context.params;
    
    // Validate role
    const validRoles: UserRole[] = ['PARTNER', 'MANAGER', 'SUPERVISOR', 'ADMINISTRATOR', 'USER', 'VIEWER'];
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const permissions = await getRolePermissions(role as UserRole);
    return NextResponse.json(successResponse(permissions));
  } catch (error) {
    return handleApiError(error, 'GET /api/permissions/roles/[role]');
  }
}



