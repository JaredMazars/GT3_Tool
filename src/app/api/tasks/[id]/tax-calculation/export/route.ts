import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { exportTaxCalculation } from '@/lib/tools/tax-calculation/api/exportHandler';
import { getTaxCalculationData } from '@/lib/tools/tax-calculation/api/taxCalculationHandler';
import { toTaskId } from '@/types/branded';

// Allowed export formats
const ALLOWED_FORMATS = ['excel', 'pdf', 'csv'] as const;
type ExportFormat = (typeof ALLOWED_FORMATS)[number];

/**
 * GET /api/tasks/[id]/tax-calculation/export?format=excel
 * Export tax calculation in various formats
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const brandedTaskId = toTaskId(taskId);
    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get('format') || 'excel';

    // Validate format against allowlist
    if (!ALLOWED_FORMATS.includes(formatParam as ExportFormat)) {
      throw new AppError(
        400,
        `Invalid export format. Allowed: ${ALLOWED_FORMATS.join(', ')}`,
        ErrorCodes.VALIDATION_ERROR,
        { providedFormat: formatParam }
      );
    }

    // Get accounting profit from tax calculation data
    const taxCalcData = await getTaxCalculationData(brandedTaskId);
    const accountingProfit = taxCalcData.netProfit || 0;

    // Export using tool handler
    return await exportTaxCalculation(brandedTaskId, formatParam, accountingProfit);
  },
});
