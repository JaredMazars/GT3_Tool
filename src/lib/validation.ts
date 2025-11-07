import { z } from 'zod';

/**
 * Validation schemas for API requests
 */

// Project schemas
export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .transform(val => val?.trim()),
});

export const updateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .transform(val => val?.trim()),
});

// Tax adjustment schemas
export const taxAdjustmentTypeSchema = z.enum(['DEBIT', 'CREDIT', 'ALLOWANCE', 'RECOUPMENT']);
export const taxAdjustmentStatusSchema = z.enum(['SUGGESTED', 'APPROVED', 'REJECTED', 'MODIFIED']);

export const createTaxAdjustmentSchema = z.object({
  type: taxAdjustmentTypeSchema,
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .trim(),
  amount: z.number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number'),
  status: taxAdjustmentStatusSchema.optional().default('SUGGESTED'),
  sarsSection: z.string()
    .max(50, 'SARS section must be less than 50 characters')
    .optional(),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional(),
  confidenceScore: z.number()
    .min(0, 'Confidence score must be between 0 and 1')
    .max(1, 'Confidence score must be between 0 and 1')
    .optional(),
  calculationDetails: z.record(z.any()).optional(),
  extractedData: z.record(z.any()).optional(),
});

export const updateTaxAdjustmentSchema = z.object({
  type: taxAdjustmentTypeSchema.optional(),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  amount: z.number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number')
    .optional(),
  status: taxAdjustmentStatusSchema.optional(),
  sarsSection: z.string()
    .max(50, 'SARS section must be less than 50 characters')
    .optional()
    .nullable(),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .nullable(),
});

// Tax adjustment suggestion schema
export const generateSuggestionsSchema = z.object({
  useAI: z.boolean().optional().default(true),
  autoSave: z.boolean().optional().default(false),
});

// Mapped account schemas
export const createMappedAccountSchema = z.object({
  accountCode: z.string()
    .min(1, 'Account code is required')
    .max(50, 'Account code must be less than 50 characters')
    .trim(),
  accountName: z.string()
    .min(1, 'Account name is required')
    .max(200, 'Account name must be less than 200 characters')
    .trim(),
  section: z.string()
    .min(1, 'Section is required')
    .max(100, 'Section must be less than 100 characters')
    .trim(),
  subsection: z.string()
    .min(1, 'Subsection is required')
    .max(100, 'Subsection must be less than 100 characters')
    .trim(),
  balance: z.number()
    .finite('Balance must be a valid number'),
  priorYearBalance: z.number()
    .finite('Prior year balance must be a valid number')
    .optional()
    .default(0),
  sarsItem: z.string()
    .min(1, 'SARS item is required')
    .max(200, 'SARS item must be less than 200 characters')
    .trim(),
});

export const updateMappedAccountSchema = createMappedAccountSchema.partial();

// File upload schemas
export const fileUploadSchema = z.object({
  documentId: z.string()
    .min(1, 'Document ID is required')
    .optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .positive('Page must be positive')
    .optional()
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .positive('Limit must be positive')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
});

// Export format schema
export const exportFormatSchema = z.enum(['excel', 'pdf', 'xml']);

/**
 * Helper function to validate request body against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and parsed data
 * @throws ZodError if validation fails
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns success/error object instead of throwing
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success flag and either data or error
 */
export function safeValidateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: result.error };
}

/**
 * Format Zod validation errors for API response
 * @param error - Zod error object
 * @returns Formatted error message
 */
export function formatValidationError(error: z.ZodError): string {
  const errors = error.errors.map(err => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
  
  return errors.join('; ');
}





































