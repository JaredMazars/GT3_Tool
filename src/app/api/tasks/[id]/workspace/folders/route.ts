import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  parentFolderId: z.number().int().positive().optional(),
});

/**
 * GET /api/tasks/[id]/workspace/folders
 * List all workspace folders for a task
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.ACCESS_WORKSPACE);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 3. Parse task ID
    const params = await context.params;
    const taskId = parseInt(params.id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // 4. Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 5. Get folders for this task
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
            Files: true,
            ChildFolders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    logger.info('Listed task workspace folders', {
      userId: user.id,
      taskId,
      count: folders.length,
    });

    return NextResponse.json(successResponse(folders));
  } catch (error) {
    return handleApiError(error, 'Failed to list folders');
  }
}

/**
 * POST /api/tasks/[id]/workspace/folders
 * Create a new workspace folder for a task
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_WORKSPACE_FOLDERS);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 3. Parse task ID
    const params = await context.params;
    const taskId = parseInt(params.id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // 4. Parse and validate request body
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);
    const validationResult = createFolderSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 5. Verify task exists and get task details
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
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 5.5. Validate task has required service line fields
    if (!task.ServLineCode || !task.SLGroup) {
      logger.warn('Task missing required service line fields', {
        userId: user.id,
        taskId,
        hasServLineCode: !!task.ServLineCode,
        hasSLGroup: !!task.SLGroup,
        taskCode: task.TaskCode,
      });
      return NextResponse.json(
        { 
          error: 'Task is missing required service line information. Please ensure the task has a service line code and service line group assigned.',
          details: {
            missingFields: [
              !task.ServLineCode && 'ServLineCode',
              !task.SLGroup && 'SLGroup',
            ].filter(Boolean),
          },
        },
        { status: 400 }
      );
    }

    // 6. If parent folder specified, verify it exists and belongs to this task
    if (data.parentFolderId) {
      const parentFolder = await prisma.workspaceFolder.findFirst({
        where: {
          id: data.parentFolderId,
          taskId,
          active: true,
        },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found or does not belong to this task' },
          { status: 404 }
        );
      }
    }

    // 7. Prepare folder data and log before creation
    // Ensure createdBy is a valid string (required field)
    if (!user.id || typeof user.id !== 'string') {
      logger.error('Invalid user ID for folder creation', {
        userId: user.id,
        taskId,
        userType: typeof user.id,
      });
      return NextResponse.json(
        { error: 'Invalid user authentication' },
        { status: 401 }
      );
    }

    const folderData = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      taskId,
      serviceLine: task.ServLineCode,
      subServiceLineGroup: task.SLGroup,
      parentFolderId: data.parentFolderId || null,
      createdBy: user.id,
      active: true,
    };

    logger.info('Creating workspace folder', {
      userId: user.id,
      taskId,
      taskCode: task.TaskCode,
      folderName: folderData.name,
      serviceLine: folderData.serviceLine,
      subServiceLineGroup: folderData.subServiceLineGroup,
      parentFolderId: folderData.parentFolderId,
    });

    // 8. Create folder in database
    try {
      const folder = await prisma.workspaceFolder.create({
        data: folderData,
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
    } catch (dbError) {
      // Log detailed error information before rethrowing
      logger.error('Database error creating workspace folder', {
        userId: user.id,
        taskId,
        folderName: folderData.name,
        folderData: {
          ...folderData,
          createdBy: folderData.createdBy?.substring(0, 50), // Truncate for logging
        },
        error: dbError instanceof Error ? {
          name: dbError.name,
          message: dbError.message,
          stack: dbError.stack,
        } : dbError,
      });
      throw dbError;
    }
  } catch (error) {
    return handleApiError(error, 'Failed to create folder');
  }
}

