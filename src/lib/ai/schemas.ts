import { z } from 'zod';

/**
 * Schema for AI Tax Report Risk
 */
export const TaxReportRiskSchema = z.object({
  title: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  description: z.string(),
  recommendation: z.string(),
});

/**
 * Schema for Tax Sensitive Item
 */
export const TaxSensitiveItemSchema = z.object({
  item: z.string(),
  reason: z.string(),
  action: z.string(),
});

/**
 * Schema for complete AI Tax Report
 */
export const AITaxReportSchema = z.object({
  executiveSummary: z.string(),
  risks: z.array(TaxReportRiskSchema),
  taxSensitiveItems: z.array(TaxSensitiveItemSchema),
  detailedFindings: z.string(),
  recommendations: z.array(z.string()),
});

/**
 * Schema for extracted document data
 */
export const ExtractedDataSchema = z.object({
  documentType: z.string(),
  summary: z.string(),
  structuredData: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

/**
 * Schema for document extraction with AI
 */
export const AIExtractionSchema = z.object({
  summary: z.string(),
  structuredData: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

/**
 * Schema for calculation details in tax adjustments
 */
export const CalculationDetailsSchema = z.object({
  method: z.string(),
  inputs: z.record(z.any()),
  formula: z.string().optional(),
});

/**
 * Schema for individual tax adjustment suggestion
 */
export const TaxAdjustmentSuggestionSchema = z.object({
  type: z.enum(['DEBIT', 'CREDIT', 'ALLOWANCE', 'RECOUPMENT']),
  description: z.string(),
  amount: z.number(),
  sarsSection: z.string(),
  confidenceScore: z.number().min(0).max(1),
  reasoning: z.string(),
  calculationDetails: CalculationDetailsSchema,
});

/**
 * Schema for AI-enhanced tax adjustment suggestions response
 */
export const TaxAdjustmentSuggestionsSchema = z.object({
  suggestions: z.array(TaxAdjustmentSuggestionSchema),
  additionalNotes: z.string().optional(),
});

/**
 * Schema for a single mapped account
 */
export const MappedAccountSchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  balance: z.number(),
  priorYearBalance: z.number(),
  sarsItem: z.string(),
});

/**
 * Schema for account mapping response
 */
export const AccountMappingSchema = z.object({
  accounts: z.array(MappedAccountSchema),
});

/**
 * Schema for PDF extraction
 */
export const PDFExtractionSchema = z.object({
  documentType: z.string(),
  summary: z.string(),
  structuredData: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

/**
 * Schema for Opinion Section Content
 */
export const OpinionSectionContentSchema = z.object({
  title: z.string(),
  content: z.string(),
  citations: z.array(z.string()),
});

/**
 * Schema for Tax Analysis
 */
export const TaxAnalysisSchema = z.object({
  mainIssues: z.array(z.string()),
  legalAnalysis: z.string(),
  alternativePositions: z.array(
    z.object({
      position: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      likelihood: z.enum(['high', 'medium', 'low']),
    })
  ),
  risks: z.array(
    z.object({
      risk: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      mitigation: z.string(),
    })
  ),
  conclusion: z.string(),
});

/**
 * Schema for Research Findings
 */
export const ResearchFindingsSchema = z.object({
  relevantLaw: z.array(z.string()),
  documentFindings: z.string(),
  precedents: z.array(z.string()),
  additionalResearchNeeded: z.array(z.string()),
});

/**
 * Schema for Interview Completeness Assessment
 */
export const CompletenessAssessmentSchema = z.object({
  completeness: z.number().min(0).max(100),
  missingCritical: z.array(z.string()),
  missingDesirable: z.array(z.string()),
  readyToProceed: z.boolean(),
});

/**
 * Schema for Review Feedback
 */
export const ReviewFeedbackSchema = z.object({
  overallScore: z.number().min(0).max(100),
  completeness: z.object({
    score: z.number().min(0).max(100),
    missingElements: z.array(z.string()),
  }),
  coherence: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
  }),
  citations: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
  }),
  logic: z.object({
    score: z.number().min(0).max(100),
    gaps: z.array(z.string()),
  }),
  recommendations: z.array(z.string()),
  readyForClient: z.boolean(),
});

// Type exports for use in the application
export type AITaxReport = z.infer<typeof AITaxReportSchema>;
export type TaxReportRisk = z.infer<typeof TaxReportRiskSchema>;
export type TaxSensitiveItem = z.infer<typeof TaxSensitiveItemSchema>;
export type ExtractedData = z.infer<typeof ExtractedDataSchema>;
export type AIExtraction = z.infer<typeof AIExtractionSchema>;
export type TaxAdjustmentSuggestion = z.infer<typeof TaxAdjustmentSuggestionSchema>;
export type TaxAdjustmentSuggestions = z.infer<typeof TaxAdjustmentSuggestionsSchema>;
export type MappedAccount = z.infer<typeof MappedAccountSchema>;
export type AccountMapping = z.infer<typeof AccountMappingSchema>;
export type PDFExtraction = z.infer<typeof PDFExtractionSchema>;
export type CalculationDetails = z.infer<typeof CalculationDetailsSchema>;
export type OpinionSectionContent = z.infer<typeof OpinionSectionContentSchema>;
export type TaxAnalysis = z.infer<typeof TaxAnalysisSchema>;
export type ResearchFindings = z.infer<typeof ResearchFindingsSchema>;
export type CompletenessAssessment = z.infer<typeof CompletenessAssessmentSchema>;
export type ReviewFeedback = z.infer<typeof ReviewFeedbackSchema>;








