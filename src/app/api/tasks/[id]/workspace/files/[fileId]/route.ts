import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import { downloadFromOneDrive, deleteFromOneDrive } from '@/lib/services/workspace/graphService';

/**
 * GET /api/tasks/[id]/workspace/files/[fileId]/download
 * Download a file from a task's workspace
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
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

    // 3. Parse task ID and file ID
    const params = await context.params;
    const taskId = parseInt(params.id, 10);
    const fileId = parseInt(params.fileId, 10);

    if (isNaN(taskId) || isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid task ID or file ID' }, { status: 400 });
    }

    // 4. Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 5. Verify file exists and belongs to this task
    const file = await prisma.workspaceFile.findFirst({
      where: {
        id: fileId,
        Folder: {
          taskId,
          active: true,
        },
      },
      select: {
        id: true,
        name: true,
        driveId: true,
        itemId: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or does not belong to this task' },
        { status: 404 }
      );
    }

    // 6. Download file from OneDrive/SharePoint
    if (!file.driveId || !file.itemId) {
      return NextResponse.json(
        { error: 'File is not available in cloud storage' },
        { status: 404 }
      );
    }

    try {
      const fileBuffer = await downloadFromOneDrive(file.driveId, file.itemId);

      logger.info('Downloaded file from task workspace', {
        userId: user.id,
        taskId,
        fileId,
        fileName: file.name,
      });

      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        },
      });
    } catch (downloadError) {
      logger.error('Failed to download file from OneDrive', {
        fileId,
        driveId: file.driveId,
        itemId: file.itemId,
        error: downloadError,
      });
      return NextResponse.json(
        { error: 'Failed to download file from cloud storage' },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleApiError(error, 'Failed to download file');
  }
}

/**
 * DELETE /api/tasks/[id]/workspace/files/[fileId]
 * Delete a file from a task's workspace
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.DELETE_WORKSPACE_FILES);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 3. Parse task ID and file ID
    const params = await context.params;
    const taskId = parseInt(params.id, 10);
    const fileId = parseInt(params.fileId, 10);

    if (isNaN(taskId) || isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid task ID or file ID' }, { status: 400 });
    }

    // 4. Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 5. Verify file exists and belongs to this task
    const file = await prisma.workspaceFile.findFirst({
      where: {
        id: fileId,
        Folder: {
          taskId,
          active: true,
        },
      },
      select: {
        id: true,
        name: true,
        driveId: true,
        itemId: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or does not belong to this task' },
        { status: 404 }
      );
    }

    // 6. Delete file from OneDrive/SharePoint if it has driveId/itemId
    if (file.driveId && file.itemId) {
      try {
        await deleteFromOneDrive(file.driveId, file.itemId);
      } catch (graphError) {
        // Log error but continue with database deletion
        logger.warn('Failed to delete file from OneDrive, continuing with database deletion', {
          fileId,
          driveId: file.driveId,
          itemId: file.itemId,
          error: graphError,
        });
      }
    }

    // 7. Delete file record from database
    await prisma.workspaceFile.delete({
      where: { id: fileId },
    });

    logger.info('Deleted file from task workspace', {
      userId: user.id,
      taskId,
      fileId,
      fileName: file.name,
    });

    return NextResponse.json(successResponse({ id: fileId }), { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Failed to delete file');
  }
}

