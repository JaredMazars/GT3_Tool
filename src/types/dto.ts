/**
 * Data Transfer Objects (DTOs)
 * Define the shape of data transferred between client and server
 */

import { ProjectType } from './index';

/**
 * DTO for updating a project
 */
export interface UpdateProjectDTO {
  name?: string;
  description?: string | null;
  projectType?: ProjectType;
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
  name?: string;
  clientCode?: string | null;
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
}

/**
 * DTO for creating a client
 */
export interface CreateClientDTO {
  name: string;
  clientCode?: string | null;
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
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}













