import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { canApproveEngagementLetter } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'engagement-letters', taskId.toString());
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `engagement-letter-${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Store relative path
    const relativePath = path.join('uploads', 'engagement-letters', taskId.toString(), filename);

    // Update or create TaskEngagementLetter
    const updatedEngagementLetter = await prisma.taskEngagementLetter.upsert({
      where: { taskId },
      create: {
        taskId,
        uploaded: true,
        filePath: relativePath,
        uploadedBy: user.id,
        uploadedAt: new Date(),
      },
      update: {
        uploaded: true,
        filePath: relativePath,
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


