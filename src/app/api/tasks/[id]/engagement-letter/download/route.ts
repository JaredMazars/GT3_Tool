import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { downloadEngagementLetter } from '@/lib/services/documents/blobStorage';

/**
 * GET /api/tasks/[id]/engagement-letter/download
 * Download the uploaded engagement letter
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);

    // Get task and engagement letter path
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskDesc: true,
        TaskEngagementLetter: {
          select: {
            uploaded: true,
            filePath: true,
          },
        },
      },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    const engagementLetter = task.TaskEngagementLetter;
    if (!engagementLetter?.uploaded || !engagementLetter?.filePath) {
      throw new AppError(
        404,
        'No engagement letter has been uploaded for this task',
        ErrorCodes.NOT_FOUND
      );
    }

    // Validate file path to prevent path traversal
    if (engagementLetter.filePath.includes('..') || engagementLetter.filePath.includes('~')) {
      throw new AppError(400, 'Invalid file path', ErrorCodes.VALIDATION_ERROR);
    }

    // Download from blob storage
    const fileBuffer = await downloadEngagementLetter(engagementLetter.filePath);

    // Determine content type based on file extension
    const ext = engagementLetter.filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'pdf') {
      contentType = 'application/pdf';
    } else if (ext === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Sanitize filename - only take the last part and remove any path components
    const rawFilename = engagementLetter.filePath.split('/').pop() || 'engagement-letter';
    const filename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename

    // Return file with proper security headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  },
});

