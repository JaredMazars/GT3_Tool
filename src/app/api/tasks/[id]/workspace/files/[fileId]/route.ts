import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { logger } from '@/lib/utils/logger';
import { downloadFromOneDrive, deleteFromOneDrive } from '@/lib/services/workspace/graphService';

/**
 * GET /api/tasks/[id]/workspace/files/[fileId]
 * Download a file from a task's workspace
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_WORKSPACE,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const fileId = parseNumericId(params.fileId, 'File');

    // Verify file exists and belongs to this task (IDOR protection)
    const file = await prisma.workspaceFile.findFirst({
      where: {
        id: fileId,
        WorkspaceFolder: {
          taskId,
          active: true,
        },
      },
      select: {
        id: true,
        name: true,
        driveId: true,
        itemId: true,
        fileType: true,
      },
    });

    if (!file) {
      throw new AppError(404, 'File not found or does not belong to this task', ErrorCodes.NOT_FOUND);
    }

    // Download file from OneDrive/SharePoint
    if (!file.driveId || !file.itemId) {
      throw new AppError(404, 'File is not available in cloud storage', ErrorCodes.NOT_FOUND);
    }

    try {
      const fileBuffer = await downloadFromOneDrive(file.driveId, file.itemId);

      logger.info('Downloaded file from task workspace', {
        userId: user.id,
        taskId,
        fileId,
        fileName: file.name,
      });

      // Return file with proper headers including security headers
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      });
    } catch (downloadError) {
      logger.error('Failed to download file from OneDrive', {
        fileId,
        driveId: file.driveId,
        itemId: file.itemId,
        error: downloadError,
      });
      throw new AppError(500, 'Failed to download file from cloud storage', ErrorCodes.EXTERNAL_API_ERROR);
    }
  },
});

/**
 * DELETE /api/tasks/[id]/workspace/files/[fileId]
 * Delete a file from a task's workspace
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.DELETE_WORKSPACE_FILES,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const fileId = parseNumericId(params.fileId, 'File');

    // Verify file exists and belongs to this task (IDOR protection)
    const file = await prisma.workspaceFile.findFirst({
      where: {
        id: fileId,
        WorkspaceFolder: {
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
      throw new AppError(404, 'File not found or does not belong to this task', ErrorCodes.NOT_FOUND);
    }

    // Delete file from OneDrive/SharePoint if it has driveId/itemId
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

    // Delete file record from database
    await prisma.workspaceFile.delete({
      where: { id: fileId },
    });

    logger.info('Deleted file from task workspace', {
      userId: user.id,
      taskId,
      fileId,
      fileName: file.name,
    });

    return NextResponse.json(successResponse({ id: fileId }));
  },
});


