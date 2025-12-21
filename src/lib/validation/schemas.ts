/**
 * Zod validation schemas for runtime type checking
 */

import { z } from 'zod';
import { CreditRatingGrade, AnalyticsDocumentType } from '@/types/analytics';
import { isValidUrl } from './urlValidation';

// =============================================================================
// Security Validation Helpers
// =============================================================================

/**
 * Common SQL injection patterns to detect
 * These are checked AFTER sanitization as an additional layer of defense
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
  /(--|#|\/\*|\*\/)/,  // SQL comments
  /(\bOR\b|\bAND\b)\s*\d+\s*[=<>]/i,  // OR 1=1 patterns
  /'\s*(OR|AND)\s*'/i,  // ' OR ' patterns
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,  // Chained statements
  /\bEXEC(\s+|\()|\bXP_/i,  // SQL Server specific
];

/**
 * Path traversal patterns to detect
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,  // ../
  /\.\.\\/, // ..\
  /%2e%2e/i,  // URL encoded ..
  /%252e/i,  // Double URL encoded .
  /\0/,  // Null bytes
];

/**
 * Check if a string contains potential SQL injection patterns
 * @param value - String to check
 * @returns true if potentially dangerous patterns detected
 */
export function containsSQLInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check if a string contains path traversal attempts
 * @param value - String to check
 * @returns true if path traversal detected
 */
export function containsPathTraversal(value: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Safe string validator that rejects SQL injection and path traversal
 * Use for user-provided input that goes into queries or file paths
 * @param maxLength - Maximum string length
 * @param minLength - Minimum string length (applied before refinements)
 */
export const safeString = (maxLength?: number, minLength?: number) => {
  let schema = z.string();
  if (minLength !== undefined) {
    schema = schema.min(minLength);
  }
  if (maxLength !== undefined) {
    schema = schema.max(maxLength);
  }
  return schema
    .refine(val => !containsSQLInjection(val), {
      message: 'Input contains potentially unsafe patterns',
    })
    .refine(val => !containsPathTraversal(val), {
      message: 'Input contains potentially unsafe path patterns',
    });
};

/**
 * Safe identifier string (alphanumeric, underscore, hyphen only)
 * Use for codes, keys, and identifiers
 * @param maxLength - Maximum string length
 * @param minLength - Minimum string length
 */
export const safeIdentifier = (maxLength: number = 50, minLength?: number) => {
  let schema = z.string();
  if (minLength !== undefined) {
    schema = schema.min(minLength);
  }
  schema = schema.max(maxLength);
  return schema.regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Must contain only letters, numbers, underscores, and hyphens',
  });
};

/**
 * Validate object nesting depth to prevent deeply nested payloads
 * @param maxDepth - Maximum allowed nesting depth
 */
export function validateNestingDepth(obj: unknown, maxDepth: number = 5, currentDepth: number = 0): boolean {
  if (currentDepth > maxDepth) {
    return false;
  }
  
  if (obj === null || typeof obj !== 'object') {
    return true;
  }
  
  if (Array.isArray(obj)) {
    return obj.every(item => validateNestingDepth(item, maxDepth, currentDepth + 1));
  }
  
  return Object.values(obj).every(value => validateNestingDepth(value, maxDepth, currentDepth + 1));
}

/**
 * Create a refined schema that validates nesting depth
 */
export const withMaxNestingDepth = <T extends z.ZodTypeAny>(
  schema: T,
  maxDepth: number = 5
) => {
  return schema.refine(
    (data) => validateNestingDepth(data, maxDepth),
    { message: `Object nesting exceeds maximum depth of ${maxDepth}` }
  );
};

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Custom URL validator that only allows safe protocols (http, https, mailto)
 * This matches the backend sanitizeUrl() function
 * 
 * @param maxLength - Optional maximum length for the URL
 */
const safeUrl = (maxLength?: number) => {
  const baseSchema = maxLength ? z.string().max(maxLength) : z.string();
  return baseSchema.refine(isValidUrl, {
    message: 'Must be a valid URL with http://, https://, or mailto: protocol',
  });
};

// =============================================================================
// GUID/UUID Validation
// =============================================================================

/**
 * GUID/UUID validation helper
 * Validates Microsoft SQL Server UniqueIdentifier format (GUID)
 */
const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GSClientIDSchema = z.string().regex(guidRegex, {
  message: 'GSClientID must be a valid GUID (UniqueIdentifier)',
});

/**
 * Helper for optional/nullable GUID fields
 */
const guidOrNull = () => z.string().regex(guidRegex, {
  message: 'Must be a valid GUID (UniqueIdentifier)',
}).nullable();

/**
 * Project validation schemas
 */
