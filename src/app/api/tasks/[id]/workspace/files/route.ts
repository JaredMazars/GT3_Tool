import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import { uploadToOneDrive, getOfficeOnlineUrl, getOrCreateWorkspaceRoot, createFolder, deleteFromOneDrive } from '@/lib/services/workspace/graphService';

/**
 * GET /api/tasks/[id]/workspace/files
 * List files in a task's workspace folder
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

    // 5. Get folderId from query params (optional)
    const { searchParams } = new URL(request.url);
    const folderIdParam = searchParams.get('folderId');
    const folderId = folderIdParam ? parseInt(folderIdParam, 10) : null;

    // 6. Build where clause
    const whereClause: any = {
      Folder: {
        taskId,
        active: true,
      },
    };

    // Filter by specific folder if provided
    if (folderId) {
      whereClause.folderId = folderId;
    }

    // 7. Fetch files
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
        Folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.info('Listed task workspace files', {
      userId: user.id,
      taskId,
      folderId,
      count: files.length,
    });

    return NextResponse.json(successResponse(files));
  } catch (error) {
    return handleApiError(error, 'Failed to list files');
  }
}

/**
 * POST /api/tasks/[id]/workspace/files
 * Upload a file to a task's workspace folder
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let taskId: number | null = null;
  try {
    // Parse params first for better error logging
    const params = await context.params;
    taskId = parseInt(params.id, 10);
    
    if (isNaN(taskId)) {
      logger.warn('Invalid task ID in file upload request', { taskIdString: params.id });
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_WORKSPACE_FILES);
    if (!hasAccess) {
      logger.warn('User denied access to workspace file upload', { userId: user.id, taskId });
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 3. Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        id: true, 
        TaskCode: true,
        TaskDesc: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 5. Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      logger.error('Failed to parse form data', { error: formError, taskId });
      return NextResponse.json(
        { error: 'Failed to parse form data. Please ensure the request is multipart/form-data.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const folderIdStr = formData.get('folderId') as string | null;
    const description = formData.get('description') as string | null;

    if (!file || !(file instanceof File)) {
      logger.warn('No file provided in upload request', { taskId, hasFile: !!file });
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!folderIdStr || typeof folderIdStr !== 'string') {
      logger.warn('No folder ID provided in upload request', { taskId, folderIdStr });
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    const folderId = parseInt(folderIdStr, 10);
    if (isNaN(folderId)) {
      logger.warn('Invalid folder ID format', { taskId, folderIdStr });
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
    }

    // 6. Verify folder exists and belongs to this task
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
      return NextResponse.json(
        { error: 'Folder not found or does not belong to this task' },
        { status: 404 }
      );
    }

    // 7. Ensure folder exists in OneDrive/SharePoint
    // If folder doesn't have driveId/itemId, create it in OneDrive first
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
      } catch (graphError: any) {
        // Extract error details for better logging
        const errorMessage = graphError?.message || 'Failed to initialize folder in cloud storage';
        const statusCode = graphError?.statusCode || graphError?.code || 500;
        
        // Extract all error details
        const errorDetails: Record<string, unknown> = {};
        if (graphError?.code) errorDetails.code = graphError.code;
        if (graphError?.statusCode) errorDetails.statusCode = graphError.statusCode;
        if (graphError?.requestId) errorDetails.requestId = graphError.requestId;
        if (graphError?.body) {
          try {
            errorDetails.body = typeof graphError.body === 'string' 
              ? JSON.parse(graphError.body) 
              : graphError.body;
          } catch {
            errorDetails.body = graphError.body;
          }
        }
        if (graphError?.stack) errorDetails.stack = graphError.stack;
        
        // Try to get inner error if present
        if (graphError?.body?.innerError) {
          errorDetails.innerError = graphError.body.innerError;
        }
        
        logger.error('Failed to create folder in OneDrive during file upload', {
          folderId,
          folderName: folder.name,
          errorMessage,
          statusCode,
          errorDetails: Object.keys(errorDetails).length > 0 ? errorDetails : {
            errorType: typeof graphError,
            errorString: String(graphError),
          },
        });

        // Return appropriate error response
        const isAuthError = statusCode === 401 || statusCode === 403;
        
        // Provide helpful error message based on error type
        let userMessage: string;
        if (isAuthError) {
          userMessage = 'Cloud storage authentication failed. This usually means: ' +
            '1) Azure AD app permissions are not configured, ' +
            '2) Admin consent is required, or ' +
            '3) Credentials are invalid. Please contact your administrator.';
        } else {
          userMessage = 'Failed to initialize folder in cloud storage. Please try again.';
        }
        
        return NextResponse.json(
          { 
            error: userMessage,
            details: process.env.NODE_ENV === 'development' 
              ? { 
                  message: errorMessage,
                  code: graphError?.code,
                  statusCode,
                  requestId: graphError?.requestId,
                  hint: isAuthError 
                    ? 'Ensure the Azure AD app has Sites.ReadWrite.All or Files.ReadWrite.All permissions with admin consent'
                    : undefined,
                }
              : undefined,
          },
          { status: isAuthError ? 401 : 500 }
        );
      }
    }

    // 8. Upload file to OneDrive/SharePoint
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
      return NextResponse.json(
        { error: 'Failed to read file data' },
        { status: 400 }
      );
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
    } catch (uploadError: any) {
      logger.error('Failed to upload file to OneDrive', {
        taskId,
        folderId,
        fileName: file.name,
        fileSize: file.size,
        driveId,
        itemId,
        error: uploadError?.message || uploadError,
        stack: uploadError?.stack,
      });
      return NextResponse.json(
        {
          error: 'Failed to upload file to cloud storage',
          details: process.env.NODE_ENV === 'development' ? uploadError?.message : undefined,
        },
        { status: 500 }
      );
    }

    // 9. Get Office Online URL for embedding (optional, may fail for non-Office files)
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

    // 10. Create file record in database
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
    } catch (dbError: any) {
      logger.error('Failed to create file record in database', {
        taskId,
        folderId,
        fileName: file.name,
        fileSize: file.size,
        driveId: uploadResult.driveId,
        itemId: uploadResult.itemId,
        error: dbError?.message || dbError,
        code: dbError?.code,
        meta: dbError?.meta,
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

      return NextResponse.json(
        {
          error: 'Failed to save file record. The file was uploaded but could not be saved to the database.',
          details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined,
        },
        { status: 500 }
      );
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
  } catch (error) {
    // Enhanced error logging
    const errorDetails: Record<string, unknown> = {
      taskId: taskId || 'unknown',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof Error) {
      errorDetails.stack = error.stack;
      if ('code' in error) errorDetails.code = (error as any).code;
      if ('statusCode' in error) errorDetails.statusCode = (error as any).statusCode;
    }

    // Log the full error details
    logger.error('Unexpected error in file upload', errorDetails);

    // Return detailed error in development, generic in production
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'An unexpected error occurred')
          : 'Failed to upload file. Please try again or contact support if the issue persists.',
        code: 'FILE_UPLOAD_ERROR',
        ...(process.env.NODE_ENV === 'development' ? { 
          details: errorDetails,
          stack: error instanceof Error ? error.stack : undefined,
        } : {}),
      },
      { status: 500 }
    );
  }
}

