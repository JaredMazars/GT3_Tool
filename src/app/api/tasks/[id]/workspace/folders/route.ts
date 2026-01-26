import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Maximum folders to return per request
const MAX_FOLDERS = 500;

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  parentFolderId: z.number().int().positive().optional(),
}).strict();

/**
 * GET /api/tasks/[id]/workspace/folders
 * List all workspace folders for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_WORKSPACE,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    // Get folders for this task with explicit select and limit
    const folders = await prisma.workspaceFolder.findMany({
      where: {
        taskId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        parentFolderId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            WorkspaceFile: true,
            other_WorkspaceFolder: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      take: MAX_FOLDERS,
    });

    logger.info('Listed task workspace folders', {
      userId: user.id,
      taskId,
      count: folders.length,
    });

    return NextResponse.json(successResponse(folders), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  },
});

/**
 * POST /api/tasks/[id]/workspace/folders
 * Create a new workspace folder for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_WORKSPACE_FOLDERS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: createFolderSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);

    // Verify task exists and get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        id: true, 
        TaskCode: true,
        ServLineCode: true,
        SLGroup: true,
      },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Validate task has required service line fields
    if (!task.ServLineCode || !task.SLGroup) {
      logger.warn('Task missing required service line fields', {
        userId: user.id,
        taskId,
        hasServLineCode: !!task.ServLineCode,
        hasSLGroup: !!task.SLGroup,
        taskCode: task.TaskCode,
      });
      throw new AppError(
        400,
        'Task is missing required service line information',
        ErrorCodes.VALIDATION_ERROR,
        { missingFields: [!task.ServLineCode && 'ServLineCode', !task.SLGroup && 'SLGroup'].filter(Boolean) }
      );
    }

    // If parent folder specified, verify it exists and belongs to this task (IDOR protection)
    if (data.parentFolderId) {
      const parentFolderId = parseNumericId(String(data.parentFolderId), 'Parent folder');
      const parentFolder = await prisma.workspaceFolder.findFirst({
        where: {
          id: parentFolderId,
          taskId,
          active: true,
        },
        select: { id: true },
      });

      if (!parentFolder) {
        throw new AppError(404, 'Parent folder not found or does not belong to this task', ErrorCodes.NOT_FOUND);
      }
    }

    logger.info('Creating workspace folder', {
      userId: user.id,
      taskId,
      taskCode: task.TaskCode,
      folderName: data.name,
      serviceLine: task.ServLineCode,
      subServiceLineGroup: task.SLGroup,
      parentFolderId: data.parentFolderId,
    });

    // Create folder in database with explicit field mapping
    const folder = await prisma.workspaceFolder.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        taskId,
        serviceLine: task.ServLineCode,
        subServiceLineGroup: task.SLGroup,
        parentFolderId: data.parentFolderId || null,
        createdBy: user.id,
        active: true,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        parentFolderId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Created task workspace folder', {
      userId: user.id,
      taskId,
      folderId: folder.id,
      folderName: folder.name,
    });

    return NextResponse.json(successResponse(folder), { status: 201 });
  },
});

