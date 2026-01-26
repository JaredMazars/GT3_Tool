import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import {
  getTaxAdjustments,
  createTaxAdjustment,
  deleteAllTaxAdjustments,
} from '@/lib/tools/tax-calculation/api/adjustmentsHandler';
import { toTaskId } from '@/types/branded';

// Allowed status filter values
const ALLOWED_STATUSES = ['SUGGESTED', 'APPROVED', 'REJECTED', 'MODIFIED', 'PENDING'] as const;

// Schema for query params
const QueryParamsSchema = z.object({
  status: z.enum(ALLOWED_STATUSES).optional(),
});

// Schema for creating a tax adjustment
const CreateTaxAdjustmentSchema = z.object({
  type: z.enum(['DEBIT', 'CREDIT', 'ALLOWANCE', 'RECOUPMENT']),
  description: z.string().min(1).max(500),
  amount: z.number().or(z.string().transform(val => parseFloat(val))),
  sarsSection: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  calculationDetails: z.record(z.unknown()).optional(),
  sourceDocuments: z.array(z.number()).optional(),
}).strict();

/**
 * GET /api/tasks/[id]/tax-adjustments
 * Fetch all tax adjustments for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const brandedTaskId = toTaskId(taskId);
    const { searchParams } = new URL(request.url);

    // Validate query params
    const statusParam = searchParams.get('status') || undefined;
    if (statusParam) {
      const queryResult = QueryParamsSchema.safeParse({ status: statusParam });
      if (!queryResult.success) {
        throw new AppError(
          400,
          `Invalid status filter. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR,
          { providedStatus: statusParam }
        );
      }
    }

    // Get adjustments using tool handler
    const adjustments = await getTaxAdjustments(brandedTaskId, statusParam);

    return NextResponse.json(successResponse(adjustments));
  },
});

/**
 * POST /api/tasks/[id]/tax-adjustments
 * Create a new tax adjustment
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: CreateTaxAdjustmentSchema,
  handler: async (request, { params, data }) => {
    const taskId = parseTaskId(params.id);
    const brandedTaskId = toTaskId(taskId);

    // Create adjustment using tool handler with validated data
    const adjustment = await createTaxAdjustment(brandedTaskId, data);

    return NextResponse.json(successResponse(adjustment), { status: 201 });
  },
});

/**
 * DELETE /api/tasks/[id]/tax-adjustments
 * Delete all tax adjustments for a task (use with caution)
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'ADMIN',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const brandedTaskId = toTaskId(taskId);
    const { searchParams } = new URL(request.url);

    // Validate status param if provided
    const statusParam = searchParams.get('status') || undefined;
    if (statusParam) {
      const queryResult = QueryParamsSchema.safeParse({ status: statusParam });
      if (!queryResult.success) {
        throw new AppError(
          400,
          `Invalid status filter. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR,
          { providedStatus: statusParam }
        );
      }
    }

    // Delete adjustments using tool handler
    const result = await deleteAllTaxAdjustments(brandedTaskId, statusParam);

    return NextResponse.json(successResponse(result));
  },
});
