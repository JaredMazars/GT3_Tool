import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { canApproveAcceptance } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toProjectId } from '@/types/branded';

/**
 * GET /api/projects/[id]/permissions/approve-acceptance
 * Check if current user can approve acceptance for this project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const projectId = toProjectId(id);

    const allowed = await canApproveAcceptance(user.id, projectId);

    return NextResponse.json(
      successResponse({
        allowed,
        reason: allowed
          ? 'User has approval permission'
          : 'Only Partners and System Administrators can approve',
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/permissions/approve-acceptance');
  }
}


