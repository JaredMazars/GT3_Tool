import { NextResponse } from 'next/server';
import { canApproveAcceptance } from '@/lib/services/auth/authorization';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/tasks/[id]/permissions/approve-acceptance
 * Check if current user can approve acceptance for this task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const brandedTaskId = toTaskId(taskId);

    const allowed = await canApproveAcceptance(user.id, brandedTaskId);

    return NextResponse.json(successResponse({ allowed }), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  },
});
