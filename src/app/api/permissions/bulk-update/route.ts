import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { 
  bulkUpdateRolePermissions, 
  UserRole, 
  PermissionAction 
} from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { z } from 'zod';

const BulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      role: z.enum(['PARTNER', 'MANAGER', 'SUPERVISOR', 'ADMINISTRATOR', 'USER', 'VIEWER']),
      permissionId: z.number(),
      actions: z.array(z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE'])),
    })
  ),
});

/**
 * POST /api/permissions/bulk-update
 * Bulk update role permissions
 * Requires SYSTEM_ADMIN role
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validated = BulkUpdateSchema.parse(body);

    await bulkUpdateRolePermissions(
      validated.updates.map(update => ({
        role: update.role as UserRole,
        permissionId: update.permissionId,
        actions: update.actions as PermissionAction[],
      }))
    );

    return NextResponse.json(
      successResponse({ 
        message: 'Permissions updated successfully',
        updatedCount: validated.updates.length 
      })
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/permissions/bulk-update');
  }
}