export const UpdateTaskSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.string().max(50).optional(),
  archived: z.boolean().optional(),
  assessmentYear: z.string().max(50).optional(),
  projectType: z.enum([
    'TAX_CALCULATION', 'TAX_OPINION', 'TAX_ADMINISTRATION',
    'AUDIT_ENGAGEMENT', 'AUDIT_REVIEW', 'AUDIT_REPORT',
    'FINANCIAL_STATEMENTS', 'BOOKKEEPING', 'MANAGEMENT_ACCOUNTS',
    'ADVISORY_PROJECT', 'CONSULTING_ENGAGEMENT', 'STRATEGY_REVIEW',
    'QRM_AUDIT', 'QRM_COMPLIANCE', 'QRM_RISK_ASSESSMENT',
    'BD_CAMPAIGN', 'BD_PROPOSAL', 'BD_MARKET_RESEARCH',
    'IT_IMPLEMENTATION', 'IT_SUPPORT', 'IT_INFRASTRUCTURE',
    'FINANCE_REPORTING', 'FINANCE_BUDGETING', 'FINANCE_ANALYSIS',
    'HR_RECRUITMENT', 'HR_TRAINING', 'HR_POLICY',
    'COUNTRY_REPORT', 'COUNTRY_ANALYSIS', 'COUNTRY_DASHBOARD', 'COUNTRY_METRICS'
  ]).optional(),
  submissionDeadline: z.coerce.date().nullable().optional(),
  taxPeriodStart: z.coerce.date().nullable().optional(),
  taxPeriodEnd: z.coerce.date().nullable().optional(),
  taxYear: z.number().int().min(2000).max(2100).nullable().optional(),
}).strict();

/**
 * Task creation validation schema
 * Matches Task table structure with comprehensive fields
 */
export const CreateTaskSchema = z.object({
  // Core Task Information
  taskYear: z.number().int().min(2000).max(2100, 'Year must be between 2000 and 2100'),
  TaskDesc: z.string().min(1, 'Task name is required').max(150, 'Task name must be 150 characters or less'),
  TaskCode: z.string().max(10).optional(), // Auto-generated if not provided
  GSClientID: guidOrNull().optional(), // Optional client assignment
  
  // Team & Organization
  TaskPartner: z.string().min(1, 'Partner code is required').max(10),
  TaskPartnerName: z.string().min(1, 'Partner name is required').max(50),
  TaskManager: z.string().min(1, 'Manager code is required').max(10),
  TaskManagerName: z.string().min(1, 'Manager name is required').max(50),
  OfficeCode: z.string().min(1, 'Office code is required').max(10),
  
  // Service Line Information
  SLGroup: z.string().min(1).max(10).optional().nullable(),
  ServLineCode: z.string().min(1, 'Service line code is required').max(10),
  ServLineDesc: z.string().min(1).max(150).optional().nullable(),
  
  // Timeline
  TaskDateOpen: z.coerce.date(),
  TaskDateTerminate: z.coerce.date().optional().nullable(),
  
  // TaskBudget Fields
  EstChgHours: z.number().min(0).optional(),
  EstFeeTime: z.number().min(0).optional(),
  EstFeeDisb: z.number().min(0).optional(),
  BudStartDate: z.coerce.date().optional().nullable(),
  BudDueDate: z.coerce.date().optional().nullable(),

  // Team Members
  teamMembers: z.array(z.object({
    empCode: z.string(),
    role: z.enum(['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER']),
  })).optional(),

  // System Fields
  createdBy: z.string().optional(),
});

/**
 * Project User Management validation schemas
 */
export const AddTaskTeamSchema = z.object({
  userId: z.string().optional(),
  role: z.enum(['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER']).optional().default('USER'),
  // Allocation fields
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  allocatedHours: z.number().min(0).optional().nullable(),
  allocatedPercentage: z.number().int().min(0).max(100).optional().nullable(),
  // Fields for auto-creating user from employee
  employeeCode: z.string().optional(),
  GSEmployeeID: z.string().optional(),
  displayName: z.string().optional(),
  email: z.string().optional(),
}).strict();

export const UpdateTaskTeamSchema = z.object({
  role: z.enum(['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER']),
}).strict();

/**
 * Task Allocation schemas (for multiple allocations per user)
 */
export const CreateTaskAllocationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER']).default('USER'),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  allocatedHours: z.number().min(0).optional().nullable(),
  allocatedPercentage: z.number().int().min(0).max(100).optional().nullable(),
}).strict();

export const UpdateTaskAllocationSchema = z.object({
  role: z.enum(['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER']).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  allocatedHours: z.number().min(0).optional().nullable(),
  allocatedPercentage: z.number().int().min(0).max(100).optional().nullable(),
  actualHours: z.number().min(0).optional().nullable(),
}).strict();

/**
 * Client validation schemas
 */
