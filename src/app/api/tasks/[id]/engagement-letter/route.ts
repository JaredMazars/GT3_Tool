import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { canApproveEngagementLetter } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { invalidateClientCache } from '@/lib/services/clients/clientCache';
import { invalidateTaskListCache } from '@/lib/services/cache/listCache';
import { uploadEngagementLetter } from '@/lib/services/documents/blobStorage';

/**
 * POST /api/tasks/[id]/engagement-letter
 * Upload signed engagement letter
 */
export async function POST(
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

    // Check if user can approve/upload engagement letter
    // Rules: SYSTEM_ADMIN OR Partner/Administrator (ServiceLineUser.role = ADMINISTRATOR or PARTNER for project's service line)
    const hasApprovalPermission = await canApproveEngagementLetter(user.id, taskId);

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Only Partners and System Administrators can upload engagement letters' },
        { status: 403 }
      );
    }

    // Get task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        GSClientID: true,
        TaskAcceptance: {
          select: {
            acceptanceApproved: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.GSClientID) {
      return NextResponse.json(
        { error: 'Engagement letter is only available for client tasks' },
        { status: 400 }
      );
    }

    if (!task.TaskAcceptance?.acceptanceApproved) {
      return NextResponse.json(
        { error: 'Client acceptance must be approved before uploading engagement letter' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (PDF or DOCX)
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and DOCX files are allowed' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Azure Blob Storage
    const blobPath = await uploadEngagementLetter(buffer, file.name, taskId);

    // Update or create TaskEngagementLetter
    const updatedEngagementLetter = await prisma.taskEngagementLetter.upsert({
      where: { taskId },
      create: {
        taskId,
        uploaded: true,
        filePath: blobPath,
        uploadedBy: user.id,
        uploadedAt: new Date(),
      },
      update: {
        uploaded: true,
        filePath: blobPath,
        uploadedBy: user.id,
        uploadedAt: new Date(),
      },
      select: {
        uploaded: true,
        filePath: true,
        uploadedBy: true,
        uploadedAt: true,
      },
    });

    // Invalidate caches to ensure fresh data on next fetch
    await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}:*`);
    await invalidateTaskListCache(taskId);
    
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    return NextResponse.json(
      successResponse({
        uploaded: updatedEngagementLetter.uploaded,
        filePath: updatedEngagementLetter.filePath,
        uploadedBy: updatedEngagementLetter.uploadedBy,
        uploadedAt: updatedEngagementLetter.uploadedAt,
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/engagement-letter');
  }
}

/**
 * GET /api/tasks/[id]/engagement-letter
 * Get engagement letter status
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

    // Get task engagement letter
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskEngagementLetter: {
          select: {
            generated: true,
            uploaded: true,
            filePath: true,
            uploadedBy: true,
            uploadedAt: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const engagementLetter = task.TaskEngagementLetter;
    return NextResponse.json(
      successResponse({
        engagementLetterGenerated: engagementLetter?.generated || false,
        engagementLetterUploaded: engagementLetter?.uploaded || false,
        engagementLetterPath: engagementLetter?.filePath || null,
        engagementLetterUploadedBy: engagementLetter?.uploadedBy || null,
        engagementLetterUploadedAt: engagementLetter?.uploadedAt || null,
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[id]/engagement-letter');
  }
}


