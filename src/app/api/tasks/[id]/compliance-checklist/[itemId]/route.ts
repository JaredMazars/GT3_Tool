import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { parseTaskId, parseNumericId, successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Schema for updating a checklist item
const UpdateChecklistItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE']).optional(),
  assignedTo: z.string().max(100).optional().nullable(),
}).strict();

// Select fields for checklist items
const checklistItemSelect = {
  id: true,
  taskId: true,
  title: true,
  description: true,
  dueDate: true,
  priority: true,
  status: true,
  assignedTo: true,
  completedAt: true,
  completedBy: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Helper to verify checklist item belongs to task (IDOR protection)
 */
async function verifyChecklistItemBelongsToTask(
  itemId: number,
  taskId: number
): Promise<void> {
  const item = await prisma.complianceChecklist.findUnique({
    where: { id: itemId },
    select: { taskId: true },
  });

  if (!item) {
    throw new AppError(
      404,
      'Checklist item not found',
      ErrorCodes.NOT_FOUND,
      { itemId }
    );
  }

  if (item.taskId !== taskId) {
    throw new AppError(
      403,
      'Checklist item does not belong to this task',
      ErrorCodes.FORBIDDEN,
      { itemId, taskId }
    );
  }
}

/**
 * GET /api/tasks/[id]/compliance-checklist/[itemId]
 * Get a specific checklist item
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const itemId = parseNumericId(params.itemId, 'Checklist Item');

    // IDOR protection
    await verifyChecklistItemBelongsToTask(itemId, taskId);

    const item = await prisma.complianceChecklist.findUnique({
      where: { id: itemId },
      select: checklistItemSelect,
    });

    if (!item) {
      throw new AppError(
        404,
        'Checklist item not found',
        ErrorCodes.NOT_FOUND,
        { itemId }
      );
    }

    return NextResponse.json(successResponse(item));
  },
});

/**
 * PUT /api/tasks/[id]/compliance-checklist/[itemId]
 * Update a checklist item
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: UpdateChecklistItemSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);
    const itemId = parseNumericId(params.itemId, 'Checklist Item');

    // IDOR protection
    await verifyChecklistItemBelongsToTask(itemId, taskId);

    // Build update data with explicit field mapping
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

    // Handle status changes
    if (data.status !== undefined) {
      updateData.status = data.status;

      // Set completion fields when status is COMPLETED
      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedBy = user.id;
      } else {
        // Clear completion fields when status changes from COMPLETED
        updateData.completedAt = null;
        updateData.completedBy = null;
      }
    }

    const item = await prisma.complianceChecklist.update({
      where: { id: itemId },
      data: updateData,
      select: checklistItemSelect,
    });

    return NextResponse.json(successResponse(item));
  },
});

/**
 * DELETE /api/tasks/[id]/compliance-checklist/[itemId]
 * Delete a checklist item
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const itemId = parseNumericId(params.itemId, 'Checklist Item');

    // IDOR protection
    await verifyChecklistItemBelongsToTask(itemId, taskId);

    await prisma.complianceChecklist.delete({
      where: { id: itemId },
    });    return NextResponse.json(
      successResponse({ message: 'Checklist item deleted successfully' })
    );
  },
});
