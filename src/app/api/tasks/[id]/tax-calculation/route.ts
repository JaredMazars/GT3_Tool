import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { getTaxCalculationData } from '@/lib/tools/tax-calculation/api/taxCalculationHandler';
import { toTaskId } from '@/types/branded';

/**
 * GET /api/tasks/[id]/tax-calculation
 * Get tax calculation data for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const brandedTaskId = toTaskId(taskId);

    // Get tax calculation data from tool handler
    const data = await getTaxCalculationData(brandedTaskId);

    return NextResponse.json(successResponse(data));
  },
});