export const UpdateClientSchema = z.object({
  // New required fields from external DB
  clientCode: z.string().max(10).optional(),
  clientNameFull: z.string().max(255).nullable().optional(),
  groupCode: z.string().max(10).optional(),
  groupDesc: z.string().max(150).optional(),
  clientPartner: z.string().max(10).optional(),
  clientManager: z.string().max(10).optional(),
  clientIncharge: z.string().max(10).optional(),
  active: z.string().max(3).optional(),
  clientDateOpen: z.coerce.date().nullable().optional(),
  clientDateTerminate: z.coerce.date().nullable().optional(),
  industry: z.string().max(255).nullable().optional(),
  sector: z.string().max(255).nullable().optional(),
  forvisMazarsIndustry: z.string().max(255).nullable().optional(),
  forvisMazarsSector: z.string().max(255).nullable().optional(),
  forvisMazarsSubsector: z.string().max(255).nullable().optional(),
  clientOCFlag: z.boolean().optional(),
  clientTaxFlag: z.boolean().nullable().optional(),
  clientSecFlag: z.boolean().nullable().optional(),
  creditor: z.boolean().nullable().optional(),
  rolePlayer: z.boolean().optional(),
  typeCode: z.string().max(10).optional(),
  typeDesc: z.string().max(50).optional(),
}).strict();

export const CreateClientSchema = z.object({
  // New required fields from external DB
  clientCode: z.string().min(1).max(10),
  clientNameFull: z.string().max(255).nullable().optional(),
  groupCode: z.string().min(1).max(10),
  groupDesc: z.string().min(1).max(150),
  clientPartner: z.string().min(1).max(10),
  clientManager: z.string().min(1).max(10),
  clientIncharge: z.string().min(1).max(10),
  active: z.string().min(1).max(3),
  clientDateOpen: z.coerce.date().nullable().optional(),
  clientDateTerminate: z.coerce.date().nullable().optional(),
  industry: z.string().max(255).nullable().optional(),
  sector: z.string().max(255).nullable().optional(),
  forvisMazarsIndustry: z.string().max(255).nullable().optional(),
  forvisMazarsSector: z.string().max(255).nullable().optional(),
  forvisMazarsSubsector: z.string().max(255).nullable().optional(),
  clientOCFlag: z.boolean(),
  clientTaxFlag: z.boolean().nullable().optional(),
  clientSecFlag: z.boolean().nullable().optional(),
  creditor: z.boolean().nullable().optional(),
  rolePlayer: z.boolean(),
  typeCode: z.string().min(1).max(10),
  typeDesc: z.string().min(1).max(50),
}).strict();

/**
 * Tax Adjustment validation schemas
 */
export const UpdateTaxAdjustmentSchema = z.object({
  type: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  amount: z.number().optional(),
  status: z.enum(['SUGGESTED', 'APPROVED', 'REJECTED', 'PENDING']).optional(),
  sourceDocuments: z.string().nullable().optional(),
  extractedData: z.string().nullable().optional(),
  calculationDetails: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sarsSection: z.string().max(100).nullable().optional(),
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
}).strict();

export const CreateTaxAdjustmentSchema = z.object({
  taskId: z.number().int().positive(),
  type: z.string().max(100),
  description: z.string().max(1000),
  amount: z.number(),
  status: z.enum(['SUGGESTED', 'APPROVED', 'REJECTED', 'PENDING']).optional(),
  sourceDocuments: z.string().nullable().optional(),
  extractedData: z.string().nullable().optional(),
  calculationDetails: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sarsSection: z.string().max(100).nullable().optional(),
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
}).strict();

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

/**
 * Opinion Draft schemas
 */
export const CreateOpinionDraftSchema = z.object({
  taskId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  version: z.number().int().positive().default(1),
}).strict();

export const UpdateOpinionSectionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  reviewed: z.boolean().optional(),
  order: z.number().int().positive().optional(),
}).strict();

/**
 * Notification Preference schemas
 */
export const UpdateNotificationPreferenceSchema = z.object({
  emailEnabled: z.boolean(),
}).strict();

export const CreateNotificationPreferenceSchema = z.object({
  taskId: z.number().int().positive().nullable().optional(),
  notificationType: z.string().min(1).max(100),
  emailEnabled: z.boolean().default(true),
}).strict();

/**
 * In-App Notification schemas
 */
export const UpdateInAppNotificationSchema = z.object({
  isRead: z.boolean(),
}).strict();

export const SendUserMessageSchema = z.object({
  recipientUserId: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  taskId: z.number().int().positive().optional(),
  actionUrl: z.string().max(500).optional(),
}).strict();

export const NotificationFiltersSchema = z.object({
  isRead: z.boolean().optional(),
  taskId: z.number().int().positive().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
}).strict();

/**
 * Template schemas
 */
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['ENGAGEMENT_LETTER', 'PROPOSAL', 'AGREEMENT']),
  serviceLine: z.string().optional(),
  projectType: z.string().optional(),
  content: z.string(),
  active: z.boolean().default(true),
}).strict();

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(['ENGAGEMENT_LETTER', 'PROPOSAL', 'AGREEMENT']).optional(),
  serviceLine: z.string().nullable().optional(),
  projectType: z.string().nullable().optional(),
  content: z.string().optional(),
  active: z.boolean().optional(),
}).strict();

export const CreateTemplateSectionSchema = z.object({
  sectionKey: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  isRequired: z.boolean().default(true),
  isAiAdaptable: z.boolean().default(false),
  order: z.number().int().positive(),
  applicableServiceLines: z.array(z.string()).optional(),
  applicableProjectTypes: z.array(z.string()).optional(),
}).strict();

