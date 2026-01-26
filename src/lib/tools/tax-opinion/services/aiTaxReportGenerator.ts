import { generateObject } from 'ai';
import { models } from '@/lib/ai/config';
import { AITaxReportSchema } from '@/lib/ai/schemas';

export interface AITaxReportData {
  executiveSummary: string;
  risks: Array<{
    title: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  taxSensitiveItems: Array<{
    item: string;
    reason: string;
    action: string;
  }>;
  detailedFindings: string;
  recommendations: string[];
  generatedAt: string;
}

export interface ProjectTaxData {
  taskName: string;
  trialBalance: {
    totalCurrentYear: number;
    totalPriorYear: number;
    accountCount: number;
  };
  balanceSheet: {
    totalAssets: number;
    totalEquity: number;
    totalLiabilities: number;
  };
  incomeStatement: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
  };
  taxCalculation: {
    accountingProfit: number;
    totalDebitAdjustments: number;
    totalCreditAdjustments: number;
    totalAllowances: number;
    totalRecoupments: number;
    taxableIncome: number;
    taxLiability: number;
    adjustments: Array<{
      type: string;
      description: string;
      amount: number;
      sarsSection?: string;
      notes?: string;
      confidenceScore?: number;
    }>;
  };
}

export class AITaxReportGenerator {
  /**
   * Generate comprehensive AI tax report
   */
  static async generateTaxReport(taskData: ProjectTaxData): Promise<AITaxReportData> {
    try {
      const prompt = this.buildPrompt(taskData);
      
      const { object } = await generateObject({
        model: models.mini,
        schema: AITaxReportSchema,
        system: `You are an expert South African tax consultant with deep knowledge of the Income Tax Act and SARS regulations. You provide comprehensive, professional tax analysis reports that identify risks, highlight tax-sensitive items, and offer actionable recommendations. Your analysis should be thorough, detailed, and reference specific SARS sections where applicable.

CRITICAL: You MUST use ONLY the exact figures provided in the data - NEVER recalculate or generate different amounts. All financial calculations have been pre-calculated and verified. Your role is to analyze the provided figures, not to recalculate them. When citing any amount in your analysis, use the exact numbers from the provided data.`,
        prompt,
      });
      
      return {
        ...object,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error('Failed to generate AI tax report. Please try again.');
    }
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private static buildPrompt(taskData: ProjectTaxData): string {
    // Group adjustments by type
    const debitAdjustments = taskData.taxCalculation.adjustments.filter(a => a.type === 'DEBIT');
    const creditAdjustments = taskData.taxCalculation.adjustments.filter(a => a.type === 'CREDIT');
    const allowanceAdjustments = taskData.taxCalculation.adjustments.filter(a => a.type === 'ALLOWANCE');
    const recoupmentAdjustments = taskData.taxCalculation.adjustments.filter(a => a.type === 'RECOUPMENT');

    return `Analyze the following South African corporate tax data and provide a comprehensive tax report in JSON format.

TASK: ${taskData.taskName}

=================================================================================
KEY FIGURES REFERENCE - USE THESE EXACT AMOUNTS IN YOUR ANALYSIS
=================================================================================

FINANCIAL POSITION:
- Total Assets: R${this.formatAmount(taskData.balanceSheet.totalAssets)}
- Total Equity: R${this.formatAmount(taskData.balanceSheet.totalEquity)}
- Total Liabilities: R${this.formatAmount(taskData.balanceSheet.totalLiabilities)}

INCOME STATEMENT:
- Revenue: R${this.formatAmount(taskData.incomeStatement.totalRevenue)}
- Expenses: R${this.formatAmount(taskData.incomeStatement.totalExpenses)}
- Net Profit (Accounting): R${this.formatAmount(taskData.incomeStatement.netProfit)}

TAX COMPUTATION SUMMARY:
- Accounting Profit: R${this.formatAmount(taskData.taxCalculation.accountingProfit)}
- Total Debit Adjustments: R${this.formatAmount(taskData.taxCalculation.totalDebitAdjustments)}
- Total Credit Adjustments: R${this.formatAmount(taskData.taxCalculation.totalCreditAdjustments)}
- Total Allowances: R${this.formatAmount(taskData.taxCalculation.totalAllowances)}
- Total Recoupments: R${this.formatAmount(taskData.taxCalculation.totalRecoupments)}
- TAXABLE INCOME: R${this.formatAmount(taskData.taxCalculation.taxableIncome)}
- TAX LIABILITY (27%): R${this.formatAmount(taskData.taxCalculation.taxLiability)}

=================================================================================
TAX CALCULATION VERIFICATION TABLE
=================================================================================
Accounting Profit:                R${this.formatAmount(taskData.taxCalculation.accountingProfit)}
Add: Debit Adjustments:          R${this.formatAmount(taskData.taxCalculation.totalDebitAdjustments)}
Less: Credit Adjustments:        (R${this.formatAmount(taskData.taxCalculation.totalCreditAdjustments)})
Less: Allowances:                (R${this.formatAmount(taskData.taxCalculation.totalAllowances)})
Add: Recoupments:                 R${this.formatAmount(taskData.taxCalculation.totalRecoupments)}
                                  ─────────────────────
TAXABLE INCOME:                   R${this.formatAmount(taskData.taxCalculation.taxableIncome)}
                                  ═════════════════════
Tax @ 27%:                        R${this.formatAmount(taskData.taxCalculation.taxLiability)}

=================================================================================
ADJUSTMENTS BY CATEGORY
=================================================================================

DEBIT ADJUSTMENTS (${debitAdjustments.length} items, Total: R${this.formatAmount(taskData.taxCalculation.totalDebitAdjustments)}):
${debitAdjustments.length > 0 ? debitAdjustments.map((adj, idx) => `
${idx + 1}. ${adj.description}
   Amount: R${this.formatAmount(Math.abs(adj.amount))}
   ${adj.sarsSection ? `SARS Section: ${adj.sarsSection}` : ''}
   ${adj.notes ? `Notes: ${adj.notes}` : ''}
   ${adj.confidenceScore ? `AI Confidence: ${Math.round(adj.confidenceScore * 100)}%` : ''}
`).join('\n') : '(No debit adjustments)'}

CREDIT ADJUSTMENTS (${creditAdjustments.length} items, Total: R${this.formatAmount(taskData.taxCalculation.totalCreditAdjustments)}):
${creditAdjustments.length > 0 ? creditAdjustments.map((adj, idx) => `
${idx + 1}. ${adj.description}
   Amount: R${this.formatAmount(Math.abs(adj.amount))}
   ${adj.sarsSection ? `SARS Section: ${adj.sarsSection}` : ''}
   ${adj.notes ? `Notes: ${adj.notes}` : ''}
   ${adj.confidenceScore ? `AI Confidence: ${Math.round(adj.confidenceScore * 100)}%` : ''}
`).join('\n') : '(No credit adjustments)'}

ALLOWANCES (${allowanceAdjustments.length} items, Total: R${this.formatAmount(taskData.taxCalculation.totalAllowances)}):
${allowanceAdjustments.length > 0 ? allowanceAdjustments.map((adj, idx) => `
${idx + 1}. ${adj.description}
   Amount: R${this.formatAmount(Math.abs(adj.amount))}
   ${adj.sarsSection ? `SARS Section: ${adj.sarsSection}` : ''}
   ${adj.notes ? `Notes: ${adj.notes}` : ''}
   ${adj.confidenceScore ? `AI Confidence: ${Math.round(adj.confidenceScore * 100)}%` : ''}
`).join('\n') : '(No allowances)'}

RECOUPMENTS (${recoupmentAdjustments.length} items, Total: R${this.formatAmount(taskData.taxCalculation.totalRecoupments)}):
${recoupmentAdjustments.length > 0 ? recoupmentAdjustments.map((adj, idx) => `
${idx + 1}. ${adj.description}
   Amount: R${this.formatAmount(Math.abs(adj.amount))}
   ${adj.sarsSection ? `SARS Section: ${adj.sarsSection}` : ''}
   ${adj.notes ? `Notes: ${adj.notes}` : ''}
   ${adj.confidenceScore ? `AI Confidence: ${Math.round(adj.confidenceScore * 100)}%` : ''}
`).join('\n') : '(No recoupments)'}

=================================================================================
CRITICAL INSTRUCTIONS
=================================================================================
⚠️  YOU MUST USE THE EXACT FIGURES PROVIDED ABOVE - DO NOT RECALCULATE ANY AMOUNTS
⚠️  When citing amounts in your analysis, use the exact numbers from the KEY FIGURES REFERENCE
⚠️  All calculations have been verified and are correct
⚠️  Your role is to ANALYZE the provided data, not to recalculate or generate different numbers
⚠️  Do not perform mathematical operations - cite the pre-calculated totals shown above

=================================================================================
REQUIRED OUTPUT FORMAT
=================================================================================

Please provide a comprehensive tax analysis report in the following JSON format:

{
  "executiveSummary": "2-3 paragraph executive summary covering: overall tax position, key adjustments, effective tax rate analysis, and major findings. MUST cite the exact figures from the KEY FIGURES REFERENCE above.",
  
  "risks": [
    {
      "title": "Brief risk title",
      "severity": "high|medium|low",
      "description": "Detailed description of the tax risk, including potential exposure and SARS scrutiny areas. When referencing amounts, use exact figures from above.",
      "recommendation": "Specific action to mitigate this risk"
    }
  ],
  
  "taxSensitiveItems": [
    {
      "item": "Specific line item or adjustment",
      "reason": "Why this requires special attention (SARS focus area, documentation requirements, etc.)",
      "action": "Required action or documentation needed"
    }
  ],
  
  "detailedFindings": "Comprehensive 4-6 paragraph analysis covering: reconciliation from accounting profit to taxable income (using EXACT amounts from the TAX CALCULATION VERIFICATION TABLE), analysis of each adjustment category (citing the exact totals provided for debits, credits, allowances, recoupments), assessment of adjustment appropriateness, identification of missing adjustments or potential errors, comparison of effective tax rate to statutory rate, and any red flags or unusual items. Reference the exact revenue, expenses, and net profit figures provided.",
  
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "... (provide 8-12 detailed recommendations covering: documentation improvements, tax planning opportunities, compliance considerations, areas requiring professional review, timing considerations, and risk mitigation strategies)"
  ]
}

IMPORTANT REQUIREMENTS:
- You MUST use the EXACT figures provided in the KEY FIGURES REFERENCE section
- When citing amounts, always reference the properly formatted amounts with R prefix - DO NOT include unformatted numbers
- All calculations have been verified - your role is to analyze, not recalculate
- Identify at least 5-10 risks across different severity levels
- Highlight 8-15 tax-sensitive items that require attention
- Provide detailed, line-by-line analysis in detailedFindings using the exact amounts shown
- Include 8-12 actionable recommendations
- Reference specific SARS sections (e.g., s11(a), s23, s8C) where relevant
- Consider South African tax law, including allowances (s11-13), recoupments (s8), and general deductions
- Flag any adjustments with low confidence scores or missing documentation
- Consider timing issues, provisional tax implications, and SARS audit risks
- The taxable income and tax liability figures are pre-calculated and must be used as-is`;
  }

  /**
   * Format amount with thousand separators
   */
  private static formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}







