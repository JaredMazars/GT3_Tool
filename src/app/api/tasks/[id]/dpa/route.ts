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
import { uploadDpa } from '@/lib/services/documents/blobStorage';

/**
 * POST /api/tasks/[id]/dpa
 * Upload Data Processing Agreement (DPA)
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

    // Check if user can approve/upload DPA (same permissions as engagement letter)
    // Rules: SYSTEM_ADMIN OR Partner/Administrator (ServiceLineUser.role = ADMINISTRATOR or PARTNER for project's service line)
    const hasApprovalPermission = await canApproveEngagementLetter(user.id, taskId);

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Only Partners and System Administrators can upload Data Processing Agreements' },
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
        TaskEngagementLetter: {
          select: {
            uploaded: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.GSClientID) {
      return NextResponse.json(
        { error: 'Data Processing Agreement is only available for client tasks' },
        { status: 400 }
      );
    }

    if (!task.TaskAcceptance?.acceptanceApproved) {
      return NextResponse.json(
        { error: 'Client acceptance must be approved before uploading DPA' },
        { status: 400 }
      );
    }

    if (!task.TaskEngagementLetter?.uploaded) {
      return NextResponse.json(
        { error: 'Engagement letter must be uploaded before uploading DPA' },
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
    const blobPath = await uploadDpa(buffer, file.name, taskId);

    // Update or create TaskEngagementLetter (add DPA fields)
    const updatedEngagementLetter = await prisma.taskEngagementLetter.upsert({
      where: { taskId },
      create: {
        taskId,
        dpaUploaded: true,
        dpaFilePath: blobPath,
        dpaUploadedBy: user.id,
        dpaUploadedAt: new Date(),
      },
      update: {
        dpaUploaded: true,
        dpaFilePath: blobPath,
        dpaUploadedBy: user.id,
        dpaUploadedAt: new Date(),
      },
      select: {
        dpaUploaded: true,
        dpaFilePath: true,
        dpaUploadedBy: true,
        dpaUploadedAt: true,
      },
    });

    // Invalidate task cache to ensure fresh data on next fetch
    await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}:*`);
    await invalidateTaskListCache(taskId);
    
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    return NextResponse.json(
      successResponse({
        dpaUploaded: updatedEngagementLetter.dpaUploaded,
        dpaFilePath: updatedEngagementLetter.dpaFilePath,
        dpaUploadedBy: updatedEngagementLetter.dpaUploadedBy,
        dpaUploadedAt: updatedEngagementLetter.dpaUploadedAt,
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/dpa');
  }
}

/**
 * GET /api/tasks/[id]/dpa
 * Get DPA status
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

    // Get task DPA info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskEngagementLetter: {
          select: {
            dpaUploaded: true,
            dpaFilePath: true,
            dpaUploadedBy: true,
            dpaUploadedAt: true,
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
        dpaUploaded: engagementLetter?.dpaUploaded || false,
        dpaFilePath: engagementLetter?.dpaFilePath || null,
        dpaUploadedBy: engagementLetter?.dpaUploadedBy || null,
        dpaUploadedAt: engagementLetter?.dpaUploadedAt || null,
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[id]/dpa');
  }
}

