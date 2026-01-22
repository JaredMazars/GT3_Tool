import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const CreateSarsResponseSchema = z.object({
  referenceNumber: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  content: z.string().min(1),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'OBJECTION_FILED']).optional(),
  responseType: z.string().max(100).optional(),
  deadline: z.string().datetime().optional(),
}).strict();

/**
 * GET /api/tasks/[id]/sars-responses
 * List SARS responses for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);
    const responses = await prisma.sarsResponse.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        referenceNumber: true,
        subject: true,
        content: true,
        status: true,
        responseType: true,
        deadline: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }, // Deterministic secondary sort
      ],
      take: 100,
    });

    return NextResponse.json(
      successResponse(responses),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },
});

/**
 * POST /api/tasks/[id]/sars-responses
 * Create a SARS response for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  schema: CreateSarsResponseSchema,
  handler: async (request: NextRequest, { user, params, data }) => {
    const taskId = toTaskId(params.id);
    const response = await prisma.sarsResponse.create({
      data: {
        taskId,
        referenceNumber: data.referenceNumber,
        subject: data.subject,
        content: data.content,
        status: data.status ?? 'PENDING',
        responseType: data.responseType ?? 'General',
        deadline: data.deadline ? new Date(data.deadline) : null,
        createdBy: user.id,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        referenceNumber: true,
        subject: true,
        content: true,
        status: true,
        responseType: true,
        deadline: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(response), { status: 201 });
  },
});

