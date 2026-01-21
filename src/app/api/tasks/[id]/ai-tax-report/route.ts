import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import {
  getLatestAITaxReport,
  generateAITaxReport,
} from '@/lib/tools/tax-opinion/api/aiTaxReportHandler';

export const maxDuration = 90; // 90 seconds timeout for AI generation

/**
 * GET /api/tasks/[id]/ai-tax-report
 * Get latest AI tax report for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);
    // Get report using tool handler
    const reportData = await getLatestAITaxReport(taskId);

    if (!reportData) {
      throw new AppError(404, 'No AI tax report found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(
      reportData,
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },
});

/**
 * POST /api/tasks/[id]/ai-tax-report
 * Generate new AI tax report for a task
 */
export const POST = secureRoute.aiWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);
    // Generate report using tool handler
    const report = await generateAITaxReport(taskId);

    return NextResponse.json(report);
  },
});