export const UpdateTemplateSectionSchema = z.object({
  sectionKey: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  isRequired: z.boolean().optional(),
  isAiAdaptable: z.boolean().optional(),
  order: z.number().int().positive().optional(),
  applicableServiceLines: z.array(z.string()).nullable().optional(),
  applicableProjectTypes: z.array(z.string()).nullable().optional(),
}).strict();

/**
 * Client Acceptance and Continuance Questionnaire Schemas
 */

// Questionnaire types
export const QuestionnaireTypeSchema = z.enum([
  'ACCEPTANCE_FULL',
  'ACCEPTANCE_LITE',
  'CONTINUANCE_FULL',
  'CONTINUANCE_LITE',
]);

// Risk rating
export const RiskRatingSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

// Document type
export const DocumentTypeSchema = z.enum(['WECHECK', 'PONG', 'OTHER']);

// Initialize questionnaire
export const InitializeQuestionnaireSchema = z.object({
  questionnaireType: QuestionnaireTypeSchema.optional(), // Optional: will auto-detect if not provided
});

// Save answers
export const SaveAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      answer: z.string().max(10000),
      comment: z.string().max(10000).optional(),
    })
  ),
});

// Alternative: save answers by question key (simpler for frontend)
export const SaveAnswersByKeySchema = z.object({
  answers: z.array(
    z.object({
      questionKey: z.string().min(1).max(100),
      answer: z.string().max(10000),
      comment: z.string().max(10000).optional(),
    })
  ),
});

// Submit questionnaire for review
export const SubmitQuestionnaireSchema = z.object({
  responseId: z.number().int().positive(),
});

// Upload document
export const UploadDocumentSchema = z.object({
  documentType: DocumentTypeSchema,
  responseId: z.number().int().positive().optional(), // Optional if response not created yet
});

// Review and approve questionnaire (Partner/System Admin)
export const ReviewQuestionnaireSchema = z.object({
  responseId: z.number().int().positive(),
  approved: z.boolean(),
  reviewComments: z.string().max(5000).optional(),
});

/**
 * Type inference from schemas
 */
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateTaxAdjustmentInput = z.infer<typeof UpdateTaxAdjustmentSchema>;
export type CreateTaxAdjustmentInput = z.infer<typeof CreateTaxAdjustmentSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type UpdateNotificationPreferenceInput = z.infer<typeof UpdateNotificationPreferenceSchema>;
export type CreateNotificationPreferenceInput = z.infer<typeof CreateNotificationPreferenceSchema>;
export type UpdateInAppNotificationInput = z.infer<typeof UpdateInAppNotificationSchema>;
export type SendUserMessageInput = z.infer<typeof SendUserMessageSchema>;
export type NotificationFiltersInput = z.infer<typeof NotificationFiltersSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
export type CreateTemplateSectionInput = z.infer<typeof CreateTemplateSectionSchema>;
export type UpdateTemplateSectionInput = z.infer<typeof UpdateTemplateSectionSchema>;
export type InitializeQuestionnaireInput = z.infer<typeof InitializeQuestionnaireSchema>;
export type SaveAnswersInput = z.infer<typeof SaveAnswersSchema>;
export type SaveAnswersByKeyInput = z.infer<typeof SaveAnswersByKeySchema>;
export type SubmitQuestionnaireInput = z.infer<typeof SubmitQuestionnaireSchema>;
export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;
export type ReviewQuestionnaireInput = z.infer<typeof ReviewQuestionnaireSchema>;

/**
 * Analytics validation schemas
 */
export const UploadAnalyticsDocumentSchema = z.object({
  documentType: z.enum(['AFS', 'MANAGEMENT_ACCOUNTS', 'BANK_STATEMENTS', 'CASH_FLOW', 'OTHER']),
}).strict();

export const GenerateCreditRatingSchema = z.object({
  documentIds: z.array(z.number().int().positive()).min(1, 'At least one document is required'),
}).strict();

export const CreditRatingQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type UploadAnalyticsDocumentInput = z.infer<typeof UploadAnalyticsDocumentSchema>;
export type GenerateCreditRatingInput = z.infer<typeof GenerateCreditRatingSchema>;
export type CreditRatingQueryInput = z.infer<typeof CreditRatingQuerySchema>;

/**
 * Runtime validation schemas for database JSON fields
 */
export const FinancialRatiosSchema = z.object({
  // Liquidity Ratios
  currentRatio: z.number().optional(),
  quickRatio: z.number().optional(),
  cashRatio: z.number().optional(),
  
  // Profitability Ratios
  grossMargin: z.number().optional(),
  netMargin: z.number().optional(),
  returnOnAssets: z.number().optional(),
  returnOnEquity: z.number().optional(),
  
  // Leverage Ratios
  debtToEquity: z.number().optional(),
  interestCoverage: z.number().optional(),
  debtRatio: z.number().optional(),
  
  // Efficiency Ratios
  assetTurnover: z.number().optional(),
  inventoryTurnover: z.number().optional(),
  receivablesTurnover: z.number().optional(),
});

