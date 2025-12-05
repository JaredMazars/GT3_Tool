import { prisma } from '../db/prisma';
import { AppError, ErrorCodes } from './errorHandler';
import { Prisma } from '@prisma/client';

/**
 * Common utility functions for API routes
 */

/**
 * Generic numeric ID parser and validator
 * @param id - String ID from route params
 * @param entityName - Name of the entity (e.g., 'Project', 'Adjustment', 'Document')
 * @param required - Whether the ID is required (default: true)
 * @returns Validated numeric ID
 * @throws AppError if ID is invalid
 */
export function parseNumericId(
  id: string | undefined,
  entityName: string,
  required: boolean = true
): number {
  if (!id || id === 'undefined' || id === 'null') {
    if (required) {
      throw new AppError(
        400,
        `${entityName} ID is required`,
        ErrorCodes.VALIDATION_ERROR,
        { providedId: id, type: typeof id }
      );
    }
    throw new AppError(
      400,
      `Invalid ${entityName} ID`,
      ErrorCodes.VALIDATION_ERROR,
      { providedId: id }
    );
  }
  
  const parsedId = Number.parseInt(id, 10);
  
  if (Number.isNaN(parsedId) || parsedId <= 0) {
    throw new AppError(
      400,
      `Invalid ${entityName} ID format - must be a positive integer`,
      ErrorCodes.VALIDATION_ERROR,
      { providedId: id, parsedValue: parsedId }
    );
  }
  
  return parsedId;
}

/**
 * Parse and validate task ID from route params
 * @param id - String ID from route params
 * @returns Validated numeric task ID
 * @throws AppError if ID is invalid
 */
export function parseTaskId(id: string | undefined): number {
  return parseNumericId(id, 'Task');
}

/**
 * Parse and validate project ID from route params
 * @param id - String ID from route params
 * @returns Validated numeric project ID
 * @throws AppError if ID is invalid
 * @deprecated Use parseTaskId instead
 */
export function parseProjectId(id: string | undefined): number {
  return parseNumericId(id, 'Project');
}

/**
 * Parse and validate adjustment ID from route params
 * @param id - String ID from route params
 * @returns Validated numeric adjustment ID
 * @throws AppError if ID is invalid
 */
export function parseAdjustmentId(id: string | undefined): number {
  return parseNumericId(id, 'Adjustment');
}

/**
 * Parse and validate document ID from route params
 * @param id - String ID from route params
 * @returns Validated numeric document ID
 * @throws AppError if ID is invalid
 */
export function parseDocumentId(id: string): number {
  return parseNumericId(id, 'Document', false);
}

/**
 * Fetch task by ID or throw 404 error
 * @param taskId - Task ID
 * @param include - Optional Prisma include object
 * @returns Task object
 * @throws AppError if task not found
 */
export async function getTaskOrThrow(
  taskId: number,
  include?: Prisma.TaskInclude
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include,
  });
  
  if (!task) {
    throw new AppError(
      404,
      'Task not found',
      ErrorCodes.NOT_FOUND,
      { taskId }
    );
  }
  
  return task;
}

/**
 * Fetch project by ID or throw 404 error
 * @param projectId - Project ID
 * @param include - Optional Prisma include object
 * @returns Project object
 * @throws AppError if project not found
 * @deprecated Use getTaskOrThrow instead
 */
export async function getProjectOrThrow(
  projectId: number,
  include?: Prisma.TaskInclude
) {
  return getTaskOrThrow(projectId, include);
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
  include?: Prisma.TaxAdjustmentInclude
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
  include?: Prisma.AdjustmentDocumentInclude
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
  include?: Prisma.MappedAccountInclude
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
 * Verify that a task exists and is accessible
 * Useful for authorization checks
 * @param taskId - Task ID to verify
 * @throws AppError if task doesn't exist
 */
export async function verifyTaskExists(taskId: number): Promise<void> {
  const exists = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true },
  });
  
  if (!exists) {
    throw new AppError(
      404,
      'Task not found',
      ErrorCodes.NOT_FOUND,
      { taskId }
    );
  }
}

/**
 * Verify that a project exists and is accessible
 * Useful for authorization checks
 * @param projectId - Project ID to verify
 * @throws AppError if project doesn't exist
 * @deprecated Use verifyTaskExists instead
 */
export async function verifyProjectExists(projectId: number): Promise<void> {
  return verifyTaskExists(projectId);
}

/**
 * Verify that an adjustment belongs to a specific task
 * @param adjustmentId - Adjustment ID
 * @param taskId - Expected task ID
 * @throws AppError if adjustment doesn't belong to task
 */
export async function verifyAdjustmentBelongsToTask(
  adjustmentId: number,
  taskId: number
): Promise<void> {
  const adjustment = await prisma.taxAdjustment.findUnique({
    where: { id: adjustmentId },
    select: { taskId: true },
  });
  
  if (!adjustment) {
    throw new AppError(
      404,
      'Tax adjustment not found',
      ErrorCodes.NOT_FOUND,
      { adjustmentId }
    );
  }
  
  if (adjustment.taskId !== taskId) {
    throw new AppError(
      403,
      'Tax adjustment does not belong to this task',
      ErrorCodes.FORBIDDEN,
      { adjustmentId, taskId, actualTaskId: adjustment.taskId }
    );
  }
}

/**
 * Verify that an adjustment belongs to a specific project
 * @param adjustmentId - Adjustment ID
 * @param projectId - Expected project ID
 * @throws AppError if adjustment doesn't belong to project
 * @deprecated Use verifyAdjustmentBelongsToTask instead
 */
export async function verifyAdjustmentBelongsToProject(
  adjustmentId: number,
  projectId: number
): Promise<void> {
  return verifyAdjustmentBelongsToTask(adjustmentId, projectId);
}

/**
 * Standard success response formatter
 * @param data - Response data
 * @param meta - Optional metadata (pagination, etc.)
 * @returns Formatted response object
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
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



