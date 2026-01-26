/**
 * Opinion Drafts API Routes
 * GET /api/tasks/[id]/opinion-drafts - List opinion drafts for a task
 * POST /api/tasks/[id]/opinion-drafts - Create new opinion draft
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateOpinionDraftSchema } from '@/lib/validation/schemas';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/tasks/[id]/opinion-drafts
 * List all opinion drafts for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id', // Automatic task access check with VIEWER role
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    const drafts = await prisma.opinionDraft.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        title: true,
        content: true,
        status: true,
        version: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
      take: 100,
    });

    logger.info('Listed opinion drafts', {
      userId: user.id,
      taskId,
      count: drafts.length,
    });

    return NextResponse.json(successResponse(drafts), {
      headers: { 'Cache-Control': 'no-store' },
    });
  },
});

/**
 * POST /api/tasks/[id]/opinion-drafts
 * Create a new opinion draft for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id', // Automatic task access check
  schema: CreateOpinionDraftSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);

    const draft = await prisma.opinionDraft.create({
      data: {
        taskId,
        title: data.title,
        content: data.content || '',
        status: data.status || 'DRAFT',
        createdBy: user.id,
        version: 1,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        title: true,
        content: true,
        status: true,
        version: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Created opinion draft', {
      userId: user.id,
      taskId,
      draftId: draft.id,
      title: data.title,
    });

    return NextResponse.json(successResponse(draft), { status: 201 });
  },
});