export const RiskFactorSchema = z.object({
  factor: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  impact: z.string(),
  mitigation: z.string().optional(),
});

export const IndustryComparisonSchema = z.object({
  industry: z.string(),
  companyPosition: z.string(),
  keyMetrics: z.array(
    z.object({
      metric: z.string(),
      companyValue: z.number(),
      industryAverage: z.number(),
      comparison: z.string(),
    })
  ),
});

export const CreditAnalysisReportSchema = z.object({
  executiveSummary: z.string().min(1),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  riskFactors: z.array(RiskFactorSchema),
  industryComparison: IndustryComparisonSchema.optional(),
  recommendations: z.array(z.string()),
  detailedAnalysis: z.string().min(1),
});

export type FinancialRatiosInput = z.infer<typeof FinancialRatiosSchema>;
export type CreditAnalysisReportInput = z.infer<typeof CreditAnalysisReportSchema>;

/**
 * Business Development CRM validation schemas
 */

// BD Stage schemas
export const CreateBDStageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  order: z.number().int().positive(),
  probability: z.number().min(0).max(100),
  serviceLine: z.string().max(50).nullable().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // Hex color
}).strict();

export const UpdateBDStageSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  order: z.number().int().positive().optional(),
  probability: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).strict();

// BD Contact schemas
export const CreateBDContactSchema = z.object({
  companyName: z.string().min(1).max(500),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  jobTitle: z.string().max(200).optional(),
  linkedin: safeUrl(500).optional(),
  industry: z.string().max(200).optional(),
  sector: z.string().max(200).optional(),
  website: safeUrl(500).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).default('South Africa'),
  notes: z.string().max(10000).optional(),
}).strict();

export const UpdateBDContactSchema = z.object({
  companyName: z.string().min(1).max(500).optional(),
  firstName: z.string().min(1).max(200).optional(),
  lastName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  jobTitle: z.string().max(200).optional(),
  linkedin: safeUrl(500).optional(),
  industry: z.string().max(200).optional(),
  sector: z.string().max(200).optional(),
  website: safeUrl(500).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().max(10000).optional(),
}).strict();

// BD Opportunity schemas
export const CreateBDOpportunitySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  GSClientID: z.number().int().positive().optional(), // For existing clients  
  companyName: z.string().min(1).max(500).optional(), // For new prospects - required if GSClientID not provided
  contactId: z.number().int().positive().optional(),
  serviceLine: z.enum(['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT']),
  stageId: z.number().int().positive(),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  source: z.enum(['REFERRAL', 'WEBSITE', 'COLD_CALL', 'NETWORKING', 'EXISTING_CLIENT', 'OTHER']).optional(),
  assignedTo: z.string().min(1).optional(), // Will default to creator if not provided
}).strict().refine(
  (data) => data.GSClientID !== undefined || (data.companyName !== undefined && data.companyName.length > 0),
  { message: 'Either select an existing client or enter a company name for a new prospect', path: ['companyName'] }
);

export const UpdateBDOpportunitySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  GSClientID: z.number().int().positive().nullable().optional(),
  companyName: z.string().min(1).max(500).optional(),
  contactId: z.number().int().positive().nullable().optional(),
  serviceLine: z.enum(['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT']).optional(),
  stageId: z.number().int().positive().optional(),
  value: z.number().min(0).nullable().optional(),
  probability: z.number().min(0).max(100).nullable().optional(),
  expectedCloseDate: z.coerce.date().nullable().optional(),
  source: z.enum(['REFERRAL', 'WEBSITE', 'COLD_CALL', 'NETWORKING', 'EXISTING_CLIENT', 'OTHER']).nullable().optional(),
  status: z.enum(['OPEN', 'WON', 'LOST', 'ABANDONED']).optional(),
  lostReason: z.string().max(1000).nullable().optional(),
  assignedTo: z.string().min(1).optional(),
}).strict();

export const MoveBDOpportunityStageSchema = z.object({
  stageId: z.number().int().positive(),
}).strict();

export const ConvertBDOpportunitySchema = z.object({
  createTask: z.boolean().default(false),
  taskType: z.string().optional(), // Required if createTask = true
  taskName: z.string().optional(),
  taskDescription: z.string().optional(),
}).strict();

// BD Activity schemas
export const CreateBDActivitySchema = z.object({
  opportunityId: z.number().int().positive(),
  contactId: z.number().int().positive().optional(),
  activityType: z.enum(['MEETING', 'CALL', 'EMAIL', 'TASK', 'NOTE', 'OTHER']),
  subject: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
  dueDate: z.coerce.date().optional(),
  duration: z.number().int().min(0).optional(), // Minutes
  location: z.string().max(500).optional(),
  assignedTo: z.string().min(1).optional(), // Will default to creator if not provided
}).strict();

export const UpdateBDActivitySchema = z.object({
  contactId: z.number().int().positive().nullable().optional(),
  activityType: z.enum(['MEETING', 'CALL', 'EMAIL', 'TASK', 'NOTE', 'OTHER']).optional(),
  subject: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  duration: z.number().int().min(0).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  assignedTo: z.string().min(1).optional(),
}).strict();

