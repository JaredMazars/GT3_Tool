import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ExcelExporter } from '@/lib/exporters/excelExporter';

const prisma = new PrismaClient();

/**
 * GET /api/projects/[id]/tax-calculation/export?format=excel
 * Export tax calculation in various formats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
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

    const exportData = {
      projectName: project.name,
      accountingProfit,
      adjustments: adjustments.map(adj => ({
        id: adj.id,
        type: adj.type,
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
        return NextResponse.json(
          { error: 'PDF export not yet implemented' },
          { status: 501 }
        );
      
      case 'xml':
        return NextResponse.json(
          { error: 'XML export not yet implemented' },
          { status: 501 }
        );
      
      default:
        return NextResponse.json(
          { error: `Unsupported format: ${format}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export tax calculation' },
      { status: 500 }
    );
  }
}

/**
 * Export to Excel format
 */
function exportToExcel(data: any): NextResponse {
  const buffer = ExcelExporter.exportTaxComputation(data);
  const fileName = ExcelExporter.generateFileName(data.projectName);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    },
  });
}


