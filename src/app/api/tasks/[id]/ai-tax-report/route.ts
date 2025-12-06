import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import {
  getLatestAITaxReport,
  generateAITaxReport,
} from '@/lib/tools/tax-opinion/api/aiTaxReportHandler';

export const maxDuration = 90; // 90 seconds timeout for AI generation

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting for AI operations
    enforceRateLimit(request, RateLimitPresets.AI_ENDPOINTS);
    
    const params = await context.params;
    const taskId = toTaskId(params.id);

    // Get report using tool handler
    const reportData = await getLatestAITaxReport(taskId);

    if (!reportData) {
      return NextResponse.json({ error: 'No AI tax report found' }, { status: 404 });
    }

    return NextResponse.json(reportData);
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[id]/ai-tax-report');
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting for AI operations
    enforceRateLimit(request, RateLimitPresets.AI_ENDPOINTS);
    
    const params = await context.params;
    const taskId = toTaskId(params.id);

    // Generate report using tool handler
    const report = await generateAITaxReport(taskId);

    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/ai-tax-report');
  }
}
