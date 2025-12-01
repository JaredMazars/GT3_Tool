import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkUserPermission, PermissionAction } from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { z } from 'zod';

const CheckPermissionSchema = z.object({
  resourceKey: z.string(),
  action: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE']),
});

/**
 * POST /api/permissions/check
 * Check if the current user has permission for a specific action
 * Returns { hasPermission: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = CheckPermissionSchema.parse(body);

    const hasPermission = await checkUserPermission(
      user.id,
      validated.resourceKey,
      validated.action as PermissionAction
    );

    return NextResponse.json(
      successResponse({ hasPermission })
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/permissions/check');
  }
}









