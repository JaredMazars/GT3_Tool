import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { canApproveEngagementLetter } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import {
  generateFromTemplate,
  getBestTemplateForTask,
  getTaskContext,
} from '@/lib/services/templates/templateGenerator';

/**
 * POST /api/tasks/[id]/engagement-letter/generate
 * Generate engagement letter from template
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

    // Check if user can generate engagement letter
    // Rules: SYSTEM_ADMIN OR Partner/Administrator (ServiceLineUser.role = ADMINISTRATOR or PARTNER for project's service line)
    const hasApprovalPermission = await canApproveEngagementLetter(user.id, taskId);

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Only Partners and System Administrators can generate engagement letters' },
        { status: 403 }
      );
    }

    // Get task with client details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        Client: true,
        TaskAcceptance: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.Client) {
      return NextResponse.json(
        { error: 'Engagement letter is only available for client tasks' },
        { status: 400 }
      );
    }

    if (!task.TaskAcceptance?.acceptanceApproved) {
      return NextResponse.json(
        { error: 'Client acceptance must be approved before generating engagement letter' },
        { status: 400 }
      );
    }

    // Parse request body to get template ID and AI preferences
    const body = await request.json().catch(() => ({}));
    const templateId = body.templateId;
    const useAiAdaptation = body.useAiAdaptation !== false; // Default to true

    // Get template ID - use provided or find best match
    let finalTemplateId = templateId;
    if (!finalTemplateId) {
      finalTemplateId = await getBestTemplateForTask(taskId, 'ENGAGEMENT_LETTER');
    }

    if (!finalTemplateId) {
      return NextResponse.json(
        { error: 'No engagement letter template available for this task type' },
        { status: 404 }
      );
    }

    // Get task context
    const taskContext = await getTaskContext(taskId);

    // Generate from template with AI adaptation
    const generated = await generateFromTemplate(
      finalTemplateId,
      taskContext,
      useAiAdaptation
    );

    // Save generated content to database with version tracking
    await prisma.taskEngagementLetter.upsert({
      where: { taskId },
      create: {
        taskId,
        generated: true,
        content: generated.content,
        templateId: finalTemplateId,
        templateVersionId: generated.versionId, // Lock to version used
        generatedBy: user.id,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        generated: true,
        content: generated.content,
        templateId: finalTemplateId,
        templateVersionId: generated.versionId,
        generatedBy: user.id,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      successResponse({
        content: generated.content,
        generated: true,
        sectionsUsed: generated.sectionsUsed,
        templateId: finalTemplateId,
        templateVersionId: generated.versionId,
        version: generated.version,
        aiAdaptationUsed: useAiAdaptation,
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/engagement-letter/generate');
  }
}


