import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ExcelExporter } from '@/lib/services/export/excelExporter';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import type { TaskId } from '@/types/branded';
import type { TaxExportData } from '@/types/api';

/**
 * Export tax calculation data
 */
export async function exportTaxCalculation(
  taskId: TaskId,
  format: string,
  accountingProfit: number
): Promise<NextResponse> {
  // Fetch project
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
  }

  // Fetch approved/modified adjustments
  const adjustments = await prisma.taxAdjustment.findMany({
    where: {
      taskId,
      status: {
        in: ['APPROVED', 'MODIFIED'],
      },
    },
    orderBy: {
      type: 'asc',
    },
  });

  // Calculate totals
  const debitAdjustments = adjustments.filter((a) => a.type === 'DEBIT');
  const creditAdjustments = adjustments.filter((a) => a.type === 'CREDIT');
  const allowanceAdjustments = adjustments.filter((a) => a.type === 'ALLOWANCE');

  const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalCredits = creditAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalAllowances = allowanceAdjustments.reduce(
    (sum, a) => sum + Math.abs(a.amount),
    0
  );

  const taxableIncome = accountingProfit + totalDebits - totalCredits + totalAllowances;
  const taxLiability = Math.max(0, taxableIncome) * 0.27;

  const exportData: TaxExportData = {
    taskName: task.TaskDesc,
    accountingProfit,
    adjustments: adjustments.map((adj) => ({
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
      return await exportToExcel(exportData);

    case 'pdf':
      throw new AppError(
        501,
        'PDF export not yet implemented',
        ErrorCodes.VALIDATION_ERROR
      );

    case 'xml':
      throw new AppError(
        501,
        'XML export not yet implemented',
        ErrorCodes.VALIDATION_ERROR
      );

    default:
      throw new AppError(
        400,
        `Unsupported format: ${format}`,
        ErrorCodes.VALIDATION_ERROR
      );
  }
}

/**
 * Export to Excel format
 */
async function exportToExcel(data: TaxExportData): Promise<NextResponse> {
  const buffer = await ExcelExporter.exportTaxComputation(data);
  const fileName = ExcelExporter.generateFileName(data.taskName);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    },
  });
}







































