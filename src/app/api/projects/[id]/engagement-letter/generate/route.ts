import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { canApproveEngagementLetter } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toProjectId } from '@/types/branded';
import {
  generateFromTemplate,
  getBestTemplateForProject,
  getProjectContext,
} from '@/lib/services/templates/templateGenerator';

/**
 * POST /api/projects/[id]/engagement-letter/generate
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
    const projectId = toProjectId(id);

    // Check if user can generate engagement letter
    // Rules: SUPERUSER OR Partner (ServiceLineUser.role = ADMIN for project's service line)
    const hasApprovalPermission = await canApproveEngagementLetter(user.id, projectId);

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Only Partners and System Administrators can generate engagement letters' },
        { status: 403 }
      );
    }

    // Get project with client details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        Client: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.clientId || !project.Client) {
      return NextResponse.json(
        { error: 'Engagement letter is only available for client projects' },
        { status: 400 }
      );
    }

    if (!project.acceptanceApproved) {
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
      finalTemplateId = await getBestTemplateForProject(projectId, 'ENGAGEMENT_LETTER');
    }

    if (!finalTemplateId) {
      return NextResponse.json(
        { error: 'No engagement letter template available for this project type' },
        { status: 404 }
      );
    }

    // Get project context
    const projectContext = await getProjectContext(projectId);

    // Generate from template with AI adaptation
    const generated = await generateFromTemplate(
      finalTemplateId,
      projectContext,
      useAiAdaptation
    );

    // Mark as generated
    await prisma.project.update({
      where: { id: projectId },
      data: {
        engagementLetterGenerated: true,
      },
    });

    return NextResponse.json(
      successResponse({
        content: generated.content,
        generated: true,
        sectionsUsed: generated.sectionsUsed,
        templateId: finalTemplateId,
        aiAdaptationUsed: useAiAdaptation,
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/engagement-letter/generate');
  }
}


