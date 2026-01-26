import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const CreateLegalPrecedentSchema = z.object({
  caseName: z.string().min(1).max(500),
  citation: z.string().min(1).max(200),
  court: z.string().max(200).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  summary: z.string().min(1), // Required in Prisma schema
  relevance: z.string().optional(),
  link: z.string().url().optional(),
}).strict();

/**
 * GET /api/tasks/[id]/legal-precedents
 * List legal precedents for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);
    const precedents = await prisma.legalPrecedent.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        caseName: true,
        citation: true,
        court: true,
        year: true,
        summary: true,
        relevance: true,
        link: true,
        createdBy: true,
        createdAt: true,
      },
      orderBy: [
        { year: 'desc' },
        { id: 'desc' }, // Deterministic secondary sort
      ],
      take: 100,
    });

    return NextResponse.json(successResponse(precedents));
  },
});

/**
 * POST /api/tasks/[id]/legal-precedents
 * Create a legal precedent for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  schema: CreateLegalPrecedentSchema,
  handler: async (request: NextRequest, { user, params, data }) => {
    const taskId = toTaskId(params.id);
    const precedent = await prisma.legalPrecedent.create({
      data: {
        taskId,
        caseName: data.caseName,
        citation: data.citation,
        court: data.court,
        year: data.year,
        summary: data.summary, // Required field
        relevance: data.relevance,
        link: data.link,
        createdBy: user.id,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        caseName: true,
        citation: true,
        court: true,
        year: true,
        summary: true,
        relevance: true,
        link: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json(successResponse(precedent), { status: 201 });
  },
});