// BD Proposal schemas
export const CreateBDProposalSchema = z.object({
  opportunityId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  proposedValue: z.number().min(0).optional(),
  validUntil: z.coerce.date().optional(),
  version: z.number().int().positive().default(1),
}).strict();

export const UpdateBDProposalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  proposedValue: z.number().min(0).nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED']).optional(),
  sentAt: z.coerce.date().nullable().optional(),
  viewedAt: z.coerce.date().nullable().optional(),
  respondedAt: z.coerce.date().nullable().optional(),
}).strict();

// BD Company Research schema
export const CompanyResearchSchema = z.object({
  companyName: z.string().min(1).max(500),
}).strict();

export type CompanyResearchInput = z.infer<typeof CompanyResearchSchema>;

// BD Note schemas
export const CreateBDNoteSchema = z.object({
  opportunityId: z.number().int().positive(),
  content: z.string().min(1).max(10000),
  isPrivate: z.boolean().default(false),
}).strict();

export const UpdateBDNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isPrivate: z.boolean().optional(),
}).strict();

// BD Query/Filter schemas
export const BDOpportunityFiltersSchema = z.object({
  serviceLine: z.string().optional(),
  stageId: z.number().int().positive().optional(),
  status: z.enum(['OPEN', 'WON', 'LOST', 'ABANDONED']).optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(), // Search in title, company name
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
}).strict();

export const BDActivityFiltersSchema = z.object({
  opportunityId: z.number().int().positive().optional(),
  activityType: z.enum(['MEETING', 'CALL', 'EMAIL', 'TASK', 'NOTE', 'OTHER']).optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  assignedTo: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
}).strict();

export const BDAnalyticsFiltersSchema = z.object({
  serviceLine: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  assignedTo: z.string().optional(),
}).strict();

/**
 * Type inference from BD schemas
 */
export type CreateBDStageInput = z.infer<typeof CreateBDStageSchema>;
export type UpdateBDStageInput = z.infer<typeof UpdateBDStageSchema>;
export type CreateBDContactInput = z.infer<typeof CreateBDContactSchema>;
export type UpdateBDContactInput = z.infer<typeof UpdateBDContactSchema>;
export type CreateBDOpportunityInput = z.infer<typeof CreateBDOpportunitySchema>;
export type UpdateBDOpportunityInput = z.infer<typeof UpdateBDOpportunitySchema>;
export type MoveBDOpportunityStageInput = z.infer<typeof MoveBDOpportunityStageSchema>;
export type ConvertBDOpportunityInput = z.infer<typeof ConvertBDOpportunitySchema>;
export type CreateBDActivityInput = z.infer<typeof CreateBDActivitySchema>;
export type UpdateBDActivityInput = z.infer<typeof UpdateBDActivitySchema>;
export type CreateBDProposalInput = z.infer<typeof CreateBDProposalSchema>;
export type UpdateBDProposalInput = z.infer<typeof UpdateBDProposalSchema>;
export type CreateBDNoteInput = z.infer<typeof CreateBDNoteSchema>;
export type UpdateBDNoteInput = z.infer<typeof UpdateBDNoteSchema>;
export type BDOpportunityFiltersInput = z.infer<typeof BDOpportunityFiltersSchema>;
export type BDActivityFiltersInput = z.infer<typeof BDActivityFiltersSchema>;
export type BDAnalyticsFiltersInput = z.infer<typeof BDAnalyticsFiltersSchema>;

/**
 * Service Line Assignment Schemas
 */

// Service line role enum
const ServiceLineRoleSchema = z.enum([
  'ADMINISTRATOR',
  'PARTNER',
  'MANAGER',
  'SUPERVISOR',
  'USER',
  'VIEWER',
]);

// Main service line codes
const ServiceLineCodeSchema = z.enum([
  'TAX',
  'AUDIT',
  'ACCOUNTING',
  'ADVISORY',
  'QRM',
  'BUSINESS_DEV',
  'IT',
  'FINANCE',
  'HR',
  'COUNTRY_MANAGEMENT',
]);

// Service line assignment type
const AssignmentTypeSchema = z.enum(['main', 'subgroup']);

/**
 * Grant service line access (main service line or specific sub-groups)
 */
export const GrantServiceLineAccessSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: AssignmentTypeSchema,
  masterCode: ServiceLineCodeSchema.optional(),
  subGroups: z.array(z.string()).optional(),
  role: ServiceLineRoleSchema,
}).strict().refine((data) => {
  // If type is 'main', masterCode is required
  if (data.type === 'main') return !!data.masterCode;
  // If type is 'subgroup', subGroups array is required and must not be empty
  if (data.type === 'subgroup') return data.subGroups && data.subGroups.length > 0;
  return false;
}, {
  message: 'For main type, masterCode is required. For subgroup type, subGroups array is required and must not be empty.',
});

/**
 * Revoke service line access
 */
export const RevokeServiceLineAccessSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: AssignmentTypeSchema,
  masterCode: ServiceLineCodeSchema.optional(),
  subGroups: z.array(z.string()).optional(),
}).strict().refine((data) => {
  // If type is 'main', masterCode is required
  if (data.type === 'main') return !!data.masterCode;
  // If type is 'subgroup', subGroups array is required and must not be empty
  if (data.type === 'subgroup') return data.subGroups && data.subGroups.length > 0;
  return false;
}, {
  message: 'For main type, masterCode is required. For subgroup type, subGroups array is required and must not be empty.',
});

/**
 * Update service line role
 */
export const UpdateServiceLineRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  serviceLineOrSubGroup: z.string().min(1, 'Service line or sub-group code is required'),
  role: ServiceLineRoleSchema,
  isSubGroup: z.boolean().default(false),
}).strict();

/**
 * Switch assignment type between main and specific sub-groups
 */
export const SwitchAssignmentTypeSchema = z.object({
  action: z.literal('switchType'),
  userId: z.string().min(1, 'User ID is required'),
  masterCode: ServiceLineCodeSchema,
  newType: z.enum(['main', 'specific']),
  specificSubGroups: z.array(z.string()).optional(),
}).strict().refine((data) => {
  // If newType is 'specific', specificSubGroups is required
  if (data.newType === 'specific') {
    return data.specificSubGroups && data.specificSubGroups.length > 0;
  }
  return true;
}, {
  message: 'When switching to specific sub-groups, specificSubGroups array is required and must not be empty.',
});

// Inferred types
export type GrantServiceLineAccessInput = z.infer<typeof GrantServiceLineAccessSchema>;
export type RevokeServiceLineAccessInput = z.infer<typeof RevokeServiceLineAccessSchema>;
export type UpdateServiceLineRoleInput = z.infer<typeof UpdateServiceLineRoleSchema>;
export type SwitchAssignmentTypeInput = z.infer<typeof SwitchAssignmentTypeSchema>;

/**
 * News Bulletin validation schemas
 */

// Bulletin category enum
export const BulletinCategorySchema = z.enum([
  'ANNOUNCEMENT',
  'POLICY_UPDATE',
  'EVENT',
  'ACHIEVEMENT',
  'REMINDER',
  'CLIENT_WIN',
  'MARKET_UPDATE',
  'INDUSTRY_NEWS',
  'PARTNERSHIP',
  'HIRING',
]);

// Create bulletin schema
export const CreateNewsBulletinSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  summary: z.string().min(1, 'Summary is required').max(500),
  body: z.string().min(1, 'Body content is required'),
  category: BulletinCategorySchema,
  serviceLine: z.string().max(50).nullable().optional(),
  effectiveDate: z.coerce.date(),
  expiresAt: z.coerce.date().nullable().optional(),
  contactPerson: z.string().max(255).nullable().optional(),
  actionRequired: z.boolean().default(false),
  callToActionUrl: safeUrl(500).nullable().optional(),
  callToActionText: z.string().max(100).nullable().optional(),
  isPinned: z.boolean().default(false),
  documentFileName: z.string().max(255).nullable().optional(),
  documentFilePath: z.string().max(500).nullable().optional(),
  documentFileSize: z.number().int().positive().nullable().optional(),
  documentUploadedAt: z.coerce.date().nullable().optional(),
  showDocumentLink: z.boolean().default(false),
}).strict();

// Update bulletin schema
export const UpdateNewsBulletinSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  summary: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  category: BulletinCategorySchema.optional(),
  serviceLine: z.string().max(50).nullable().optional(),
  effectiveDate: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  contactPerson: z.string().max(255).nullable().optional(),
  actionRequired: z.boolean().optional(),
  callToActionUrl: safeUrl(500).nullable().optional(),
  callToActionText: z.string().max(100).nullable().optional(),
  isPinned: z.boolean().optional(),
  isActive: z.boolean().optional(),
  documentFileName: z.string().max(255).nullable().optional(),
  documentFilePath: z.string().max(500).nullable().optional(),
  documentFileSize: z.number().int().positive().nullable().optional(),
  documentUploadedAt: z.coerce.date().nullable().optional(),
  showDocumentLink: z.boolean().optional(),
}).strict();

// Bulletin filters schema
export const NewsBulletinFiltersSchema = z.object({
  category: BulletinCategorySchema.optional(),
  serviceLine: z.string().optional(),
  isActive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  includeExpired: z.boolean().default(false),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// Inferred types
export type CreateNewsBulletinInput = z.infer<typeof CreateNewsBulletinSchema>;
export type UpdateNewsBulletinInput = z.infer<typeof UpdateNewsBulletinSchema>;
export type NewsBulletinFiltersInput = z.infer<typeof NewsBulletinFiltersSchema>;

/**
 * External Links validation schemas
 */
export const CreateExternalLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  url: safeUrl(500),
  icon: z.string().min(1, 'Icon is required').max(50, 'Icon name must be 50 characters or less'),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).strict();

export const UpdateExternalLinkSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: safeUrl(500).optional(),
  icon: z.string().min(1).max(50).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
}).strict();

