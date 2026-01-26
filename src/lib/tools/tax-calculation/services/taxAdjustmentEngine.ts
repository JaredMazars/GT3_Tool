import { generateObject } from 'ai';
import { models } from '@/lib/ai/config';
import { TaxAdjustmentSuggestionsSchema } from '@/lib/ai/schemas';
import { taxAdjustmentsGuide, type TaxAdjustmentDefinition } from './taxAdjustmentsGuide';
import { withRetryAndCircuitBreaker, RetryPresets } from '@/lib/utils/retryUtils';

export interface MappedAccountData {
  accountCode: string;
  accountName: string;
  section: string;
  subsection: string;
  balance: number;
  sarsItem: string;
  priorYearBalance?: number;
}

export interface TaxAdjustmentSuggestion {
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  sarsSection: string;
  confidenceScore: number;
  reasoning: string;
  calculationDetails: {
    method: string;
    inputs: Record<string, string | number>;
    formula?: string;
  };
}

export interface ExistingAdjustment {
  id: number;
  type: string;
  description: string;
  amount: number;
  sarsSection?: string;
  status: string;
}

// Rules-based adjustment detection
export class TaxAdjustmentEngine {
  /**
   * Analyze mapped accounts and suggest tax adjustments
   */
  static async analyzeMappedAccounts(
    mappedAccounts: MappedAccountData[],
    useAI: boolean = true,
    existingAdjustments: ExistingAdjustment[] = []
  ): Promise<TaxAdjustmentSuggestion[]> {
    const suggestions: TaxAdjustmentSuggestion[] = [];

    // Apply rules-based suggestions
    suggestions.push(...this.applyRuleBasedSuggestions(mappedAccounts));

    // Enhance with AI analysis if enabled
    if (useAI && suggestions.length > 0) {
      try {
        const aiSuggestions = await this.getAIEnhancedSuggestions(mappedAccounts, suggestions, existingAdjustments);
        return aiSuggestions;
      } catch (error) {
        // AI enhancement failed, return rule-based suggestions
        return suggestions;
      }
    }

    return suggestions;
  }

  /**
   * Apply guide-based tax adjustment matching
   */
  private static applyRuleBasedSuggestions(
    mappedAccounts: MappedAccountData[]
  ): TaxAdjustmentSuggestion[] {
    const suggestions: TaxAdjustmentSuggestion[] = [];

    for (const account of mappedAccounts) {
      // Check against all adjustment types in the guide
      const matches = this.findMatchingAdjustments(account, mappedAccounts);
      suggestions.push(...matches);
    }

    return suggestions;
  }

