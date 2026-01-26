import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const CreateResearchNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
}).strict();

/**
 * GET /api/tasks/[id]/research-notes
 * List research notes for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);
    const notes = await prisma.researchNote.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        title: true,
        content: true,
        tags: true,
        category: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' }, // Deterministic secondary sort
      ],
      take: 100,
    });

    return NextResponse.json(
      successResponse(notes),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },
});

/**
 * POST /api/tasks/[id]/research-notes
 * Create research note for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  schema: CreateResearchNoteSchema,
  handler: async (request: NextRequest, { user, params, data }) => {
    const taskId = toTaskId(params.id);
    const note = await prisma.researchNote.create({
      data: {
        taskId,
        title: data.title,
        content: data.content,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        category: data.category,
        createdBy: user.id,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        title: true,
        content: true,
        tags: true,
        category: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(note), { status: 201 });
  },
});

