import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getPermissionMatrix } from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';

/**
 * GET /api/permissions/matrix
 * Get the full permission matrix for admin UI
 * Requires SYSTEM_ADMIN or ADMINISTRATOR role
 */
export async function GET(request: NextRequest) {
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

    const matrix = await getPermissionMatrix();
    return NextResponse.json(successResponse(matrix));
  } catch (error) {
    return handleApiError(error, 'GET /api/permissions/matrix');
  }
}



