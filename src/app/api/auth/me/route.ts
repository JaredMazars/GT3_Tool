import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserSystemRole } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';

/**
 * GET /api/auth/me
 * Get current user information including system role
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the system role from database
    const systemRole = await getUserSystemRole(user.id);

    return NextResponse.json(
      successResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: systemRole || user.systemRole || user.role || 'USER',
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/auth/me');
  }
}
















