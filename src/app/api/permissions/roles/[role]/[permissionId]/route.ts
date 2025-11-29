import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { 
  updateRolePermission, 
  UserRole, 
  PermissionAction 
} from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { z } from 'zod';

const UpdatePermissionSchema = z.object({
  allowedActions: z.array(z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE'])),
});

/**
 * PUT /api/permissions/roles/[role]/[permissionId]
 * Update or create a role permission
 * Requires SYSTEM_ADMIN role
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ role: string; permissionId: string }> }
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

    const { role, permissionId } = await context.params;
    
    // Validate role
    const validRoles: UserRole[] = ['SYSTEM_ADMIN', 'ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER'];
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Validate permission ID
    const permId = parseInt(permissionId);
    if (isNaN(permId)) {
      return NextResponse.json(
        { error: 'Invalid permission ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = UpdatePermissionSchema.parse(body);

    await updateRolePermission(
      role as UserRole,
      permId,
      validated.allowedActions as PermissionAction[]
    );

    return NextResponse.json(
      successResponse({ message: 'Permission updated successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'PUT /api/permissions/roles/[role]/[permissionId]');
  }
}

