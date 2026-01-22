import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { sanitizeFilename } from '@/lib/utils/sanitization';

// Maximum documents to return per request
const MAX_DOCUMENTS = 500;

const CreateAdminDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(50),
  fileSize: z.number().int().positive(),
  filePath: z.string().min(1),
  category: z.string().max(100).optional(),
  description: z.string().optional(),
  version: z.number().int().positive().optional(),
}).strict();

/**
 * GET /api/tasks/[id]/administration-documents
 * List administration documents for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    const documents = await prisma.taskDocument.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        filePath: true,
        category: true,
        description: true,
        version: true,
        uploadedBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_DOCUMENTS,
    });

    return NextResponse.json(successResponse(documents), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  },
});

/**
 * POST /api/tasks/[id]/administration-documents
 * Create an administration document record for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: CreateAdminDocumentSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);

    const document = await prisma.taskDocument.create({
      data: {
        taskId,
        fileName: sanitizeFilename(data.fileName),
        fileType: data.fileType,
        fileSize: data.fileSize,
        filePath: data.filePath,
        category: data.category || 'General',
        description: data.description,
        version: data.version || 1,
        uploadedBy: user.id,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        filePath: true,
        category: true,
        description: true,
        version: true,
        uploadedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(document), { status: 201 });
  },
});

