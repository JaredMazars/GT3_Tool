import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';

// Schema for creating a checklist item
const CreateChecklistItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE']).optional().default('PENDING'),
  assignedTo: z.string().max(100).optional(),
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
 * GET /api/tasks/[id]/compliance-checklist
 * Get compliance checklist items for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);

    const items = await prisma.complianceChecklist.findMany({
      where: { taskId },
      select: checklistItemSelect,
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { id: 'asc' }, // Secondary sort for deterministic ordering
      ],
      take: 500, // Limit results
    });

    return NextResponse.json(successResponse(items));
  },
});

/**
 * POST /api/tasks/[id]/compliance-checklist
 * Create a new compliance checklist item
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: CreateChecklistItemSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);

    const item = await prisma.complianceChecklist.create({
      data: {
        taskId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority,
        status: data.status,
        assignedTo: data.assignedTo,
        createdBy: user.id,
        updatedAt: new Date(),
      },
      select: checklistItemSelect,
    });

    return NextResponse.json(successResponse(item), { status: 201 });
  },
});
