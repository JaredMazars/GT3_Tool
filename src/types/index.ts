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
  COUNTRY_MANAGEMENT = 'COUNTRY_MANAGEMENT',
}

export enum TaskType {
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
  // Country Management Service Line
  COUNTRY_REPORT = 'COUNTRY_REPORT',
  COUNTRY_ANALYSIS = 'COUNTRY_ANALYSIS',
  COUNTRY_DASHBOARD = 'COUNTRY_DASHBOARD',
  COUNTRY_METRICS = 'COUNTRY_METRICS',
}

// System-level roles (User.role)
// SYSTEM_ADMIN: System-wide access to all features and service lines
// USER: Regular user, requires service line access
export enum SystemRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  USER = 'USER',
}

// Task-level roles (TaskTeam.role)
export enum TaskRole {
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// Service line roles (ServiceLineUser.role)
// ADMIN = Partner, MANAGER = Manager, USER = Staff, VIEWER = Viewer
export enum ServiceLineRole {
  ADMINISTRATOR = 'ADMINISTRATOR', // Service line administrator (highest)
  PARTNER = 'PARTNER',   // Partner level (same as ADMIN)
  MANAGER = 'MANAGER',   // Manager level
  SUPERVISOR = 'SUPERVISOR', // Supervisor level  
  USER = 'USER',         // Staff level
  VIEWER = 'VIEWER',     // View-only access
}

// News Bulletin Categories
export enum BulletinCategory {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  POLICY_UPDATE = 'POLICY_UPDATE',
  EVENT = 'EVENT',
  ACHIEVEMENT = 'ACHIEVEMENT',
  REMINDER = 'REMINDER',
  CLIENT_WIN = 'CLIENT_WIN',
  MARKET_UPDATE = 'MARKET_UPDATE',
  INDUSTRY_NEWS = 'INDUSTRY_NEWS',
  PARTNERSHIP = 'PARTNERSHIP',
  HIRING = 'HIRING',
}

// News Bulletin
export interface NewsBulletin {
  id: number;
  title: string;
  summary: string;
  body: string;
  category: BulletinCategory;
  serviceLine: string | null;
  effectiveDate: Date;
  expiresAt: Date | null;
  contactPerson: string | null;
  actionRequired: boolean;
  callToActionUrl: string | null;
  callToActionText: string | null;
  isPinned: boolean;
  isActive: boolean;
  documentFileName: string | null;
  documentFilePath: string | null;
  documentFileSize: number | null;
  documentUploadedAt: Date | null;
  showDocumentLink: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Client/Organization
export interface Client {
  id: number;
  // New required fields from external DB
  clientCode: string;
  GSClientID: string; // UniqueIdentifier GUID
  clientNameFull?: string | null;
  groupCode: string;
  groupDesc: string;
  clientPartner: string;
  clientPartnerName?: string; // Enriched from Employee table
  clientManager: string;
  clientManagerName?: string; // Enriched from Employee table
  clientIncharge: string;
  clientInchargeName?: string; // Enriched from Employee table
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
export interface Task {
  id: number;
  clientId?: number | null;         // Internal FK - for ALL queries and relations
  GSTaskID: string;                 // External ID - for sync only
  GSClientID?: string | null;       // External ID - kept for sync reference only
  TaskCode: string;                 // For display/search only
  TaskDesc: string;
  TaskPartner: string;
  TaskPartnerName: string;
  TaskManager: string;
  TaskManagerName: string;
  OfficeCode: string;
  SLGroup: string;
  ServLineCode: string;
  ServLineDesc: string;
  Active: string;
  TaskDateOpen: Date;
  TaskDateTerminate?: Date | null;
  // New task-like fields
  name?: string | null;
  description?: string | null;
  status: string;
  archived: boolean;
  serviceLine?: string | null;
  assessmentYear?: string | null;
  projectType: TaskType;
  submissionDeadline?: Date | null;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  taxYear?: number | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  client?: Client | null;
  team?: TaskTeam[];
  users?: TaskTeam[];
  acceptance?: TaskAcceptance | null;
  engagementLetter?: TaskEngagementLetter | null;
  documents?: TaskDocument[];
  // Flattened acceptance fields (from TaskAcceptance)
  acceptanceApproved?: boolean;
  acceptanceApprovedBy?: string | null;
  acceptanceApprovedAt?: Date | null;
  // Flattened engagement letter fields (from TaskEngagementLetter)
  engagementLetterGenerated?: boolean;
  engagementLetterUploaded?: boolean;
  engagementLetterContent?: string | null;
  engagementLetterTemplateId?: number | null;
  engagementLetterGeneratedBy?: string | null;
  engagementLetterGeneratedAt?: Date | null;
  engagementLetterPath?: string | null;
  engagementLetterUploadedBy?: string | null;
  engagementLetterUploadedAt?: Date | null;
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

// Sub Service Line Group (from ServiceLineExternal)
export interface SubServiceLineGroup {
  code: string;
  description: string;
  activeTasks: number; // Actually counts active tasks in this sub-service line group
  totalTasks: number; // Actually counts total tasks in this sub-service line group
  masterCode: string;
}

// Task Team Access
export interface TaskTeam {
  id: number;
  taskId: number;
  userId: string;
  role: TaskRole;
  startDate?: Date | null;
  endDate?: Date | null;
  allocatedHours?: number | null;
  allocatedPercentage?: number | null;
  actualHours?: number | null;
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

export interface TeamAllocation {
  id: number;
  taskId: number;
  taskName: string;
  role: TaskRole;
  startDate: Date | null;
  endDate: Date | null;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
}

export interface TeamMemberWithAllocations {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  allocations: TeamAllocation[];
}

export interface TaskAcceptance {
  id: number;
  taskId: number;
  acceptanceApproved: boolean;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  questionnaireType?: string | null;
  overallRiskScore?: number | null;
  riskRating?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskEngagementLetter {
  id: number;
  taskId: number;
  generated: boolean;
  uploaded: boolean;
  filePath?: string | null;
  content?: string | null;
  templateId?: number | null;
  generatedAt?: Date | null;
  generatedBy?: string | null;
  uploadedAt?: Date | null;
  uploadedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDocument {
  id: number;
  taskId: number;
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

// Active Directory User (from Microsoft Graph)
export interface ADUser {
  id: string;
  email: string;
  displayName: string;
  userPrincipalName?: string;
  jobTitle?: string | null;
  department?: string | null;
  officeLocation?: string | null;
  mobilePhone?: string | null;
  businessPhones?: string[];
  city?: string | null;
  country?: string | null;
  companyName?: string | null;
  employeeId?: string | null;
  employeeType?: string | null;
  givenName?: string | null;
  surname?: string | null;
}

// Employee Search Result (from Employee table with User matching)
export interface EmployeeSearchResult {
  id: number;
  GSEmployeeID: string;
  EmpCode: string;
  EmpName: string;
  EmpNameFull: string;
  WinLogon: string | null;
  ServLineCode: string;
  ServLineDesc: string;
  OfficeCode: string;
  Team: string | null;
  EmpCatDesc: string;
  User: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

// Tax Opinion Models
export interface OpinionDraft {
  id: number;
  taskId: number;
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
  taskId: number;
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
  taskId: number;
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
  taskId: number;
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
  taskId: number;
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
  taskId: number;
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
  taskId: number;
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

// Client Documents
export enum DocumentType {
  ENGAGEMENT_LETTER = 'ENGAGEMENT_LETTER',
  ADMINISTRATION = 'ADMINISTRATION',
  ADJUSTMENT = 'ADJUSTMENT',
  OPINION = 'OPINION',
  SARS = 'SARS',
}

export interface ClientDocument {
  id: number;
  documentType: DocumentType;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  taskId: number;
  taskName: string;
  uploadedBy?: string | null;
  createdAt: Date;
  // Type-specific fields
  category?: string; // For Administration and Opinion documents
  description?: string; // For Administration documents
  version?: number; // For Administration documents
  extractionStatus?: string; // For Adjustment documents
  referenceNumber?: string; // For SARS documents
  subject?: string; // For SARS documents
}

export interface DocumentsByType {
  engagementLetters: ClientDocument[];
  administration: ClientDocument[];
  adjustments: ClientDocument[];
  opinions: ClientDocument[];
  sars: ClientDocument[];
}

export interface ClientDocumentsResponse {
  documents: DocumentsByType;
  totalCount: number;
}

// Re-export notification types
export * from './notification';

// Re-export task stage types
export * from './task-stages';

// Re-export analytics types
export * from './analytics';

/**
 * Tax Adjustment Model
 * Centralized type definition for TaxAdjustment to prevent duplication
 * Matches Prisma schema
 */
export interface TaxAdjustment {
  id: number;
  taskId: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT' | string;
  description: string;
  amount: number;
  status: string;
  sourceDocuments?: string | null;
  extractedData?: string | null;
  calculationDetails?: string | null;
  notes?: string | null;
  sarsSection?: string | null;
  confidenceScore?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  AdjustmentDocument?: AdjustmentDocument[];
}

/**
 * Tax Adjustment Display Type
 * Simplified version for display purposes (without relations)
 */
export interface TaxAdjustmentDisplay {
  id: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT' | string;
  description: string;
  amount: number;
  status: string;
  sarsSection?: string | null;
  confidenceScore?: number | null;
  notes?: string | null;
  createdAt?: Date | string;
}

/**
 * Adjustment Document Model
 */
export interface AdjustmentDocument {
  id: number;
  taskId: number;
  taxAdjustmentId?: number | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy?: string | null;
  extractionStatus: string;
  extractedData?: string | null;
  extractionError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Extended types with employee names (enriched via joins)

/**
 * Client with enriched employee names (DEPRECATED)
 * The base Client interface now includes employee name fields.
 * This type is kept for backwards compatibility but is now equivalent to Client.
 * 
 * @deprecated Use Client interface directly - it now includes enriched employee names
 */
export interface ClientWithEmployees extends Client {}

/**
 * Debtors with enriched biller name
 * Extends Debtors with biller name from Employee table
 */
export interface DebtorsWithEmployee {
  id: number;
  PeriodRef?: number | null;
  PeriodStart?: Date | null;
  PeriodEnd?: Date | null;
  GSClientID: string;
  Biller: string;
  BillerName?: string;
  BillerNameFull?: string;
  OfficeCode: string;
  ServLineCode: string;
  LTDInv?: number | null;
  LTDFee?: number | null;
  LTDVat?: number | null;
  LTDCn?: number | null;
  LTDRec?: number | null;
  LTDInt?: number | null;
  LTDPLFC?: number | null;
  YTDInv?: number | null;
  YTDFee?: number | null;
  YTDVat?: number | null;
  YTDCn?: number | null;
  YTDRec?: number | null;
  YTDInt?: number | null;
  YTDPLFC?: number | null;
  PTDInv?: number | null;
  PTDFee?: number | null;
  PTDVat?: number | null;
  PTDCn?: number | null;
  PTDRec?: number | null;
  PTDInt?: number | null;
  PTDPLFC?: number | null;
  CBal?: number | null;
  BalCurr?: number | null;
  Bal30?: number | null;
  Bal60?: number | null;
  Bal90?: number | null;
  Bal120?: number | null;
  Bal150?: number | null;
  Bal180?: number | null;
  DebtorProvision?: number | null;
  PTDDebtorProvision?: number | null;
  YTDDebtorProvision?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DrsTransactions already has employee names from external system
 * This type documents the structure for reference
 */
export interface DrsTransaction {
  id: number;
  GSDebtorsTranID: string;
  GSClientID: string;
  ClientCode: string;
  ClientNameFull?: string | null;
  GroupCode: string;
  GroupDesc: string;
  OfficeCode: string;
  OfficeDesc: string;
  ServLineCode: string;
  ServLineDesc: string;
  Biller: string;
  BillerName: string; // Already provided by external system
  TranDate: Date;
  EntryType?: string | null;
  Ordinal?: number | null;
  Reference?: string | null;
  InvNumber?: string | null;
  Amount?: number | null;
  Vat?: number | null;
  Total?: number | null;
  Batch?: string | null;
  Allocation: string;
  Narration?: string | null;
  VatCode?: string | null;
  PeriodKey: number;
  EntryGroupCode?: string | null;
  EntryGroup?: string | null;
  DRAccount?: string | null;
  CRAccount?: string | null;
  ClientPartner: string;
  ClientPartnerName: string; // Already provided by external system
  ClientManager: string;
  ClientManagerName: string; // Already provided by external system
  createdAt: Date;
  updatedAt: Date;
} 
