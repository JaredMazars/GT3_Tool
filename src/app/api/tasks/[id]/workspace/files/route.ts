import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { logger } from '@/lib/utils/logger';
import { uploadToOneDrive, getOfficeOnlineUrl, getOrCreateWorkspaceRoot, createFolder, deleteFromOneDrive } from '@/lib/services/workspace/graphService';

// Maximum files to return per request
const MAX_FILES = 500;

// Query param validation schema
const ListFilesQuerySchema = z.object({
  folderId: z.string().optional(),
});

/**
 * GET /api/tasks/[id]/workspace/files
 * List files in a task's workspace folder
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_WORKSPACE,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryResult = ListFilesQuerySchema.safeParse({
      folderId: searchParams.get('folderId') ?? undefined,
    });

    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR);
    }

    // Parse folderId if provided
    const folderId = queryResult.data.folderId
      ? parseNumericId(queryResult.data.folderId, 'Folder', false)
      : null;

    // Build where clause with proper typing
    const whereClause: Prisma.WorkspaceFileWhereInput = {
      WorkspaceFolder: {
        taskId,
        active: true,
      },
      ...(folderId ? { folderId } : {}),
    };

    // Fetch files with explicit select and limit
    const files = await prisma.workspaceFile.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        fileType: true,
        fileSize: true,
        webUrl: true,
        embedUrl: true,
        thumbnailUrl: true,
        uploadedBy: true,
        lastModifiedBy: true,
        lastModifiedAt: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        WorkspaceFolder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_FILES,
    });

    logger.info('Listed task workspace files', {
      userId: user.id,
      taskId,
      folderId,
      count: files.length,
    });

    return NextResponse.json(successResponse(files), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  },
});

/**
 * POST /api/tasks/[id]/workspace/files
 * Upload a file to a task's workspace folder
 */
