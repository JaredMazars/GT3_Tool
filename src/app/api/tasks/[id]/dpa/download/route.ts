import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { downloadDpa } from '@/lib/services/documents/blobStorage';

/**
 * GET /api/tasks/[id]/dpa/download
 * Download the uploaded Data Processing Agreement (DPA)
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

    // Get task and DPA path
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskDesc: true,
        TaskEngagementLetter: {
          select: {
            dpaUploaded: true,
            dpaFilePath: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const engagementLetter = task.TaskEngagementLetter;
    if (!engagementLetter?.dpaUploaded || !engagementLetter?.dpaFilePath) {
      return NextResponse.json(
        { error: 'No Data Processing Agreement has been uploaded for this task' },
        { status: 404 }
      );
    }

    // Download from blob storage
    const fileBuffer = await downloadDpa(engagementLetter.dpaFilePath);

    // Determine content type based on file extension
    const ext = engagementLetter.dpaFilePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'pdf') {
      contentType = 'application/pdf';
    } else if (ext === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Get filename
    const filename = engagementLetter.dpaFilePath.split('/').pop() || 'dpa';

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
    return handleApiError(error, 'GET /api/tasks/[id]/dpa/download');
  }
}


