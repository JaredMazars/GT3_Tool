import { NextResponse, NextRequest } from 'next/server';
import { parseTaskId, successResponse, getTaskOrThrow } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getTaxCalculationData } from '@/lib/tools/tax-calculation/api/taxCalculationHandler';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const taskId = parseTaskId(params?.id);
    
    // Verify project exists
    await getTaskOrThrow(taskId);
    
    // Get tax calculation data from tool handler
    const data = await getTaxCalculationData(taskId);

    return NextResponse.json(successResponse(data));
  } catch (error) {
    return handleApiError(error, 'Fetch Tax Calculation');
  }
} 