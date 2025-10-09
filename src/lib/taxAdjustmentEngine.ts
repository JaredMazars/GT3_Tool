import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MappedAccountData {
  accountCode: string;
  accountName: string;
  section: string;
  subsection: string;
  balance: number;
  sarsItem: string;
}

export interface TaxAdjustmentSuggestion {
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE';
  description: string;
  amount: number;
  sarsSection: string;
  confidenceScore: number;
  reasoning: string;
  calculationDetails: {
    method: string;
    inputs: Record<string, any>;
    formula?: string;
  };
}

// Rules-based adjustment detection
export class TaxAdjustmentEngine {
  /**
   * Analyze mapped accounts and suggest tax adjustments
   */
  static async analyzeMappedAccounts(
    mappedAccounts: MappedAccountData[],
    useAI: boolean = true
  ): Promise<TaxAdjustmentSuggestion[]> {
    const suggestions: TaxAdjustmentSuggestion[] = [];

    // Apply rules-based suggestions
    suggestions.push(...this.applyRuleBasedSuggestions(mappedAccounts));

    // Enhance with AI analysis if enabled
    if (useAI && suggestions.length > 0) {
      try {
        const aiSuggestions = await this.getAIEnhancedSuggestions(mappedAccounts, suggestions);
        return aiSuggestions;
      } catch (error) {
        console.error('AI enhancement failed, returning rule-based suggestions:', error);
        return suggestions;
      }
    }

    return suggestions;
  }

  /**
   * Apply rules-based tax adjustment logic
   */
  private static applyRuleBasedSuggestions(
    mappedAccounts: MappedAccountData[]
  ): TaxAdjustmentSuggestion[] {
    const suggestions: TaxAdjustmentSuggestion[] = [];

    for (const account of mappedAccounts) {
      // Rule 1: Depreciation adjustments (s11-13)
      if (account.sarsItem.includes('Depreciation') || account.accountName.toLowerCase().includes('depreciation')) {
        suggestions.push({
          type: 'DEBIT',
          description: `Add back depreciation - ${account.accountName}`,
          amount: Math.abs(account.balance),
          sarsSection: 's11(e)',
          confidenceScore: 0.95,
          reasoning: 'Accounting depreciation must be added back and replaced with tax allowances per s11-13',
          calculationDetails: {
            method: 'addback_depreciation',
            inputs: { accountBalance: account.balance, accountCode: account.accountCode },
          },
        });
      }

      // Rule 2: Non-deductible expenses (s23)
      if (this.isNonDeductibleExpense(account)) {
        suggestions.push({
          type: 'DEBIT',
          description: `Non-deductible expense - ${account.accountName}`,
          amount: Math.abs(account.balance),
          sarsSection: 's23',
          confidenceScore: 0.85,
          reasoning: 'Expenses of a capital nature or not incurred in production of income (s23)',
          calculationDetails: {
            method: 'non_deductible_s23',
            inputs: { accountBalance: account.balance, accountCode: account.accountCode },
          },
        });
      }

      // Rule 3: Donations exceeding limits (s18A)
      if (account.accountName.toLowerCase().includes('donation')) {
        const limitAmount = this.calculateDonationLimit(mappedAccounts);
        const excessDonation = Math.abs(account.balance) - limitAmount;
        
        if (excessDonation > 0) {
          suggestions.push({
            type: 'DEBIT',
            description: `Donations exceeding 10% limit - ${account.accountName}`,
            amount: excessDonation,
            sarsSection: 's18A',
            confidenceScore: 0.90,
            reasoning: 'Donations limited to 10% of taxable income (before donations)',
            calculationDetails: {
              method: 'donation_limit',
              inputs: { 
                totalDonation: Math.abs(account.balance),
                limit: limitAmount,
                excess: excessDonation 
              },
              formula: 'Excess = Total Donation - (Taxable Income × 10%)',
            },
          });
        }
      }

      // Rule 4: Interest limitations (thin capitalization)
      if (account.accountName.toLowerCase().includes('interest') && 
          account.section === 'Income Statement' && 
          account.balance < 0) {
        // This is a simplified rule - actual thin cap requires debt:equity analysis
        const potentialExcess = this.checkThinCapitalization(mappedAccounts, account);
        if (potentialExcess > 0) {
          suggestions.push({
            type: 'DEBIT',
            description: `Interest limitation (thin capitalization) - ${account.accountName}`,
            amount: potentialExcess,
            sarsSection: 's23M',
            confidenceScore: 0.70,
            reasoning: 'Potential thin capitalization excess interest - requires detailed debt:equity analysis',
            calculationDetails: {
              method: 'thin_cap_preliminary',
              inputs: { 
                interestExpense: Math.abs(account.balance),
                estimatedExcess: potentialExcess 
              },
            },
          });
        }
      }

      // Rule 5: Entertainment expenses (s23(b))
      if (this.isEntertainmentExpense(account)) {
        suggestions.push({
          type: 'DEBIT',
          description: `Non-deductible entertainment - ${account.accountName}`,
          amount: Math.abs(account.balance),
          sarsSection: 's23(b)',
          confidenceScore: 0.85,
          reasoning: 'Entertainment expenses are generally not deductible per s23(b)',
          calculationDetails: {
            method: 'entertainment_s23b',
            inputs: { accountBalance: account.balance },
          },
        });
      }

      // Rule 6: Capital allowances to be deducted
      if (this.isCapitalAllowanceAccount(account)) {
        suggestions.push({
          type: 'CREDIT',
          description: `Capital allowances deduction - ${account.accountName}`,
          amount: Math.abs(account.balance),
          sarsSection: 's11-13',
          confidenceScore: 0.80,
          reasoning: 'Tax depreciation (capital allowances) to be deducted',
          calculationDetails: {
            method: 'capital_allowance',
            inputs: { accountBalance: account.balance },
          },
        });
      }
    }

    return suggestions;
  }

