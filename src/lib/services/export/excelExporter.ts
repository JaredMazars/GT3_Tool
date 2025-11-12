import * as XLSX from 'xlsx';

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
  projectName: string;
  accountingProfit: number;
  adjustments: TaxAdjustment[];
  taxableIncome: number;
  taxLiability: number;
}

export class ExcelExporter {
  /**
   * Export tax computation to Excel workbook
   */
  static exportTaxComputation(data: ExportData): Buffer {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Tax Computation
    this.addTaxComputationSheet(workbook, data);

    // Sheet 2: Adjustments Detail
    this.addAdjustmentsDetailSheet(workbook, data);

    // Sheet 3: Reconciliation
    this.addReconciliationSheet(workbook, data);

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Create Tax Computation sheet
   */
  private static addTaxComputationSheet(workbook: XLSX.WorkBook, data: ExportData) {
    const approvedAdjustments = data.adjustments.filter(
      a => a.status === 'APPROVED' || a.status === 'MODIFIED'
    );

    const debitAdjustments = approvedAdjustments.filter(a => a.type === 'DEBIT');
    const creditAdjustments = approvedAdjustments.filter(a => a.type === 'CREDIT');
    const allowanceAdjustments = approvedAdjustments.filter(a => a.type === 'ALLOWANCE');

    const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalCredits = creditAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalAllowances = allowanceAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);

    const rows: any[][] = [
      ['TAX COMPUTATION - IT14', ''],
      ['Project:', data.projectName],
      ['Date:', new Date().toLocaleDateString()],
      ['', ''],
      ['Description', 'Amount (R)'],
      ['', ''],
      ['Accounting Profit / (Loss)', data.accountingProfit],
      ['', ''],
      ['ADD: DEBIT ADJUSTMENTS', ''],
    ];

    // Add debit adjustments
    debitAdjustments.forEach(adj => {
      rows.push([`  ${adj.description}`, Math.abs(adj.amount)]);
    });
    rows.push(['Total Debit Adjustments', totalDebits]);
    rows.push(['', '']);

    rows.push(['LESS: CREDIT ADJUSTMENTS', '']);
    // Add credit adjustments
    creditAdjustments.forEach(adj => {
      rows.push([`  ${adj.description}`, -Math.abs(adj.amount)]);
    });
    rows.push(['Total Credit Adjustments', -totalCredits]);
    rows.push(['', '']);

    if (allowanceAdjustments.length > 0) {
      rows.push(['ADD: ALLOWANCES / RECOUPMENTS', '']);
      allowanceAdjustments.forEach(adj => {
        rows.push([`  ${adj.description}`, Math.abs(adj.amount)]);
      });
      rows.push(['Total Allowances', totalAllowances]);
      rows.push(['', '']);
    }

    rows.push(['TAXABLE INCOME', data.taxableIncome]);
    rows.push(['', '']);
    rows.push(['Tax Rate (Corporate)', '27%']);
    rows.push(['TAX LIABILITY', data.taxLiability]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 60 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tax Computation');
  }

  /**
   * Create Adjustments Detail sheet
   */
  private static addAdjustmentsDetailSheet(workbook: XLSX.WorkBook, data: ExportData) {
    const rows: any[][] = [
      ['ADJUSTMENTS DETAIL', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['ID', 'Type', 'Description', 'Amount (R)', 'SARS Section', 'Status', 'Notes'],
    ];

    data.adjustments.forEach(adj => {
      rows.push([
        adj.id,
        adj.type,
        adj.description,
        Math.abs(adj.amount),
        adj.sarsSection || '',
        adj.status,
        adj.notes || '',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 50 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 60 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adjustments Detail');
  }

  /**
   * Create Reconciliation sheet
   */
  private static addReconciliationSheet(workbook: XLSX.WorkBook, data: ExportData) {
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

    const rows: any[][] = [
      ['RECONCILIATION', ''],
      ['Accounting vs Tax Income', ''],
      ['', ''],
      ['Description', 'Amount (R)'],
      ['', ''],
      ['Accounting Profit (per IFRS)', data.accountingProfit],
      ['Tax Adjustments (net)', totalAdjustments],
      ['Taxable Income (per Tax Act)', data.taxableIncome],
      ['', ''],
      ['Verification:', ''],
      ['Calculated Taxable Income', `=${data.accountingProfit} + ${totalAdjustments}`],
      ['Should Equal', data.taxableIncome],
      ['Difference', data.taxableIncome - (data.accountingProfit + totalAdjustments)],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 40 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reconciliation');
  }

  /**
   * Generate filename for export
   */
  static generateFileName(projectName: string): string {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    return `Tax_Computation_${sanitizedName}_${date}.xlsx`;
  }
}