// Inferred types
export type CreateExternalLinkInput = z.infer<typeof CreateExternalLinkSchema>;
export type UpdateExternalLinkInput = z.infer<typeof UpdateExternalLinkSchema>;

/**
 * Service Line Master validation schemas
 */
export const CreateServiceLineMasterSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less').transform(val => val.toUpperCase().trim()),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less').transform(val => val.trim()),
  description: z.string().max(500, 'Description must be 500 characters or less').nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).strict();

export const UpdateServiceLineMasterSchema = z.object({
  name: z.string().min(1).max(200).transform(val => val.trim()).optional(),
  description: z.string().max(500).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
}).strict();

export const ReorderServiceLineMasterSchema = z.object({
  items: z.array(
    z.object({
      code: z.string().min(1).max(50),
      sortOrder: z.number().int().min(0).max(10000),
    })
  ).min(1, 'At least one item is required').max(100, 'Maximum 100 items per batch'),
}).strict();

// Inferred types
export type CreateServiceLineMasterInput = z.infer<typeof CreateServiceLineMasterSchema>;
export type UpdateServiceLineMasterInput = z.infer<typeof UpdateServiceLineMasterSchema>;
export type ReorderServiceLineMasterInput = z.infer<typeof ReorderServiceLineMasterSchema>;
export type CreateTaskAllocationInput = z.infer<typeof CreateTaskAllocationSchema>;
export type UpdateTaskAllocationInput = z.infer<typeof UpdateTaskAllocationSchema>;

/**
 * Page Permission validation schemas
 */

// Role enum for page permissions
const PagePermissionRoleSchema = z.enum([
  'SYSTEM_ADMIN',
  'ADMINISTRATOR',
  'PARTNER',
  'MANAGER',
  'SUPERVISOR',
  'USER',
  'VIEWER',
]);

// Access level enum
const PageAccessLevelSchema = z.enum(['NONE', 'VIEW', 'FULL']);

// Single page permission schema
export const PagePermissionSchema = z.object({
  pathname: z.string().min(1, 'Pathname is required').regex(/^\/dashboard.*/, 'Pathname must start with /dashboard'),
  role: PagePermissionRoleSchema,
  accessLevel: PageAccessLevelSchema,
  description: z.string().max(1000).nullable().optional(),
  active: z.boolean().default(true),
}).strict();

// Bulk update schema for setting all roles at once
export const PagePermissionBulkSchema = z.object({
  pathname: z.string().min(1, 'Pathname is required').regex(/^\/dashboard.*/, 'Pathname must start with /dashboard'),
  description: z.string().max(1000).nullable().optional(),
  permissions: z.record(PagePermissionRoleSchema, PageAccessLevelSchema),
}).strict();

// Update page permission schema
export const UpdatePagePermissionSchema = z.object({
  accessLevel: PageAccessLevelSchema.optional(),
  description: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

// Page registry entry schema
export const PageRegistryEntrySchema = z.object({
  pathname: z.string().min(1),
  pageTitle: z.string().max(255).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
});

// Inferred types
export type PagePermissionInput = z.infer<typeof PagePermissionSchema>;
export type PagePermissionBulkInput = z.infer<typeof PagePermissionBulkSchema>;
export type UpdatePagePermissionInput = z.infer<typeof UpdatePagePermissionSchema>;
export type PageRegistryEntryInput = z.infer<typeof PageRegistryEntrySchema>;

// =============================================================================
// Tool Schemas
// =============================================================================

// Create tool schema
export const CreateToolSchema = z.object({
  name: safeString(100, 1),
  code: safeIdentifier(50, 1),
  description: safeString(500).optional().nullable(),
  icon: safeString(100).optional().nullable(),
  componentPath: safeString(255, 1),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
}).strict();

// Update tool schema
export const UpdateToolSchema = z.object({
  name: safeString(100, 1).optional(),
  code: safeIdentifier(50, 1).optional(),
  description: safeString(500).optional().nullable(),
  icon: safeString(100).optional().nullable(),
  componentPath: safeString(255, 1).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
}).strict();

// Register tool schema
export const RegisterToolSchema = z.object({
  code: safeIdentifier(50).min(1, 'Tool code is required'),
}).strict();

// Update tool assignments schema
export const UpdateToolAssignmentsSchema = z.object({
  subServiceLineGroups: z.array(safeIdentifier(50)).max(100),
}).strict();

// Add tool to task schema
export const AddToolToTaskSchema = z.object({
  toolId: z.number().int().positive('Tool ID must be a positive integer'),
  sortOrder: z.number().int().min(0).max(9999).default(0),
}).strict();

// Inferred types for tools
export type CreateToolInput = z.infer<typeof CreateToolSchema>;
export type UpdateToolInput = z.infer<typeof UpdateToolSchema>;
export type RegisterToolInput = z.infer<typeof RegisterToolSchema>;
export type UpdateToolAssignmentsInput = z.infer<typeof UpdateToolAssignmentsSchema>;
export type AddToolToTaskInput = z.infer<typeof AddToolToTaskSchema>;


