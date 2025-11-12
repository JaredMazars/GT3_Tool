import { prisma } from '../db/prisma';
import { AppError, ErrorCodes } from '../errorHandler';

/**
 * Common utility functions for API routes
 */

/**
 * Parse and validate project ID from route params
 * @param id - String ID from route params
 * @returns Validated numeric project ID
 * @throws AppError if ID is invalid
 */
export function parseProjectId(id: string | undefined): number {
  if (!id || id === 'undefined' || id === 'null') {
    throw new AppError(
      400,
      'Project ID is required',
      ErrorCodes.VALIDATION_ERROR,
      { providedId: id, type: typeof id }
    );
  }
  
  const projectId = parseInt(id, 10);
  
  if (isNaN(projectId) || projectId <= 0) {
    throw new AppError(
      400,
      'Invalid project ID format - must be a positive integer',
      ErrorCodes.VALIDATION_ERROR,
      { providedId: id, parsedValue: projectId }
    );
  }
  
  return projectId;
}

/**
 * Parse and validate adjustment ID from route params
 * @param id - String ID from route params
 * @returns Validated numeric adjustment ID
 * @throws AppError if ID is invalid
 */
export function parseAdjustmentId(id: string | undefined): number {
  if (!id || id === 'undefined' || id === 'null') {
    throw new AppError(
      400,
      'Adjustment ID is required',
      ErrorCodes.VALIDATION_ERROR,
      { providedId: id, type: typeof id }
    );
  }
  
  const adjustmentId = parseInt(id, 10);
  
  if (isNaN(adjustmentId) || adjustmentId <= 0) {
    throw new AppError(
      400,
      'Invalid adjustment ID format - must be a positive integer',
      ErrorCodes.VALIDATION_ERROR,
      { providedId: id, parsedValue: adjustmentId }
    );
  }
  
  return adjustmentId;
}

/**
 * Parse and validate document ID from route params
 * @param id - String ID from route params
 * @returns Validated numeric document ID
 * @throws AppError if ID is invalid
 */
export function parseDocumentId(id: string): number {
  const documentId = parseInt(id, 10);
  
  if (isNaN(documentId) || documentId <= 0) {
    throw new AppError(
      400,
      'Invalid document ID format',
      ErrorCodes.VALIDATION_ERROR,
      { providedId: id }
    );
  }
  
  return documentId;
}

/**
 * Fetch project by ID or throw 404 error
 * @param projectId - Project ID
 * @param include - Optional Prisma include object
 * @returns Project object
 * @throws AppError if project not found
 */
export async function getProjectOrThrow(
  projectId: number,
  include?: Record<string, any>
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include,
  });
  
  if (!project) {
    throw new AppError(
      404,
      'Project not found',
      ErrorCodes.NOT_FOUND,
      { projectId }
    );
  }
  
  return project;
}

/**
 * Fetch tax adjustment by ID or throw 404 error
 * @param adjustmentId - Adjustment ID
 * @param include - Optional Prisma include object
 * @returns Tax adjustment object
 * @throws AppError if adjustment not found
 */
export async function getTaxAdjustmentOrThrow(
  adjustmentId: number,
  include?: Record<string, any>
) {
  const adjustment = await prisma.taxAdjustment.findUnique({
    where: { id: adjustmentId },
    include,
  });
  
  if (!adjustment) {
    throw new AppError(
      404,
      'Tax adjustment not found',
      ErrorCodes.NOT_FOUND,
      { adjustmentId }
    );
  }
  
  return adjustment;
}

/**
 * Fetch document by ID or throw 404 error
 * @param documentId - Document ID
 * @param include - Optional Prisma include object
 * @returns Adjustment document object
 * @throws AppError if document not found
 */
export async function getDocumentOrThrow(
  documentId: number,
  include?: Record<string, any>
) {
  const document = await prisma.adjustmentDocument.findUnique({
    where: { id: documentId },
    include,
  });
  
  if (!document) {
    throw new AppError(
      404,
      'Document not found',
      ErrorCodes.NOT_FOUND,
      { documentId }
    );
  }
  
  return document;
}

/**
 * Fetch mapped account by ID or throw 404 error
 * @param accountId - Account ID
 * @param include - Optional Prisma include object
 * @returns Mapped account object
 * @throws AppError if account not found
 */
export async function getMappedAccountOrThrow(
  accountId: number,
  include?: Record<string, any>
) {
  const account = await prisma.mappedAccount.findUnique({
    where: { id: accountId },
    include,
  });
  
  if (!account) {
    throw new AppError(
      404,
      'Mapped account not found',
      ErrorCodes.NOT_FOUND,
      { accountId }
    );
  }
  
  return account;
}

/**
 * Verify that a project exists and is accessible
 * Useful for authorization checks
 * @param projectId - Project ID to verify
 * @throws AppError if project doesn't exist
 */
export async function verifyProjectExists(projectId: number): Promise<void> {
  const exists = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  
  if (!exists) {
    throw new AppError(
      404,
      'Project not found',
      ErrorCodes.NOT_FOUND,
      { projectId }
    );
  }
}

/**
 * Verify that an adjustment belongs to a specific project
 * @param adjustmentId - Adjustment ID
 * @param projectId - Expected project ID
 * @throws AppError if adjustment doesn't belong to project
 */
export async function verifyAdjustmentBelongsToProject(
  adjustmentId: number,
  projectId: number
): Promise<void> {
  const adjustment = await prisma.taxAdjustment.findUnique({
    where: { id: adjustmentId },
    select: { projectId: true },
  });
  
  if (!adjustment) {
    throw new AppError(
      404,
      'Tax adjustment not found',
      ErrorCodes.NOT_FOUND,
      { adjustmentId }
    );
  }
  
  if (adjustment.projectId !== projectId) {
    throw new AppError(
      403,
      'Tax adjustment does not belong to this project',
      ErrorCodes.FORBIDDEN,
      { adjustmentId, projectId, actualProjectId: adjustment.projectId }
    );
  }
}

/**
 * Standard success response formatter
 * @param data - Response data
 * @param meta - Optional metadata (pagination, etc.)
 * @returns Formatted response object
 */
export function successResponse<T>(data: T, meta?: Record<string, any>) {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

/**
 * Calculate pagination metadata
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export function paginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}


