/**
 * Review Notes Analytics API Route
 * GET - Get analytics data for review notes
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getReviewNoteAnalytics } from '@/lib/services/review-notes/reviewNoteAnalyticsService';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';

/**
 * GET /api/tasks/[taskId]/review-notes/analytics
 * Get analytics data for review notes on a task
 */
export const GET = secureRoute.queryWithParams({
  taskIdParam: 'id',
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    // Get analytics
    const analytics = await getReviewNoteAnalytics(taskId);

    const response = NextResponse.json(successResponse(analytics));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  },
});

