import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { InitializeQuestionnaireSchema } from '@/lib/validation/schemas';
import { getQuestionnaireType, getQuestionnaireStructure } from '@/lib/services/acceptance/questionnaireService';
import { getAllQuestions } from '@/constants/acceptance-questions';
import { calculateCompletionPercentage } from '@/lib/services/acceptance/riskCalculation';

/**
 * POST /api/tasks/[id]/acceptance/initialize
 * Initialize or retrieve questionnaire for a task
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

    // Get task with client
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        Client: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.Client) {
      return NextResponse.json(
        { error: 'Client acceptance is only required for client tasks' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validated = InitializeQuestionnaireSchema.parse(body);

    // Determine questionnaire type
    const typeResult = await getQuestionnaireType(taskId, task.Client.id);
    const questionnaireType = validated.questionnaireType || typeResult.recommendedType;

    // Check if response already exists - fetch only essential fields
    let response = await prisma.clientAcceptanceResponse.findFirst({
      where: {
        taskId,
        questionnaireType,
      },
      select: {
        id: true,
        taskId: true,
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
          taskId,
          clientId: task.Client.id,
          questionnaireType,
        },
        select: {
          id: true,
          taskId: true,
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

    // Calculate completion percentage if questionnaire exists
    let completionPercentage = 0;
    if (response && structure) {
      const questionDefs = getAllQuestions(questionnaireType as any);
      const answerData = answers.map((a) => ({
        questionKey: a.AcceptanceQuestion.questionKey,
        answer: a.answer || '',
        comment: a.comment || undefined,
      }));

      completionPercentage = calculateCompletionPercentage(questionDefs, answerData);
    }

    // Build risk assessment data for easier access
    const riskAssessment = response ? {
      overallRiskScore: response.overallRiskScore,
      riskRating: response.riskRating,
      riskSummary: response.riskSummary,
    } : null;

    return NextResponse.json(
      successResponse({
        response,
        structure,
        typeInfo: typeResult,
        answers,
        documents,
        completionPercentage,
        riskAssessment,
      })
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/acceptance/initialize');
  }
}


