import { NextResponse } from 'next/server';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { sanitizeText } from '@/lib/utils/sanitization';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';

const CreateFilingStatusSchema = z.object({
  filingType: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional(),
  deadline: z.string().datetime().optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/tasks/[id]/filing-status
 * Get filing statuses for a task
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(params.id);

    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    
    const filings = await prisma.filingStatus.findMany({
      where: { taskId },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
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
    const taskId = toTaskId(params.id);

    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const filing = await prisma.filingStatus.create({
      data: {
        taskId,
        filingType: sanitizeText(data.filingType, { maxLength: 100 }) || data.filingType,
        description: data.description ? sanitizeText(data.description, { allowNewlines: true }) : undefined,
        status: data.status || 'PENDING',
        deadline: data.deadline ? new Date(data.deadline) : null,
        referenceNumber: data.referenceNumber,
        notes: data.notes ? sanitizeText(data.notes, { allowNewlines: true }) : undefined,
        createdBy: user.id,
      },
    });

    return NextResponse.json(successResponse(filing), { status: 201 });
  },
});