  /**
   * Find matching adjustments from the guide for a given account
   */
  private static findMatchingAdjustments(
    account: MappedAccountData,
    allAccounts: MappedAccountData[]
  ): TaxAdjustmentSuggestion[] {
    const suggestions: TaxAdjustmentSuggestion[] = [];
    const accountNameLower = account.accountName.toLowerCase();
    const sarsItemLower = account.sarsItem.toLowerCase();

    // Combine all adjustment definitions
    const allDefinitions = [
      ...taxAdjustmentsGuide.debitAdjustments,
      ...taxAdjustmentsGuide.creditAdjustments,
      ...taxAdjustmentsGuide.allowances,
      ...taxAdjustmentsGuide.recoupments
    ];

    for (const definition of allDefinitions) {
      // Check if keywords match
      const keywordMatch = definition.keywords.some(keyword => 
        accountNameLower.includes(keyword.toLowerCase()) || 
        sarsItemLower.includes(keyword.toLowerCase())
      );

      if (!keywordMatch) continue;

      // Check account criteria if specified
      if (definition.accountCriteria) {
        const criteria = definition.accountCriteria;
        
        // Check section match
        if (criteria.sectionMatch && !criteria.sectionMatch.includes(account.section)) {
          continue;
        }

        // Check subsection match
        if (criteria.subsectionMatch && Array.isArray(criteria.subsectionMatch) && criteria.subsectionMatch.length > 0) {
          if (!criteria.subsectionMatch.includes(account.subsection)) {
            continue;
          }
        }

        // Check sarsItem contains
        if (criteria.sarsItemContains && Array.isArray(criteria.sarsItemContains) && criteria.sarsItemContains.length > 0) {
          if (!criteria.sarsItemContains.some((item: string) => sarsItemLower.includes(item.toLowerCase()))) {
            continue;
          }
        }

        // Check balance sign
        if (criteria.balanceSign) {
          if (criteria.balanceSign === 'positive' && account.balance <= 0) continue;
          if (criteria.balanceSign === 'negative' && account.balance >= 0) continue;
        }
      }

      // Calculate amount based on calculation type
      let amount = Math.abs(account.balance);
      const calculationMethod = definition.name.toLowerCase().replace(/\s+/g, '_');

      if (definition.calculationType === 'excess' && definition.name.includes('Donations')) {
        // Special handling for donation limit
        const limitAmount = this.calculateDonationLimit(allAccounts);
        const excessDonation = Math.abs(account.balance) - limitAmount;
        if (excessDonation <= 0) continue; // No excess, skip this adjustment
        amount = excessDonation;
      } else if (definition.calculationType === 'custom' && definition.name.includes('Thin Capitalization')) {
        // Special handling for thin cap
        const potentialExcess = this.checkThinCapitalization(allAccounts, account);
        if (potentialExcess <= 0) continue;
        amount = potentialExcess;
      } else if (definition.calculationType === 'custom' && account.priorYearBalance !== undefined) {
        // Handle year-on-year movements for provisions, prepayments, income in advance, etc.
        const movement = account.balance - account.priorYearBalance;
        
        if (definition.name.includes('Increase') && movement <= 0) {
          // Looking for increase but there's a decrease or no change
          continue;
        } else if (definition.name.includes('Decrease') && movement >= 0) {
          // Looking for decrease but there's an increase or no change
          continue;
        }
        
        amount = Math.abs(movement);
        
        // Skip if movement is negligible
        if (amount < 1) continue;
      }

      // Generate suggestion from definition
      const description = definition.descriptionTemplate.replace('{accountName}', account.accountName);
      
      // Build calculation details
      const calculationInputs: Record<string, string | number> = { 
        accountBalance: account.balance, 
        accountCode: account.accountCode,
        accountName: account.accountName
      };
      
      // Add prior year information if available and relevant
      if (account.priorYearBalance !== undefined) {
        calculationInputs.priorYearBalance = account.priorYearBalance;
        calculationInputs.movement = account.balance - account.priorYearBalance;
      }
      
      suggestions.push({
        type: definition.type,
        description,
        amount,
        sarsSection: definition.sarsSection,
        confidenceScore: definition.confidenceScore,
        reasoning: definition.reasoning,
        calculationDetails: {
          method: calculationMethod,
          inputs: calculationInputs,
        },
      });
    }

    return suggestions;
  }

