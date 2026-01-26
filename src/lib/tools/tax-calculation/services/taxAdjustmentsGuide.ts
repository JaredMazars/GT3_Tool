export interface TaxAdjustmentDefinition {
  name: string;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  sarsSection: string;
  keywords: string[];
  accountCriteria?: {
    sectionMatch?: string[];
    subsectionMatch?: string[];
    sarsItemContains?: string[];
    balanceSign?: 'positive' | 'negative' | 'any';
  };
  descriptionTemplate: string;
  reasoning: string;
  calculationType: 'absolute_balance' | 'percentage' | 'excess' | 'custom';
  confidenceScore: number;
  requiresManualReview?: boolean;
  additionalChecks?: string[];
}

export const taxAdjustmentsGuide: {
  debitAdjustments: TaxAdjustmentDefinition[];
  creditAdjustments: TaxAdjustmentDefinition[];
  allowances: TaxAdjustmentDefinition[];
  recoupments: TaxAdjustmentDefinition[];
} = {
  debitAdjustments: [
    {
      name: "Depreciation Add-back",
      type: "DEBIT" as const,
      sarsSection: "s11(e)",
      keywords: ["depreciation", "amortisation", "amortization", "accumulated depreciation"],
      accountCriteria: {
        sectionMatch: ["Income Statement"],
        balanceSign: "any"
      },
      descriptionTemplate: "Add back depreciation - {accountName}",
      reasoning: "Accounting depreciation must be added back and replaced with tax allowances per s11-13. Tax depreciation (capital allowances) is claimed separately.",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.95,
      requiresManualReview: false
    },
    {
      name: "Non-deductible Expenses (s23)",
      type: "DEBIT" as const,
      sarsSection: "s23",
      keywords: ["fine", "penalty", "bribe", "illegal", "capital expenditure", "goodwill", "trademark purchase", "patent cost"],
      accountCriteria: {
        sectionMatch: ["Income Statement"],
        balanceSign: "positive"
      },
      descriptionTemplate: "Non-deductible expense - {accountName}",
      reasoning: "Expenses of a capital nature, not incurred in the production of income, or specifically prohibited are not deductible per s23",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.85,
      requiresManualReview: true
    },
    {
      name: "Entertainment Expenses (s23(b))",
      type: "DEBIT" as const,
      sarsSection: "s23(b)",
      keywords: ["entertainment", "hospitality", "golf day", "yacht", "hunting", "fishing", "sporting event"],
      accountCriteria: {
        sectionMatch: ["Income Statement"],
        balanceSign: "positive"
      },
      descriptionTemplate: "Non-deductible entertainment - {accountName}",
      reasoning: "Entertainment expenses are generally not deductible per s23(b), subject to limited exceptions",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.85,
      requiresManualReview: false
    },
    {
      name: "Donations Exceeding Limit (s18A)",
      type: "DEBIT" as const,
      sarsSection: "s18A",
      keywords: ["donation", "charitable contribution", "s18a"],
      accountCriteria: {
        sectionMatch: ["Income Statement"],
        balanceSign: "positive"
      },
      descriptionTemplate: "Donations exceeding 10% limit - {accountName}",
      reasoning: "Donations to s18A approved PBOs are limited to 10% of taxable income (before donations)",
      calculationType: "excess" as const,
      confidenceScore: 0.90,
      requiresManualReview: true,
      additionalChecks: ["Verify s18A certificate", "Calculate 10% limit"]
    },
    {
      name: "Interest Limitation (Thin Capitalization)",
      type: "DEBIT" as const,
      sarsSection: "s23M",
      keywords: ["interest", "interest expense", "finance charges", "connected person interest"],
      accountCriteria: {
        sectionMatch: ["Income Statement"],
        balanceSign: "positive"
      },
      descriptionTemplate: "Interest limitation (thin capitalization) - {accountName}",
      reasoning: "Interest on debt from connected persons may be limited under thin capitalization rules (s23M). Requires detailed debt:equity analysis",
      calculationType: "custom" as const,
      confidenceScore: 0.70,
      requiresManualReview: true,
      additionalChecks: ["Calculate debt:equity ratio", "Identify connected person debt", "Apply s23M formula"]
    },
    {
      name: "Legal Expenses - Capital Nature",
      type: "DEBIT" as const,
      sarsSection: "s23(g)",
      keywords: ["legal fees capital", "capital legal", "acquisition legal costs"],
      accountCriteria: {
        sectionMatch: ["Income Statement"]
      },
      descriptionTemplate: "Legal expenses of capital nature - {accountName}",
      reasoning: "Legal expenses related to capital transactions are not deductible per s23(g)",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.80,
      requiresManualReview: true
    },
    {
      name: "Restraint of Trade Payments",
      type: "DEBIT" as const,
      sarsSection: "s23(k)",
      keywords: ["restraint of trade", "non-compete payment"],
      accountCriteria: {
        sectionMatch: ["Income Statement"]
      },
      descriptionTemplate: "Restraint of trade payment - {accountName}",
      reasoning: "Payments for restraint of trade are capital in nature and not deductible per s23(k)",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.90,
      requiresManualReview: false
    },
    {
      name: "Provision Increase",
      type: "DEBIT" as const,
      sarsSection: "s23(e)",
      keywords: ["provision", "allowance", "impairment", "doubtful debts"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Provision increase - {accountName}",
      reasoning: "Increases in provisions are generally not deductible until actually incurred per s23(e). The increase must be added back to taxable income.",
      calculationType: "custom" as const,
      confidenceScore: 0.85,
      requiresManualReview: true,
      additionalChecks: ["Calculate year-on-year increase", "Verify provision type", "Check if specific deduction rules apply"]
    },
    {
      name: "Income Received in Advance Increase",
      type: "DEBIT" as const,
      sarsSection: "s24",
      keywords: ["income received in advance", "deferred income", "unearned revenue", "advance payments"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Income received in advance increase - {accountName}",
      reasoning: "Increase in income received in advance represents income that has been deferred for accounting purposes but may be taxable when received per s24",
      calculationType: "custom" as const,
      confidenceScore: 0.80,
      requiresManualReview: true,
      additionalChecks: ["Calculate year-on-year increase", "Verify if s24 deferral applies", "Check service delivery requirements"]
    },
    {
      name: "Prepaid Expenses Increase",
      type: "DEBIT" as const,
      sarsSection: "s23(d)",
      keywords: ["prepayment", "prepaid expense", "advance payment"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Prepaid expenses increase - {accountName}",
      reasoning: "Increase in prepaid expenses represents expenses deducted for accounting but not yet incurred for tax purposes per s23(d)",
      calculationType: "custom" as const,
      confidenceScore: 0.75,
      requiresManualReview: true,
      additionalChecks: ["Calculate year-on-year increase", "Check nature of prepayment", "Verify timing of deduction"]
    }
  ],

  creditAdjustments: [
    {
      name: "Exempt Dividends",
      type: "CREDIT" as const,
      sarsSection: "s10(1)(k)",
      keywords: ["dividend", "dividends received", "dividend income"],
      accountCriteria: {
        sectionMatch: ["Income Statement"],
        balanceSign: "negative"
      },
      descriptionTemplate: "Exempt dividend income - {accountName}",
      reasoning: "Dividends received from South African companies are generally exempt from tax per s10(1)(k), subject to anti-avoidance provisions",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.90,
      requiresManualReview: true,
      additionalChecks: ["Verify dividend is from SA company", "Check for anti-avoidance (s10B)"]
    },
    {
      name: "Foreign Dividends - Exempt Portion",
      type: "CREDIT" as const,
      sarsSection: "s10B",
      keywords: ["foreign dividend", "offshore dividend"],
      accountCriteria: {
        sectionMatch: ["Income Statement"]
      },
      descriptionTemplate: "Exempt foreign dividend - {accountName}",
      reasoning: "Foreign dividends may be exempt under s10B subject to specific requirements and limitations",
      calculationType: "custom" as const,
      confidenceScore: 0.75,
      requiresManualReview: true,
      additionalChecks: ["Apply s10B requirements", "Check for participation exemption"]
    },
    {
      name: "Non-taxable Government Grants",
      type: "CREDIT" as const,
      sarsSection: "s12P",
      keywords: ["government grant", "subsidy", "government assistance"],
      accountCriteria: {
        sectionMatch: ["Income Statement"]
      },
      descriptionTemplate: "Non-taxable government grant - {accountName}",
      reasoning: "Certain government grants may be non-taxable depending on the nature and requirements",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.70,
      requiresManualReview: true,
      additionalChecks: ["Verify grant terms", "Check if capital or revenue nature"]
    },
    {
      name: "Provision Decrease",
      type: "CREDIT" as const,
      sarsSection: "s23(e)",
      keywords: ["provision", "allowance", "impairment", "doubtful debts"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Provision decrease - {accountName}",
      reasoning: "Decrease in provisions represents reversal of previously non-deductible amounts and should reduce taxable income",
      calculationType: "custom" as const,
      confidenceScore: 0.85,
      requiresManualReview: true,
      additionalChecks: ["Calculate year-on-year decrease", "Verify provision was previously added back", "Check write-off vs reversal"]
    },
    {
      name: "Income Received in Advance Decrease",
      type: "CREDIT" as const,
      sarsSection: "s24",
      keywords: ["income received in advance", "deferred income", "unearned revenue", "advance payments"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Income received in advance decrease - {accountName}",
      reasoning: "Decrease in income received in advance represents income earned for accounting that was previously taxed when received",
      calculationType: "custom" as const,
      confidenceScore: 0.80,
      requiresManualReview: true,
      additionalChecks: ["Calculate year-on-year decrease", "Verify income was previously taxed", "Check s24 deferral application"]
    },
    {
      name: "Prepaid Expenses Decrease",
      type: "CREDIT" as const,
      sarsSection: "s23(d)",
      keywords: ["prepayment", "prepaid expense", "advance payment"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Prepaid expenses decrease - {accountName}",
      reasoning: "Decrease in prepaid expenses represents expenses now incurred for accounting that were previously not deductible for tax",
      calculationType: "custom" as const,
      confidenceScore: 0.75,
      requiresManualReview: true,
      additionalChecks: ["Calculate year-on-year decrease", "Verify expense is now deductible", "Check timing of deduction"]
    }
  ],

  allowances: [
    {
      name: "Capital Allowances (Wear and Tear)",
      type: "ALLOWANCE" as const,
      sarsSection: "s11(e)",
      keywords: ["tax depreciation", "capital allowance", "wear and tear", "s11 allowance", "s11e allowance"],
      accountCriteria: {
        sectionMatch: ["Income Statement", "Balance Sheet"]
      },
      descriptionTemplate: "Capital allowances (wear and tear) - {accountName}",
      reasoning: "Tax depreciation calculated per s11(e) on qualifying assets used in production of income",
      calculationType: "custom" as const,
      confidenceScore: 0.85,
      requiresManualReview: true,
      additionalChecks: ["Verify asset register", "Apply correct depreciation rates", "Check asset usage"]
    },
    {
      name: "Manufacturing Assets (s12C)",
      type: "ALLOWANCE" as const,
      sarsSection: "s12C",
      keywords: ["manufacturing allowance", "s12c", "manufacturing asset", "machinery"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Manufacturing asset allowance (s12C) - {accountName}",
      reasoning: "Enhanced allowances for new and unused manufacturing assets per s12C (40/20/20/20 or 100% immediate)",
      calculationType: "custom" as const,
      confidenceScore: 0.90,
      requiresManualReview: true,
      additionalChecks: ["Verify manufacturing use", "Check if new and unused", "Apply correct s12C rate"]
    },
    {
      name: "Commercial Buildings (s13)",
      type: "ALLOWANCE" as const,
      sarsSection: "s13",
      keywords: ["building allowance", "s13", "commercial building", "industrial building"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Commercial building allowance (s13) - {accountName}",
      reasoning: "Allowances for qualifying commercial, industrial or hotel buildings per s13 (various rates apply)",
      calculationType: "custom" as const,
      confidenceScore: 0.85,
      requiresManualReview: true,
      additionalChecks: ["Verify building qualifies under s13", "Apply correct rate (5%, 10%, 20%)", "Check erection date"]
    },
    {
      name: "Small Business Corporations Allowance",
      type: "ALLOWANCE" as const,
      sarsSection: "s12E(1A)",
      keywords: ["sbc allowance", "small business allowance", "accelerated allowance"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "SBC accelerated allowance (s12E) - {accountName}",
      reasoning: "Small Business Corporations may claim 100% allowance on assets costing less than R7,000 per s12E(1A)",
      calculationType: "custom" as const,
      confidenceScore: 0.80,
      requiresManualReview: true,
      additionalChecks: ["Verify SBC status", "Check asset cost < R7,000", "Confirm brought into use"]
    },
    {
      name: "Research and Development (s11D)",
      type: "ALLOWANCE" as const,
      sarsSection: "s11D",
      keywords: ["r&d", "research and development", "s11d", "research expenditure"],
      accountCriteria: {
        sectionMatch: ["Income Statement"]
      },
      descriptionTemplate: "Research and development allowance (s11D) - {accountName}",
      reasoning: "Enhanced 150% deduction for qualifying R&D expenditure per s11D (pre-2023) or revised s11D rates (post-2023)",
      calculationType: "percentage" as const,
      confidenceScore: 0.85,
      requiresManualReview: true,
      additionalChecks: ["Verify R&D nature", "Check s11D approval if required", "Apply correct percentage"]
    },
    {
      name: "Renewable Energy (s12B)",
      type: "ALLOWANCE" as const,
      sarsSection: "s12B",
      keywords: ["renewable energy", "s12b", "solar", "wind energy", "green energy"],
      accountCriteria: {
        sectionMatch: ["Balance Sheet"]
      },
      descriptionTemplate: "Renewable energy allowance (s12B) - {accountName}",
      reasoning: "Accelerated allowances for qualifying renewable energy assets per s12B (125% over 3 years post-2023 or 100% previously)",
      calculationType: "custom" as const,
      confidenceScore: 0.90,
      requiresManualReview: true,
      additionalChecks: ["Verify renewable energy qualification", "Check brought into use date", "Apply correct s12B rate"]
    }
  ],

  recoupments: [
    {
      name: "General Recoupment (s8(4))",
      type: "RECOUPMENT" as const,
      sarsSection: "s8(4)",
      keywords: ["recoupment", "recoup", "recovery of deduction", "allowance recovered", "reversal of allowance"],
      accountCriteria: {
        sectionMatch: ["Income Statement"],
        balanceSign: "negative"
      },
      descriptionTemplate: "Recoupment of previously deducted amount - {accountName}",
      reasoning: "Recovery of amounts previously allowed as deductions must be included in income per s8(4)",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.85,
      requiresManualReview: true,
      additionalChecks: ["Verify amount was previously deducted", "Check applicable tax year"]
    },
    {
      name: "Asset Disposal Recoupment (s8(4)(a))",
      type: "RECOUPMENT" as const,
      sarsSection: "s8(4)(a)",
      keywords: ["disposal recoupment", "asset sale recoupment", "recoupment on disposal", "sale of asset", "profit on disposal"],
      accountCriteria: {
        sectionMatch: ["Income Statement", "Balance Sheet"],
        balanceSign: "any"
      },
      descriptionTemplate: "Asset disposal recoupment - {accountName}",
      reasoning: "Recoupment arises on disposal of assets to the extent proceeds exceed tax value (cost less allowances claimed) per s8(4)(a)",
      calculationType: "custom" as const,
      confidenceScore: 0.90,
      requiresManualReview: true,
      additionalChecks: ["Calculate recoupment: min(proceeds - tax value, allowances claimed)", "Verify capital vs recoupment split"]
    },
    {
      name: "Bad Debts Recovered",
      type: "RECOUPMENT" as const,
      sarsSection: "s8(4)",
      keywords: ["bad debt recovered", "debt recovery", "debtor recovered", "bad debts reversal"],
      accountCriteria: {
        sectionMatch: ["Income Statement"],
        balanceSign: "negative"
      },
      descriptionTemplate: "Bad debts recovered - {accountName}",
      reasoning: "Recovery of bad debts previously allowed as deductions must be included in income per s8(4)",
      calculationType: "absolute_balance" as const,
      confidenceScore: 0.95,
      requiresManualReview: false
    },
    {
      name: "Insurance Proceeds Recoupment",
      type: "RECOUPMENT" as const,
      sarsSection: "s8(4)",
      keywords: ["insurance proceeds", "insurance claim", "insurance recovery"],
      accountCriteria: {
        sectionMatch: ["Income Statement"]
      },
      descriptionTemplate: "Insurance proceeds recoupment - {accountName}",
      reasoning: "Insurance proceeds may trigger recoupment to the extent they compensate for previously deducted amounts",
      calculationType: "custom" as const,
      confidenceScore: 0.75,
      requiresManualReview: true,
      additionalChecks: ["Determine what loss was insured", "Check if loss was previously deducted", "Calculate recoupment vs capital"]
    }
  ]
};

export type TaxAdjustmentsGuideType = typeof taxAdjustmentsGuide;







































