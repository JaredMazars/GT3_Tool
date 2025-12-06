import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { parseTaskId } from '@/lib/utils/apiUtils';
import { exportTaxCalculation } from '@/lib/tools/tax-calculation/api/exportHandler';
import { getTaxCalculationData } from '@/lib/tools/tax-calculation/api/taxCalculationHandler';

/**
 * GET /api/tasks/[id]/tax-calculation/export?format=excel
 * Export tax calculation in various formats
 */
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
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';

    // Get accounting profit from tax calculation data
    const taxCalcData = await getTaxCalculationData(taskId);
    const accountingProfit = taxCalcData.netProfit || 0;

    // Export using tool handler
    return await exportTaxCalculation(taskId, format, accountingProfit);
  } catch (error) {
    return handleApiError(error, 'Tax Calculation Export');
  }
}


