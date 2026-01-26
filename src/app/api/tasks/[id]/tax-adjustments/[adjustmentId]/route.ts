import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import {
  parseTaskId,
  parseAdjustmentId,
  successResponse,
  verifyAdjustmentBelongsToTask,
} from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';

// Schema for updating a tax adjustment
const UpdateTaxAdjustmentSchema = z.object({
  type: z.enum(['DEBIT', 'CREDIT', 'ALLOWANCE', 'RECOUPMENT']).optional(),
  description: z.string().min(1).max(500).optional(),
  amount: z.number().or(z.string().transform(val => parseFloat(val))).optional(),
  status: z.enum(['SUGGESTED', 'APPROVED', 'REJECTED', 'MODIFIED', 'PENDING']).optional(),
  sarsSection: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  calculationDetails: z.record(z.unknown()).optional(),
  extractedData: z.record(z.unknown()).optional(),
}).strict();

// Select fields for adjustment responses
const adjustmentSelect = {
  id: true,
  taskId: true,
  type: true,
  description: true,
  amount: true,
  status: true,
  sarsSection: true,
  notes: true,
  confidenceScore: true,
  calculationDetails: true,
  extractedData: true,
  sourceDocuments: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * GET /api/tasks/[id]/tax-adjustments/[adjustmentId]
 * Fetch a specific tax adjustment
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const adjustmentId = parseAdjustmentId(params.adjustmentId);

    // IDOR protection: verify adjustment belongs to task
    await verifyAdjustmentBelongsToTask(adjustmentId, taskId);

    const adjustment = await prisma.taxAdjustment.findUnique({
      where: { id: adjustmentId },
      select: {
        ...adjustmentSelect,
        AdjustmentDocument: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            extractionStatus: true,
            createdAt: true,
          },
        },
      },
    });

    if (!adjustment) {
      return NextResponse.json(
        { success: false, error: 'Tax adjustment not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const response = {
      ...adjustment,
      calculationDetails: adjustment.calculationDetails
        ? JSON.parse(adjustment.calculationDetails)
        : null,
      extractedData: adjustment.extractedData
        ? JSON.parse(adjustment.extractedData)
        : null,
      sourceDocuments: adjustment.sourceDocuments
        ? JSON.parse(adjustment.sourceDocuments)
        : null,
    };

    return NextResponse.json(successResponse(response));
  },
});

/**
 * PATCH /api/tasks/[id]/tax-adjustments/[adjustmentId]
 * Update a tax adjustment
 */
export const PATCH = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  schema: UpdateTaxAdjustmentSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);
    const brandedTaskId = toTaskId(taskId);
    const adjustmentId = parseAdjustmentId(params.adjustmentId);

    // IDOR protection: verify adjustment belongs to task
    await verifyAdjustmentBelongsToTask(adjustmentId, taskId);

    // Check if status is being changed to APPROVED or REJECTED - requires REVIEWER role
    if (data.status && (data.status === 'APPROVED' || data.status === 'REJECTED')) {
      const access = await checkTaskAccess(user.id, brandedTaskId, 'REVIEWER');
      if (!access.canAccess) {
        return NextResponse.json(
          { success: false, error: 'Only reviewers can approve or reject tax adjustments' },
          { status: 403 }
        );
      }
    } else {
      // Other edits require EDITOR role or higher
      const access = await checkTaskAccess(user.id, brandedTaskId, 'EDITOR');
      if (!access.canAccess) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Editor role required' },
          { status: 403 }
        );
      }
    }

    // Build update data object with explicit field mapping
    const updateData: Record<string, unknown> = {};

    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sarsSection !== undefined) updateData.sarsSection = data.sarsSection;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.confidenceScore !== undefined) updateData.confidenceScore = data.confidenceScore;

    if (data.calculationDetails !== undefined) {
      updateData.calculationDetails = JSON.stringify(data.calculationDetails);
    }
    if (data.extractedData !== undefined) {
      updateData.extractedData = JSON.stringify(data.extractedData);
    }

    // If status is being changed to MODIFIED, update the relevant fields
    if (data.status === 'MODIFIED' && (data.amount !== undefined || data.description !== undefined)) {
      updateData.status = 'MODIFIED';
    }

    const adjustment = await prisma.taxAdjustment.update({
      where: { id: adjustmentId },
      data: updateData,
      select: {
        ...adjustmentSelect,
        AdjustmentDocument: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
          },
        },
      },
    });

    // Parse JSON fields for response
    const response = {
      ...adjustment,
      calculationDetails: adjustment.calculationDetails
        ? JSON.parse(adjustment.calculationDetails)
        : null,
      extractedData: adjustment.extractedData
        ? JSON.parse(adjustment.extractedData)
        : null,
    };

    return NextResponse.json(successResponse(response));
  },
});

/**
 * DELETE /api/tasks/[id]/tax-adjustments/[adjustmentId]
 * Delete a specific tax adjustment
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const adjustmentId = parseAdjustmentId(params.adjustmentId);

    // IDOR protection: verify adjustment belongs to task
    await verifyAdjustmentBelongsToTask(adjustmentId, taskId);

    // Use transaction to delete documents and adjustment atomically
    await prisma.$transaction([
      // Delete associated documents first
      prisma.adjustmentDocument.deleteMany({
        where: { taxAdjustmentId: adjustmentId },
      }),
      // Delete the adjustment
      prisma.taxAdjustment.delete({
        where: { id: adjustmentId },
      }),
    ]);

    return NextResponse.json(
      successResponse({ message: 'Tax adjustment deleted successfully' })
    );
  },
});