  /**
   * Use OpenAI to enhance and validate suggestions
   */
  private static async getAIEnhancedSuggestions(
    mappedAccounts: MappedAccountData[],
    ruleSuggestions: TaxAdjustmentSuggestion[]
  ): Promise<TaxAdjustmentSuggestion[]> {
    const prompt = `<task>
Review and enhance tax adjustment suggestions for South African corporate income tax computation (IT14).
</task>

<mapped_accounts>
${JSON.stringify(mappedAccounts, null, 2)}
</mapped_accounts>

<preliminary_suggestions>
${JSON.stringify(ruleSuggestions, null, 2)}
</preliminary_suggestions>

<requirements>
1. Review the preliminary suggestions and assess their validity
2. Suggest additional adjustments that may have been missed
3. Provide detailed reasoning with specific SARS section references
4. Identify any potential issues or areas requiring manual review
5. Ensure all amounts and calculations are accurate
</requirements>

<output_format>
Return a JSON object with the following structure:
{
  "suggestions": [
    {
      "type": "DEBIT" | "CREDIT" | "ALLOWANCE",
      "description": "Clear description",
      "amount": number,
      "sarsSection": "Relevant section (e.g., s11(e), s23, s18A)",
      "confidenceScore": 0.0 to 1.0,
      "reasoning": "Detailed explanation with tax law references",
      "calculationDetails": {
        "method": "method_name",
        "inputs": {}
      }
    }
  ],
  "additionalNotes": "Any important observations or warnings"
}
</output_format>`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        {
          role: 'system',
          content: `You are an expert South African tax consultant specializing in corporate income tax and IT14 computations.

<instructions>
- Always reference specific sections of the Income Tax Act (e.g., s11, s23, s18A)
- Apply current South African tax law accurately
- Consider both deductions and adjustments required for tax computation
- Provide clear, actionable reasoning for each adjustment
- Flag any areas requiring additional professional judgment
- Return valid JSON in the specified format only
</instructions>`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result.suggestions || ruleSuggestions;
  }

  /**
   * Helper: Check if expense is non-deductible under s23
   */
  private static isNonDeductibleExpense(account: MappedAccountData): boolean {
    const nonDeductibleKeywords = [
      'fine', 'penalty', 'bribe', 'illegal', 
      'capital expenditure', 'asset purchase',
      'goodwill', 'trademark', 'patent cost'
    ];

    const accountNameLower = account.accountName.toLowerCase();
    return nonDeductibleKeywords.some(keyword => accountNameLower.includes(keyword));
  }

  /**
   * Helper: Check if expense is entertainment
   */
  private static isEntertainmentExpense(account: MappedAccountData): boolean {
    const entertainmentKeywords = [
      'entertainment', 'hospitality', 'golf day',
      'yacht', 'hunting', 'fishing'
    ];

    const accountNameLower = account.accountName.toLowerCase();
    return entertainmentKeywords.some(keyword => accountNameLower.includes(keyword));
  }

  /**
   * Helper: Check if account represents capital allowances
   */
  private static isCapitalAllowanceAccount(account: MappedAccountData): boolean {
    const allowanceKeywords = [
      'tax depreciation', 'capital allowance', 
      'wear and tear', 's11 allowance', 's12 allowance'
    ];

    const accountNameLower = account.accountName.toLowerCase();
    return allowanceKeywords.some(keyword => accountNameLower.includes(keyword));
  }

  /**
   * Helper: Calculate donation limit (10% of taxable income)
   */
  private static calculateDonationLimit(mappedAccounts: MappedAccountData[]): number {
    // Simplified: Calculate approximate taxable income
    const income = mappedAccounts
      .filter(a => a.section === 'Income Statement' && a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);
    
    const expenses = mappedAccounts
      .filter(a => a.section === 'Income Statement' && a.balance < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const netIncome = income - expenses;
    return netIncome * 0.10; // 10% limit
  }

  /**
   * Helper: Check for thin capitalization issues
   */
  private static checkThinCapitalization(
    mappedAccounts: MappedAccountData[],
    interestAccount: MappedAccountData
  ): number {
    // Simplified: 3:1 debt to equity ratio check
    const totalDebt = mappedAccounts
      .filter(a => a.section === 'Balance Sheet' && 
                   (a.accountName.toLowerCase().includes('loan') || 
                    a.accountName.toLowerCase().includes('borrowing')))
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const totalEquity = mappedAccounts
      .filter(a => a.section === 'Balance Sheet' && 
                   a.accountName.toLowerCase().includes('equity'))
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const allowedDebt = totalEquity * 3;
    const excessDebt = Math.max(0, totalDebt - allowedDebt);

    // Proportion of interest attributable to excess debt
    if (totalDebt > 0 && excessDebt > 0) {
      const excessRatio = excessDebt / totalDebt;
      return Math.abs(interestAccount.balance) * excessRatio;
    }

    return 0;
  }

  /**
   * Analyze a specific account for potential adjustments
   */
  static async analyzeSpecificAccount(
    account: MappedAccountData,
    allAccounts: MappedAccountData[]
  ): Promise<TaxAdjustmentSuggestion[]> {
    const suggestions: TaxAdjustmentSuggestion[] = [];
    
    // Apply relevant rules for this specific account
    const allSuggestions = this.applyRuleBasedSuggestions([account]);
    
    return allSuggestions;
  }
}


