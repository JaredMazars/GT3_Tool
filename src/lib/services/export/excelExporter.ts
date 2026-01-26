import ExcelJS from 'exceljs';

interface TaxAdjustment {
  id: number;
  type: string;
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
  notes?: string;
}

interface ExportData {
  taskName: string;
  accountingProfit: number;
  adjustments: TaxAdjustment[];
  taxableIncome: number;
  taxLiability: number;
}

export class ExcelExporter {
  /**
   * Export tax computation to Excel workbook
   */
  static async exportTaxComputation(data: ExportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tax Mapper';
    workbook.lastModifiedBy = 'Tax Mapper';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Sheet 1: Tax Computation
    this.addTaxComputationSheet(workbook, data);

    // Sheet 2: Adjustments Detail
    this.addAdjustmentsDetailSheet(workbook, data);

    // Sheet 3: Reconciliation
    this.addReconciliationSheet(workbook, data);

    // Write workbook to buffer
    // Cast to unknown then to Buffer because exceljs returns generic Buffer which might conflict with node's Buffer types in some setups,
    // but usually it's fine. However, writeBuffer returns Promise<Buffer>.
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Create Tax Computation sheet
   */
  private static addTaxComputationSheet(workbook: ExcelJS.Workbook, data: ExportData) {
    const worksheet = workbook.addWorksheet('Tax Computation');

    const approvedAdjustments = data.adjustments.filter(
      a => a.status === 'APPROVED' || a.status === 'MODIFIED'
    );

    const debitAdjustments = approvedAdjustments.filter(a => a.type === 'DEBIT');
    const creditAdjustments = approvedAdjustments.filter(a => a.type === 'CREDIT');
    const allowanceAdjustments = approvedAdjustments.filter(a => a.type === 'ALLOWANCE');

    const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalCredits = creditAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalAllowances = allowanceAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);

    worksheet.addRow(['TAX COMPUTATION - IT14', '']);
    worksheet.addRow(['Task:', data.taskName]);
    worksheet.addRow(['Date:', new Date().toLocaleDateString()]);
    worksheet.addRow(['', '']);
    worksheet.addRow(['Description', 'Amount (R)']);
    worksheet.addRow(['', '']);
    worksheet.addRow(['Accounting Profit / (Loss)', data.accountingProfit]);
    worksheet.addRow(['', '']);
    worksheet.addRow(['ADD: DEBIT ADJUSTMENTS', '']);

    // Add debit adjustments
    debitAdjustments.forEach(adj => {
      worksheet.addRow([`  ${adj.description}`, Math.abs(adj.amount)]);
    });
    worksheet.addRow(['Total Debit Adjustments', totalDebits]);
    worksheet.addRow(['', '']);

    worksheet.addRow(['LESS: CREDIT ADJUSTMENTS', '']);
    // Add credit adjustments
    creditAdjustments.forEach(adj => {
      worksheet.addRow([`  ${adj.description}`, -Math.abs(adj.amount)]);
    });
    worksheet.addRow(['Total Credit Adjustments', -totalCredits]);
    worksheet.addRow(['', '']);

    if (allowanceAdjustments.length > 0) {
      worksheet.addRow(['ADD: ALLOWANCES / RECOUPMENTS', '']);
      allowanceAdjustments.forEach(adj => {
        worksheet.addRow([`  ${adj.description}`, Math.abs(adj.amount)]);
      });
      worksheet.addRow(['Total Allowances', totalAllowances]);
      worksheet.addRow(['', '']);
    }

    worksheet.addRow(['TAXABLE INCOME', data.taxableIncome]);
    worksheet.addRow(['', '']);
    worksheet.addRow(['Tax Rate (Corporate)', '27%']);
    worksheet.addRow(['TAX LIABILITY', data.taxLiability]);

    // Set column widths
    worksheet.getColumn(1).width = 60;
    worksheet.getColumn(2).width = 20;
  }

  /**
   * Create Adjustments Detail sheet
   */
  private static addAdjustmentsDetailSheet(workbook: ExcelJS.Workbook, data: ExportData) {
    const worksheet = workbook.addWorksheet('Adjustments Detail');

    worksheet.addRow(['ADJUSTMENTS DETAIL', '', '', '', '', '']);
    worksheet.addRow(['', '', '', '', '', '']);
    worksheet.addRow(['ID', 'Type', 'Description', 'Amount (R)', 'SARS Section', 'Status', 'Notes']);

    data.adjustments.forEach(adj => {
      worksheet.addRow([
        adj.id,
        adj.type,
        adj.description,
        Math.abs(adj.amount),
        adj.sarsSection || '',
        adj.status,
        adj.notes || '',
      ]);
    });

    // Set column widths
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 12;
    worksheet.getColumn(3).width = 50;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 12;
    worksheet.getColumn(7).width = 60;
  }

  /**
   * Create Reconciliation sheet
   */
  private static addReconciliationSheet(workbook: ExcelJS.Workbook, data: ExportData) {
    const worksheet = workbook.addWorksheet('Reconciliation');

    const approvedAdjustments = data.adjustments.filter(
      a => a.status === 'APPROVED' || a.status === 'MODIFIED'
    );

    const totalAdjustments = approvedAdjustments.reduce((sum, a) => {
      if (a.type === 'DEBIT' || a.type === 'ALLOWANCE') {
        return sum + Math.abs(a.amount);
      } else {
        return sum - Math.abs(a.amount);
      }
    }, 0);

    worksheet.addRow(['RECONCILIATION', '']);
    worksheet.addRow(['Accounting vs Tax Income', '']);
    worksheet.addRow(['', '']);
    worksheet.addRow(['Description', 'Amount (R)']);
    worksheet.addRow(['', '']);
    worksheet.addRow(['Accounting Profit (per IFRS)', data.accountingProfit]);
    worksheet.addRow(['Tax Adjustments (net)', totalAdjustments]);
    worksheet.addRow(['Taxable Income (per Tax Act)', data.taxableIncome]);
    worksheet.addRow(['', '']);
    worksheet.addRow(['Verification:', '']);
    worksheet.addRow(['Calculated Taxable Income', { formula: `${data.accountingProfit} + ${totalAdjustments}` }]);
    worksheet.addRow(['Should Equal', data.taxableIncome]);
    worksheet.addRow(['Difference', data.taxableIncome - (data.accountingProfit + totalAdjustments)]);

    worksheet.getColumn(1).width = 40;
    worksheet.getColumn(2).width = 20;
  }

  /**
   * Generate filename for export
   */
  static generateFileName(taskName: string): string {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedName = taskName.replace(/[^a-zA-Z0-9]/g, '_');
    return `Tax_Computation_${sanitizedName}_${date}.xlsx`;
  }
}

