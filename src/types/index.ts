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
export enum ProjectType {
  TAX_CALCULATION = 'TAX_CALCULATION',
  TAX_OPINION = 'TAX_OPINION',
  TAX_ADMINISTRATION = 'TAX_ADMINISTRATION',
}

export enum ProjectRole {
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// Client/Organization
export interface Client {
  id: number;
  clientCode?: string | null;
  name: string;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  industry?: string | null;
  legalEntityType?: string | null;
  jurisdiction?: string | null;
  taxRegime?: string | null;
  financialYearEnd?: string | null;
  baseCurrency?: string | null;
  primaryContact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Project
export interface Project {
  id: number;
  name: string;
  description?: string | null;
  projectType: ProjectType;
  taxYear?: number | null;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  assessmentYear?: string | null;
  submissionDeadline?: Date | null;
  clientId?: number | null;
  client?: Client | null;
  status: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  users?: ProjectUser[];
  _count?: {
    mappings: number;
    taxAdjustments: number;
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