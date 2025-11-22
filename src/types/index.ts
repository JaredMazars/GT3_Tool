export interface MappedData {
  id: number;
  accountCode: string;
  accountName: string;
  section: string;
  subsection: string;
  balance: number;
  priorYearBalance: number;
  sarsItem: string;
}

// Enums matching Prisma schema
export enum ServiceLine {
  TAX = 'TAX',
  AUDIT = 'AUDIT',
  ACCOUNTING = 'ACCOUNTING',
  ADVISORY = 'ADVISORY',
  // Shared Services
  QRM = 'QRM',
  BUSINESS_DEV = 'BUSINESS_DEV',
  IT = 'IT',
  FINANCE = 'FINANCE',
  HR = 'HR',
}

export enum ProjectType {
  // Tax Service Line
  TAX_CALCULATION = 'TAX_CALCULATION',
  TAX_OPINION = 'TAX_OPINION',
  TAX_ADMINISTRATION = 'TAX_ADMINISTRATION',
  // Audit Service Line
  AUDIT_ENGAGEMENT = 'AUDIT_ENGAGEMENT',
  AUDIT_REVIEW = 'AUDIT_REVIEW',
  AUDIT_REPORT = 'AUDIT_REPORT',
  // Accounting Service Line
  FINANCIAL_STATEMENTS = 'FINANCIAL_STATEMENTS',
  BOOKKEEPING = 'BOOKKEEPING',
  MANAGEMENT_ACCOUNTS = 'MANAGEMENT_ACCOUNTS',
  // Advisory Service Line
  ADVISORY_PROJECT = 'ADVISORY_PROJECT',
  CONSULTING_ENGAGEMENT = 'CONSULTING_ENGAGEMENT',
  STRATEGY_REVIEW = 'STRATEGY_REVIEW',
  // QRM Service Line
  QRM_AUDIT = 'QRM_AUDIT',
  QRM_COMPLIANCE = 'QRM_COMPLIANCE',
  QRM_RISK_ASSESSMENT = 'QRM_RISK_ASSESSMENT',
  // Business Development Service Line
  BD_CAMPAIGN = 'BD_CAMPAIGN',
  BD_PROPOSAL = 'BD_PROPOSAL',
  BD_MARKET_RESEARCH = 'BD_MARKET_RESEARCH',
  // IT Service Line
  IT_IMPLEMENTATION = 'IT_IMPLEMENTATION',
  IT_SUPPORT = 'IT_SUPPORT',
  IT_INFRASTRUCTURE = 'IT_INFRASTRUCTURE',
  // Finance Service Line
  FINANCE_REPORTING = 'FINANCE_REPORTING',
  FINANCE_BUDGETING = 'FINANCE_BUDGETING',
  FINANCE_ANALYSIS = 'FINANCE_ANALYSIS',
  // HR Service Line
  HR_RECRUITMENT = 'HR_RECRUITMENT',
  HR_TRAINING = 'HR_TRAINING',
  HR_POLICY = 'HR_POLICY',
}

export enum ProjectRole {
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export enum ServiceLineRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

// Client/Organization
export interface Client {
  id: number;
  // New required fields from external DB
  clientCode: string;
  clientNameFull?: string | null;
  groupCode: string;
  groupDesc: string;
  clientPartner: string;
  clientManager: string;
  clientIncharge: string;
  active: string;
  clientOCFlag: boolean;
  rolePlayer: boolean;
  typeCode: string;
  typeDesc: string;
  // New optional fields from external DB
  clientDateOpen?: Date | null;
  clientDateTerminate?: Date | null;
  sector?: string | null;
  forvisMazarsIndustry?: string | null;
  forvisMazarsSector?: string | null;
  forvisMazarsSubsector?: string | null;
  clientTaxFlag?: boolean | null;
  clientSecFlag?: boolean | null;
  creditor?: boolean | null;
  industry?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Project
export interface Project {
  id: number;
  name: string;
  description?: string | null;
  projectType: ProjectType;
  serviceLine: ServiceLine | string;
  taxYear?: number | null;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  assessmentYear?: string | null;
  submissionDeadline?: Date | null;
  clientId?: number | null;
  client?: Client | null;
  status: string;
  archived: boolean;
  // Client Acceptance and Engagement Letter Workflow
  acceptanceApproved?: boolean;
  acceptanceApprovedBy?: string | null;
  acceptanceApprovedAt?: Date | null;
  engagementLetterGenerated?: boolean;
  engagementLetterUploaded?: boolean;
  engagementLetterPath?: string | null;
  engagementLetterUploadedBy?: string | null;
  engagementLetterUploadedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  users?: ProjectUser[];
  _count?: {
    mappings: number;
    taxAdjustments: number;
  };
}

// Service Line User Access
export interface ServiceLineUser {
  id: number;
  userId: string;
  serviceLine: ServiceLine | string;
  role: ServiceLineRole | string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

// Project User Access
export interface ProjectUser {
  id: number;
  projectId: number;
  userId: string;
  role: ProjectRole;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  // API returns User with capital U from Prisma
  User?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

// Active Directory User (from Microsoft Graph)
export interface ADUser {
  id: string;
  email: string;
  displayName: string;
  jobTitle?: string | null;
  department?: string | null;
}

// Tax Opinion Models
export interface OpinionDraft {
  id: number;
  projectId: number;
  version: number;
  title: string;
  content: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  documents?: OpinionDocument[];
  sections?: OpinionSection[];
  chatMessages?: OpinionChatMessage[];
}

export interface OpinionDocument {
  id: number;
  opinionDraftId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  category: string;
  extractedText?: string | null;
  vectorized: boolean;
  uploadedBy: string;
  createdAt: Date;
}

export interface OpinionSection {
  id: number;
  opinionDraftId: number;
  sectionType: string;
  title: string;
  content: string;
  aiGenerated: boolean;
  reviewed: boolean;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpinionChatMessage {
  id: number;
  opinionDraftId: number;
  role: string;
  content: string;
  metadata?: string | null;
  sectionGenerationId?: string | null;
  sectionType?: string | null;
  createdAt: Date;
}

export interface ResearchNote {
  id: number;
  projectId: number;
  title: string;
  content: string;
  tags?: string | null;
  category?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LegalPrecedent {
  id: number;
  projectId: number;
  caseName: string;
  citation: string;
  court?: string | null;
  year?: number | null;
  summary: string;
  relevance?: string | null;
  link?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tax Administration Models
export interface SarsResponse {
  id: number;
  projectId: number;
  referenceNumber: string;
  subject: string;
  content: string;
  status: string;
  responseType: string;
  deadline?: Date | null;
  sentDate?: Date | null;
  receivedDate?: Date | null;
  documentPath?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdministrationDocument {
  id: number;
  projectId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  category: string;
  description?: string | null;
  version: number;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceChecklistItem {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  priority: string;
  status: string;
  assignedTo?: string | null;
  completedAt?: Date | null;
  completedBy?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilingStatus {
  id: number;
  projectId: number;
  filingType: string;
  description?: string | null;
  status: string;
  deadline?: Date | null;
  submittedDate?: Date | null;
  approvedDate?: Date | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export notification types
export * from './notification';

// Re-export project stage types
export * from './project-stages'; 