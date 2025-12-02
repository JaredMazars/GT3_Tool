/**
 * Zod validation schemas for runtime type checking
 */

import { z } from 'zod';
import { CreditRatingGrade, AnalyticsDocumentType } from '@/types/analytics';

/**
 * Project validation schemas
 */
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  projectType: z.enum([
    'TAX_CALCULATION', 'TAX_OPINION', 'TAX_ADMINISTRATION',
    'AUDIT_ENGAGEMENT', 'AUDIT_REVIEW', 'AUDIT_REPORT',
    'FINANCIAL_STATEMENTS', 'BOOKKEEPING', 'MANAGEMENT_ACCOUNTS',
    'ADVISORY_PROJECT', 'CONSULTING_ENGAGEMENT', 'STRATEGY_REVIEW',
    'QRM_AUDIT', 'QRM_COMPLIANCE', 'QRM_RISK_ASSESSMENT',
    'BD_CAMPAIGN', 'BD_PROPOSAL', 'BD_MARKET_RESEARCH',
    'IT_IMPLEMENTATION', 'IT_SUPPORT', 'IT_INFRASTRUCTURE',
    'FINANCE_REPORTING', 'FINANCE_BUDGETING', 'FINANCE_ANALYSIS',
    'HR_RECRUITMENT', 'HR_TRAINING', 'HR_POLICY'
  ]).optional(),
  serviceLine: z.enum(['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR']).optional(),
  taxYear: z.number().int().min(2000).max(2100).optional(),
  taxPeriodStart: z.coerce.date().nullable().optional(),
  taxPeriodEnd: z.coerce.date().nullable().optional(),
  assessmentYear: z.string().max(50).optional(),
  submissionDeadline: z.coerce.date().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
}).strict();

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  projectType: z.enum([
    'TAX_CALCULATION', 'TAX_OPINION', 'TAX_ADMINISTRATION',
    'AUDIT_ENGAGEMENT', 'AUDIT_REVIEW', 'AUDIT_REPORT',
    'FINANCIAL_STATEMENTS', 'BOOKKEEPING', 'MANAGEMENT_ACCOUNTS',
    'ADVISORY_PROJECT', 'CONSULTING_ENGAGEMENT', 'STRATEGY_REVIEW',
    'QRM_AUDIT', 'QRM_COMPLIANCE', 'QRM_RISK_ASSESSMENT',
    'BD_CAMPAIGN', 'BD_PROPOSAL', 'BD_MARKET_RESEARCH',
    'IT_IMPLEMENTATION', 'IT_SUPPORT', 'IT_INFRASTRUCTURE',
    'FINANCE_REPORTING', 'FINANCE_BUDGETING', 'FINANCE_ANALYSIS',
    'HR_RECRUITMENT', 'HR_TRAINING', 'HR_POLICY'
  ]),
  serviceLine: z.enum(['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR']),
  taxYear: z.number().int().min(2000).max(2100).optional(),
  taxPeriodStart: z.coerce.date().nullable().optional(),
  taxPeriodEnd: z.coerce.date().nullable().optional(),
  assessmentYear: z.string().max(50).optional(),
  submissionDeadline: z.coerce.date().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
}).strict();

/**
 * Project User Management validation schemas
 */
export const AddProjectUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'REVIEWER', 'EDITOR', 'VIEWER']).optional().default('VIEWER'),
}).strict();

export const UpdateProjectUserSchema = z.object({
  role: z.enum(['ADMIN', 'REVIEWER', 'EDITOR', 'VIEWER']),
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
  projectId: z.number().int().positive(),
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
  projectId: z.number().int().positive(),
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
  projectId: z.number().int().positive().nullable().optional(),
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
  projectId: z.number().int().positive().optional(),
  actionUrl: z.string().max(500).optional(),
}).strict();

export const NotificationFiltersSchema = z.object({
  isRead: z.boolean().optional(),
  projectId: z.number().int().positive().optional(),
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
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
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
  linkedin: z.string().url().max(500).optional(),
  industry: z.string().max(200).optional(),
  sector: z.string().max(200).optional(),
  website: z.string().url().max(500).optional(),
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
  linkedin: z.string().url().max(500).optional(),
  industry: z.string().max(200).optional(),
  sector: z.string().max(200).optional(),
  website: z.string().url().max(500).optional(),
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
  clientId: z.number().int().positive().optional(), // For existing clients  
  companyName: z.string().min(1).max(500).optional(), // For new prospects - required if clientId not provided
  contactId: z.number().int().positive().optional(),
  serviceLine: z.enum(['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR']),
  stageId: z.number().int().positive(),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  source: z.enum(['REFERRAL', 'WEBSITE', 'COLD_CALL', 'NETWORKING', 'EXISTING_CLIENT', 'OTHER']).optional(),
  assignedTo: z.string().min(1).optional(), // Will default to creator if not provided
}).strict().refine(
  (data) => data.clientId !== undefined || (data.companyName !== undefined && data.companyName.length > 0),
  { message: 'Either select an existing client or enter a company name for a new prospect', path: ['companyName'] }
);

export const UpdateBDOpportunitySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  clientId: z.number().int().positive().nullable().optional(),
  companyName: z.string().min(1).max(500).optional(),
  contactId: z.number().int().positive().nullable().optional(),
  serviceLine: z.enum(['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR']).optional(),
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
  createProject: z.boolean().default(false),
  projectType: z.string().optional(), // Required if createProject = true
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

