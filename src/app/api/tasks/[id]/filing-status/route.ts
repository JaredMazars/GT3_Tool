import { NextResponse } from 'next/server';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { prisma } from '@/lib/db/prisma';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

const CreateFilingStatusSchema = z.object({
  filingType: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional(),
  deadline: z.string().datetime().optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

/**
 * GET /api/tasks/[id]/filing-status
 * Get filing statuses for a task
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params?.id));

    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }
    
    const filings = await prisma.filingStatus.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        filingType: true,
        description: true,
        status: true,
        deadline: true,
        referenceNumber: true,
        notes: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { id: 'asc' }],
      take: 100,
    });

    return NextResponse.json(successResponse(filings));
  },
});

/**
 * POST /api/tasks/[id]/filing-status
 * Create a new filing status
 */
export const POST = secureRoute.mutationWithParams({
  schema: CreateFilingStatusSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = toTaskId(parseTaskId(params?.id));

    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden - EDITOR role required', ErrorCodes.FORBIDDEN);
    }

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    const filing = await prisma.filingStatus.create({
      data: {
        taskId,
        filingType: data.filingType,
        description: data.description,
        status: data.status || 'PENDING',
        deadline: data.deadline ? new Date(data.deadline) : null,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        createdBy: user.id,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        filingType: true,
        description: true,
        status: true,
        deadline: true,
        referenceNumber: true,
        notes: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(filing), { status: 201 });
  },
});
