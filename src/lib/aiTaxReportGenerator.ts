import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  projectName: string;
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
  static async generateTaxReport(projectData: ProjectTaxData): Promise<AITaxReportData> {
    try {
      const prompt = this.buildPrompt(projectData);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert South African tax consultant with deep knowledge of the Income Tax Act and SARS regulations. You provide comprehensive, professional tax analysis reports that identify risks, highlight tax-sensitive items, and offer actionable recommendations. Your analysis should be thorough, detailed, and reference specific SARS sections where applicable.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(responseContent);
      
      return {
        executiveSummary: parsedResponse.executiveSummary || '',
        risks: parsedResponse.risks || [],
        taxSensitiveItems: parsedResponse.taxSensitiveItems || [],
        detailedFindings: parsedResponse.detailedFindings || '',
        recommendations: parsedResponse.recommendations || [],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error generating AI tax report:', error);
      throw new Error('Failed to generate AI tax report. Please try again.');
    }
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private static buildPrompt(data: ProjectTaxData): string {
    return `Analyze the following South African corporate tax data and provide a comprehensive tax report in JSON format.

PROJECT: ${data.projectName}

FINANCIAL SUMMARY:
- Total Assets: R${this.formatAmount(data.balanceSheet.totalAssets)}
- Total Equity: R${this.formatAmount(data.balanceSheet.totalEquity)}
- Total Liabilities: R${this.formatAmount(data.balanceSheet.totalLiabilities)}
- Revenue: R${this.formatAmount(data.incomeStatement.totalRevenue)}
- Expenses: R${this.formatAmount(data.incomeStatement.totalExpenses)}
- Net Profit (Accounting): R${this.formatAmount(data.incomeStatement.netProfit)}

TAX COMPUTATION:
- Accounting Profit: R${this.formatAmount(data.taxCalculation.accountingProfit)}
- Debit Adjustments: R${this.formatAmount(data.taxCalculation.totalDebitAdjustments)}
- Credit Adjustments: R${this.formatAmount(data.taxCalculation.totalCreditAdjustments)}
- Allowances: R${this.formatAmount(data.taxCalculation.totalAllowances)}
- Recoupments: R${this.formatAmount(data.taxCalculation.totalRecoupments)}
- Taxable Income: R${this.formatAmount(data.taxCalculation.taxableIncome)}
- Tax Liability (27%): R${this.formatAmount(data.taxCalculation.taxLiability)}

DETAILED ADJUSTMENTS (${data.taxCalculation.adjustments.length} total):
${data.taxCalculation.adjustments.map((adj, idx) => `
${idx + 1}. [${adj.type}] ${adj.description}
   Amount: R${this.formatAmount(Math.abs(adj.amount))}
   ${adj.sarsSection ? `SARS Section: ${adj.sarsSection}` : ''}
   ${adj.notes ? `Notes: ${adj.notes}` : ''}
   ${adj.confidenceScore ? `AI Confidence: ${Math.round(adj.confidenceScore * 100)}%` : ''}
`).join('\n')}

Please provide a comprehensive tax analysis report in the following JSON format:

{
  "executiveSummary": "2-3 paragraph executive summary covering: overall tax position, key adjustments, effective tax rate analysis, and major findings",
  
  "risks": [
    {
      "title": "Brief risk title",
      "severity": "high|medium|low",
      "description": "Detailed description of the tax risk, including potential exposure and SARS scrutiny areas",
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
  
  "detailedFindings": "Comprehensive 4-6 paragraph analysis covering: reconciliation from accounting profit to taxable income, analysis of each adjustment category (debits, credits, allowances, recoupments), assessment of adjustment appropriateness, identification of missing adjustments or potential errors, comparison of effective tax rate to statutory rate, and any red flags or unusual items",
  
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "... (provide 8-12 detailed recommendations covering: documentation improvements, tax planning opportunities, compliance considerations, areas requiring professional review, timing considerations, and risk mitigation strategies)"
  ]
}

IMPORTANT: 
- Identify at least 5-10 risks across different severity levels
- Highlight 8-15 tax-sensitive items that require attention
- Provide detailed, line-by-line analysis in detailedFindings
- Include 8-12 actionable recommendations
- Reference specific SARS sections (e.g., s11(a), s23, s8C) where relevant
- Consider South African tax law, including allowances (s11-13), recoupments (s8), and general deductions
- Flag any adjustments with low confidence scores or missing documentation
- Consider timing issues, provisional tax implications, and SARS audit risks`;
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