  /**
   * Use OpenAI to enhance and validate suggestions
   */
  private static async getAIEnhancedSuggestions(
    mappedAccounts: MappedAccountData[],
    ruleSuggestions: TaxAdjustmentSuggestion[],
    existingAdjustments: ExistingAdjustment[] = []
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

<existing_adjustments>
${JSON.stringify(existingAdjustments, null, 2)}
</existing_adjustments>

<tax_adjustments_guide>
${JSON.stringify(taxAdjustmentsGuide, null, 2)}
</tax_adjustments_guide>

<requirements>
1. Review the preliminary suggestions and assess their validity
2. DO NOT suggest adjustments that are already in the existing_adjustments list - avoid duplicates
3. Compare descriptions, types, and amounts to identify potential duplicates
4. Reference the tax_adjustments_guide to identify additional adjustments that may have been missed
5. Match account names/descriptions against the keywords in the guide
6. Use the sarsSection and reasoning from the guide for consistency
7. IMPORTANT: Consider year-on-year movements for balance sheet items
   - For accounts with priorYearBalance data, calculate movements (current - prior)
   - Provision increases = DEBIT adjustment (add back to taxable income)
   - Provision decreases = CREDIT adjustment (reduce taxable income)
   - Income received in advance increases = DEBIT adjustment
   - Income received in advance decreases = CREDIT adjustment
   - Prepayment increases = DEBIT adjustment
   - Prepayment decreases = CREDIT adjustment
8. Provide detailed reasoning with specific SARS section references
9. Identify any potential issues or areas requiring manual review
10. Ensure all amounts and calculations are accurate
</requirements>

<adjustment_types>
- DEBIT: Amounts to add back to accounting profit (e.g., non-deductible expenses, depreciation add-back)
- CREDIT: Amounts to deduct from accounting profit (e.g., exempt income, non-taxable receipts)
- ALLOWANCE: Tax allowances that reduce taxable income (e.g., capital allowances s11-13, wear and tear)
- RECOUPMENT: Previously deducted amounts that must be added back (e.g., s8(4) recoupments, disposal recoupments)
</adjustment_types>

<output_format>
Return a JSON object with the following structure:
{
  "suggestions": [
    {
      "type": "DEBIT" | "CREDIT" | "ALLOWANCE" | "RECOUPMENT",
      "description": "Clear description",
      "amount": number,
      "sarsSection": "Relevant section (e.g., s11(e), s23, s18A, s8(4))",
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

    // Use retry logic with circuit breaker for AI API calls
    const result = await withRetryAndCircuitBreaker(
      'openai-tax-suggestions',
      async () => {
        const { object } = await generateObject({
          model: models.mini,
          schema: TaxAdjustmentSuggestionsSchema,
          system: `You are an expert South African tax consultant specializing in corporate income tax and IT14 computations.

<instructions>
- CRITICAL: Review the existing_adjustments list and DO NOT create duplicates
- Check if an adjustment with similar description, type, and amount already exists before suggesting it
- Reference the provided tax_adjustments_guide as your primary source for identifying adjustments
- Match accounts against the keywords and criteria defined in the guide
- Use the sarsSection and reasoning from the guide for consistency
- IMPORTANT: Pay special attention to accounts with priorYearBalance data
  * Calculate year-on-year movements for balance sheet items
  * Provision/allowance increases require DEBIT adjustments (s23(e))
  * Provision/allowance decreases require CREDIT adjustments
  * Income received in advance movements affect taxable income timing (s24)
  * Prepayment movements affect deduction timing (s23(d))
- Always reference specific sections of the Income Tax Act (e.g., s11, s23, s18A, s8(4))
- Apply current South African tax law accurately
- Distinguish between the four adjustment types:
  * DEBIT: Add-backs to accounting profit (non-deductible items, depreciation, provision increases)
  * CREDIT: Deductions from accounting profit (exempt income, provision decreases)
  * ALLOWANCE: Tax allowances reducing taxable income (capital allowances s11-13)
  * RECOUPMENT: Recovery of previously deducted amounts (s8(4) recoupments)
- Provide clear, actionable reasoning for each adjustment
- Flag any areas requiring additional professional judgment (requiresManualReview in guide)
- Return valid JSON in the specified format only
</instructions>`,
          prompt,
        });
        return object;
      },
      RetryPresets.AI_API,
      undefined,
      'Tax Adjustment AI Enhancement'
    );

    return result.suggestions || ruleSuggestions;
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
    allAccounts: MappedAccountData[],
    existingAdjustments: ExistingAdjustment[] = []
  ): Promise<TaxAdjustmentSuggestion[]> {
    const suggestions: TaxAdjustmentSuggestion[] = [];
    
    // Apply relevant rules for this specific account
    const allSuggestions = this.applyRuleBasedSuggestions([account]);
    
    return allSuggestions;
  }
}







































