/**
 * Data Transfer Objects (DTOs)
 * Define the shape of data transferred between client and server
 */

import { ProjectType, ServiceLine, ServiceLineRole } from './index';

/**
 * DTO for updating a project
 */
export interface UpdateProjectDTO {
  name?: string;
  description?: string | null;
  projectType?: ProjectType;
  serviceLine?: ServiceLine | string;
  taxYear?: number;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  assessmentYear?: string;
  submissionDeadline?: Date | null;
  clientId?: number | null;
}

/**
 * DTO for creating a project
 */
export interface CreateProjectDTO {
  name: string;
  description?: string | null;
  projectType: ProjectType;
  serviceLine: ServiceLine | string;
  taxYear?: number;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  assessmentYear?: string;
  submissionDeadline?: Date | null;
  clientId?: number | null;
}

/**
 * DTO for updating a client
 */
export interface UpdateClientDTO {
  // New fields from external DB
  clientCode?: string;
  clientNameFull?: string | null;
  groupCode?: string;
  groupDesc?: string;
  clientPartner?: string;
  clientManager?: string;
  clientIncharge?: string;
  active?: string;
  clientDateOpen?: Date | null;
  clientDateTerminate?: Date | null;
  sector?: string | null;
  forvisMazarsIndustry?: string | null;
  forvisMazarsSector?: string | null;
  forvisMazarsSubsector?: string | null;
  clientOCFlag?: boolean;
  clientTaxFlag?: boolean | null;
  clientSecFlag?: boolean | null;
  creditor?: boolean | null;
  rolePlayer?: boolean;
  typeCode?: string;
  typeDesc?: string;
  industry?: string | null;
}

/**
 * DTO for creating a client
 */
export interface CreateClientDTO {
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
}

/**
 * DTO for updating a tax adjustment
 */
export interface UpdateTaxAdjustmentDTO {
  type?: string;
  description?: string;
  amount?: number;
  status?: string;
  sourceDocuments?: string | null;
  extractedData?: string | null;
  calculationDetails?: string | null;
  notes?: string | null;
  sarsSection?: string | null;
  confidenceScore?: number | null;
}

/**
 * DTO for creating a tax adjustment
 */
export interface CreateTaxAdjustmentDTO {
  projectId: number;
  type: string;
  description: string;
  amount: number;
  status?: string;
  sourceDocuments?: string | null;
  extractedData?: string | null;
  calculationDetails?: string | null;
  notes?: string | null;
  sarsSection?: string | null;
  confidenceScore?: number | null;
}

/**
 * Generic pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * DTO for service line with stats
 */
export interface ServiceLineWithStats {
  id?: number;
  serviceLine: ServiceLine | string;
  role: ServiceLineRole | string;
  projectCount: number;
  activeProjectCount: number;
}

/**
 * DTO for creating a service line user
 */
export interface CreateServiceLineUserDTO {
  userId: string;
  serviceLine: ServiceLine | string;
  role: ServiceLineRole | string;
}

/**
 * DTO for updating a service line user
 */
export interface UpdateServiceLineUserDTO {
  role?: ServiceLineRole | string;
}

/**
 * Service Line User entity with user details (basic DTO version)
 * For the full entity type with user relations, see ServiceLineUser in index.ts
 */
export interface ServiceLineUserDTO {
  id: number;
  userId: string;
  serviceLine: ServiceLine | string;
  role: ServiceLineRole | string;
  createdAt?: Date;
  updatedAt?: Date;
}














