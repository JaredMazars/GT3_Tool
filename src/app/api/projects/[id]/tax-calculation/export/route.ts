import { NextRequest, NextResponse } from 'next/server';
import { ExcelExporter } from '@/lib/services/export/excelExporter';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { parseProjectId } from '@/lib/utils/apiUtils';
import type { TaxExportData } from '@/types/api';

/**
 * GET /api/projects/[id]/tax-calculation/export?format=excel
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
    const projectId = parseProjectId(params?.id);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new AppError(404, 'Project not found', ErrorCodes.NOT_FOUND);
    }

    // Fetch approved/modified adjustments
    const adjustments = await prisma.taxAdjustment.findMany({
      where: {
        projectId,
        status: {
          in: ['APPROVED', 'MODIFIED'],
        },
      },
      orderBy: {
        type: 'asc',
      },
    });

    // Fetch accounting profit from income statement (net profit before tax adjustments)
    const incomeResponse = await fetch(
      `${request.nextUrl.origin}/api/projects/${projectId}/tax-calculation`
    );
    let accountingProfit = 0;
    if (incomeResponse.ok) {
      const incomeData = await incomeResponse.json();
      accountingProfit = incomeData.netProfit || 0;
    }

    // Calculate totals
    const debitAdjustments = adjustments.filter(a => a.type === 'DEBIT');
    const creditAdjustments = adjustments.filter(a => a.type === 'CREDIT');
    const allowanceAdjustments = adjustments.filter(a => a.type === 'ALLOWANCE');

    const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalCredits = creditAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalAllowances = allowanceAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);

    const taxableIncome = accountingProfit + totalDebits - totalCredits + totalAllowances;
    const taxLiability = Math.max(0, taxableIncome) * 0.27;

    const exportData: TaxExportData = {
      projectName: project.name,
      accountingProfit,
      adjustments: adjustments.map(adj => ({
        id: adj.id,
        type: adj.type as 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT',
        description: adj.description,
        amount: adj.amount,
        status: adj.status,
        sarsSection: adj.sarsSection || undefined,
        notes: adj.notes || undefined,
      })),
      taxableIncome,
      taxLiability,
    };

    // Export based on format
    switch (format.toLowerCase()) {
      case 'excel':
        return exportToExcel(exportData);
      
      case 'pdf':
        throw new AppError(501, 'PDF export not yet implemented', ErrorCodes.VALIDATION_ERROR);
      
      case 'xml':
        throw new AppError(501, 'XML export not yet implemented', ErrorCodes.VALIDATION_ERROR);
      
      default:
        throw new AppError(400, `Unsupported format: ${format}`, ErrorCodes.VALIDATION_ERROR);
    }
  } catch (error) {
    return handleApiError(error, 'Tax Calculation Export');
  }
}

/**
 * Export to Excel format
 */
function exportToExcel(data: TaxExportData): NextResponse {
  const buffer = ExcelExporter.exportTaxComputation(data);
  const fileName = ExcelExporter.generateFileName(data.projectName);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    },
  });
}


