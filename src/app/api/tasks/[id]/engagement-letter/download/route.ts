import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { downloadEngagementLetter } from '@/lib/services/documents/blobStorage';

/**
 * GET /api/tasks/[id]/engagement-letter/download
 * Download the uploaded engagement letter
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const taskId = toTaskId(id);

    // Check if user has access to the project
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const engagementLetter = task.TaskEngagementLetter;
    if (!engagementLetter?.uploaded || !engagementLetter?.filePath) {
      return NextResponse.json(
        { error: 'No engagement letter has been uploaded for this task' },
        { status: 404 }
      );
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

    // Get filename
    const filename = engagementLetter.filePath.split('/').pop() || 'engagement-letter';

    // Return file with proper headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[id]/engagement-letter/download');
  }
}

