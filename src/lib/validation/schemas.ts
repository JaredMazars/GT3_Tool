/**
 * Zod validation schemas for runtime type checking
 */

import { z } from 'zod';

/**
 * Project validation schemas
 */
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  projectType: z.enum(['TAX_CALCULATION', 'TAX_OPINION', 'TAX_ADMINISTRATION']).optional(),
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
  projectType: z.enum(['TAX_CALCULATION', 'TAX_OPINION', 'TAX_ADMINISTRATION']),
  taxYear: z.number().int().min(2000).max(2100).optional(),
  taxPeriodStart: z.coerce.date().nullable().optional(),
  taxPeriodEnd: z.coerce.date().nullable().optional(),
  assessmentYear: z.string().max(50).optional(),
  submissionDeadline: z.coerce.date().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
}).strict();

/**
 * Client validation schemas
 */
export const UpdateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  clientCode: z.string().max(50).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),
  taxNumber: z.string().max(100).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  legalEntityType: z.string().max(100).nullable().optional(),
  jurisdiction: z.string().max(100).nullable().optional(),
  taxRegime: z.string().max(100).nullable().optional(),
  financialYearEnd: z.string().max(50).nullable().optional(),
  baseCurrency: z.string().max(10).nullable().optional(),
  primaryContact: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
}).strict();

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(200),
  clientCode: z.string().max(50).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),
  taxNumber: z.string().max(100).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  legalEntityType: z.string().max(100).nullable().optional(),
  jurisdiction: z.string().max(100).nullable().optional(),
  taxRegime: z.string().max(100).nullable().optional(),
  financialYearEnd: z.string().max(50).nullable().optional(),
  baseCurrency: z.string().max(10).nullable().optional(),
  primaryContact: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
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
 * Type inference from schemas
 */
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateTaxAdjustmentInput = z.infer<typeof UpdateTaxAdjustmentSchema>;
export type CreateTaxAdjustmentInput = z.infer<typeof CreateTaxAdjustmentSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;