export const POST = secureRoute.fileUploadWithParams({
  feature: Feature.MANAGE_WORKSPACE_FILES,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      logger.error('Failed to parse form data', { error: formError, taskId });
      throw new AppError(400, 'Failed to parse form data. Please ensure the request is multipart/form-data.', ErrorCodes.VALIDATION_ERROR);
    }

    const file = formData.get('file') as File | null;
    const folderIdStr = formData.get('folderId') as string | null;
    const description = formData.get('description') as string | null;

    if (!file || !(file instanceof File)) {
      logger.warn('No file provided in upload request', { taskId, hasFile: !!file });
      throw new AppError(400, 'No file provided', ErrorCodes.VALIDATION_ERROR);
    }

    if (!folderIdStr || typeof folderIdStr !== 'string') {
      logger.warn('No folder ID provided in upload request', { taskId, folderIdStr });
      throw new AppError(400, 'Folder ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    const folderId = parseNumericId(folderIdStr, 'Folder');

    // Verify folder exists and belongs to this task
    const folder = await prisma.workspaceFolder.findFirst({
      where: {
        id: folderId,
        taskId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        driveId: true,
        itemId: true,
      },
    });

    if (!folder) {
      throw new AppError(404, 'Folder not found or does not belong to this task', ErrorCodes.NOT_FOUND);
    }

    // Ensure folder exists in OneDrive/SharePoint
    let driveId = folder.driveId;
    let itemId = folder.itemId;

    if (!driveId || !itemId) {
      try {
        // Get or create workspace root
        const workspaceRoot = await getOrCreateWorkspaceRoot();
        driveId = workspaceRoot.driveId;

        // Create the folder in OneDrive
        const oneDriveFolder = await createFolder(
          workspaceRoot.driveId,
          workspaceRoot.itemId,
          folder.name
        );

        itemId = oneDriveFolder.itemId;

        // Update folder record with OneDrive IDs
        await prisma.workspaceFolder.update({
          where: { id: folderId },
          data: {
            driveId: oneDriveFolder.driveId,
            itemId: oneDriveFolder.itemId,
            sharepointUrl: oneDriveFolder.webUrl,
          },
        });

        logger.info('Created folder in OneDrive', {
          folderId,
          driveId: oneDriveFolder.driveId,
          itemId: oneDriveFolder.itemId,
        });
      } catch (graphError: unknown) {
        // Extract error details for better logging
        const errorMessage = graphError instanceof Error ? graphError.message : 'Failed to initialize folder in cloud storage';
        const statusCode = (graphError as { statusCode?: number; code?: number })?.statusCode || (graphError as { code?: number })?.code || 500;
        
        logger.error('Failed to create folder in OneDrive during file upload', {
          folderId,
          folderName: folder.name,
          errorMessage,
          statusCode,
        });

        const isAuthError = statusCode === 401 || statusCode === 403;
        const userMessage = isAuthError
          ? 'Cloud storage authentication failed. Please contact your administrator.'
          : 'Failed to initialize folder in cloud storage. Please try again.';
        
        throw new AppError(isAuthError ? 401 : 500, userMessage, ErrorCodes.EXTERNAL_API_ERROR);
      }
    }

    // Upload file to OneDrive/SharePoint
    let fileBuffer: ArrayBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
    } catch (bufferError) {
      logger.error('Failed to read file buffer', {
        taskId,
        folderId,
        fileName: file.name,
        fileSize: file.size,
        error: bufferError,
      });
      throw new AppError(400, 'Failed to read file data', ErrorCodes.VALIDATION_ERROR);
    }

    const fileType = file.name.split('.').pop() || '';
    
    let uploadResult;
    try {
      uploadResult = await uploadToOneDrive(
        Buffer.from(fileBuffer),
        file.name,
        driveId!,
        itemId!
      );
    } catch (uploadError: unknown) {
      logger.error('Failed to upload file to OneDrive', {
        taskId,
        folderId,
        fileName: file.name,
        fileSize: file.size,
        driveId,
        itemId,
        error: uploadError instanceof Error ? uploadError.message : uploadError,
      });
      throw new AppError(500, 'Failed to upload file to cloud storage', ErrorCodes.EXTERNAL_API_ERROR);
    }

    // Get Office Online URL for embedding (optional, may fail for non-Office files)
    let embedUrl: string | null = null;
    try {
      embedUrl = await getOfficeOnlineUrl(uploadResult.driveId, uploadResult.itemId);
    } catch (embedError) {
      // Non-critical - some file types don't support Office Online
      logger.warn('Could not get Office Online URL', {
        fileName: file.name,
        fileType,
        error: embedError,
      });
    }

    // Create file record in database
    let workspaceFile;
    try {
      workspaceFile = await prisma.workspaceFile.create({
        data: {
          folderId,
          name: file.name,
          description,
          fileType,
          fileSize: BigInt(file.size),
          driveId: uploadResult.driveId,
          itemId: uploadResult.itemId,
          webUrl: uploadResult.webUrl,
          embedUrl,
          uploadedBy: user.id,
          lastModifiedBy: user.id,
          lastModifiedAt: new Date(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          description: true,
          fileType: true,
          fileSize: true,
          webUrl: true,
          embedUrl: true,
          uploadedBy: true,
          createdAt: true,
        },
      });
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Database error';
      logger.error('Failed to create file record in database', {
        taskId,
        folderId,
        fileName: file.name,
        fileSize: file.size,
        driveId: uploadResult.driveId,
        itemId: uploadResult.itemId,
        error: errorMessage,
      });
      
      // Attempt to clean up uploaded file from OneDrive if database insert fails
      try {
        if (uploadResult.driveId && uploadResult.itemId) {
          await deleteFromOneDrive(uploadResult.driveId, uploadResult.itemId);
          logger.info('Cleaned up uploaded file from OneDrive after database error', {
            driveId: uploadResult.driveId,
            itemId: uploadResult.itemId,
          });
        }
      } catch (cleanupError) {
        logger.error('Failed to clean up uploaded file from OneDrive', {
          driveId: uploadResult.driveId,
          itemId: uploadResult.itemId,
          error: cleanupError,
        });
      }

      throw new AppError(500, 'Failed to save file record', ErrorCodes.DATABASE_ERROR);
    }

    logger.info('Uploaded file to task workspace', {
      userId: user.id,
      taskId,
      folderId,
      fileId: workspaceFile.id,
      fileName: file.name,
      fileSize: file.size,
    });

    return NextResponse.json(successResponse(workspaceFile), { status: 201 });
  },
});

