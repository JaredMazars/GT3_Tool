import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toProjectId } from '@/types/branded';
import { InitializeQuestionnaireSchema } from '@/lib/validation/schemas';
import { getQuestionnaireType, getQuestionnaireStructure } from '@/lib/services/acceptance/questionnaireService';

/**
 * POST /api/projects/[id]/acceptance/initialize
 * Initialize or retrieve questionnaire for a project
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

    // Get project with client
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
        { error: 'Client acceptance is only required for client projects' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validated = InitializeQuestionnaireSchema.parse(body);

    // Determine questionnaire type
    const typeResult = await getQuestionnaireType(projectId, project.clientId);
    const questionnaireType = validated.questionnaireType || typeResult.recommendedType;

    // Check if response already exists - fetch only essential fields
    let response = await prisma.clientAcceptanceResponse.findFirst({
      where: {
        projectId,
        questionnaireType,
      },
      select: {
        id: true,
        projectId: true,
        clientId: true,
        questionnaireType: true,
        overallRiskScore: true,
        riskRating: true,
        riskSummary: true,
        completedAt: true,
        completedBy: true,
        reviewedAt: true,
        reviewedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create new response if doesn't exist
    if (!response) {
      response = await prisma.clientAcceptanceResponse.create({
        data: {
          projectId,
          clientId: project.clientId,
          questionnaireType,
        },
        select: {
          id: true,
          projectId: true,
          clientId: true,
          questionnaireType: true,
          overallRiskScore: true,
          riskRating: true,
          riskSummary: true,
          completedAt: true,
          completedBy: true,
          reviewedAt: true,
          reviewedBy: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Fetch answers and documents separately in parallel (only if response exists)
    const [answers, documents] = await Promise.all([
      prisma.acceptanceAnswer.findMany({
        where: { responseId: response.id },
        include: { AcceptanceQuestion: true },
      }),
      prisma.acceptanceDocument.findMany({
        where: { responseId: response.id },
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileSize: true,
          uploadedBy: true,
          uploadedAt: true,
        },
      }),
    ]);

    // Get questionnaire structure (uses caching)
    const structure = await getQuestionnaireStructure(questionnaireType);

    return NextResponse.json(
      successResponse({
        response,
        structure,
        typeInfo: typeResult,
        answers,
        documents,
      })
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/acceptance/initialize');
  }
}


