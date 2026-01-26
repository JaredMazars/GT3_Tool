import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { InitializeQuestionnaireSchema } from '@/lib/validation/schemas';
import { getQuestionnaireType, getQuestionnaireStructure } from '@/lib/services/acceptance/questionnaireService';
import { getAllQuestions, type QuestionnaireType } from '@/constants/acceptance-questions';
import { calculateCompletionPercentage } from '@/lib/services/acceptance/riskCalculation';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { enforceClientAcceptanceForEngagementAcceptance } from '@/lib/middleware/clientAcceptanceCheck';

/**
 * POST /api/tasks/[id]/acceptance/initialize
 * Initialize or retrieve questionnaire for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  schema: InitializeQuestionnaireSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);

    // Get task with client
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        TaskDesc: true,
        Client: {
          select: {
            id: true,
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
          },
        },
      },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    if (!task.Client) {
      throw new AppError(
        400,
        'Engagement acceptance is only required for client tasks',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Enforce that client acceptance must be completed first
    await enforceClientAcceptanceForEngagementAcceptance(task.Client.id);

    // Determine questionnaire type
    const typeResult = await getQuestionnaireType(taskId, task.Client.id);
    const questionnaireType = data.questionnaireType || typeResult.recommendedType;

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
        take: 500,
        orderBy: [{ questionId: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          responseId: true,
          questionId: true,
          answer: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          AcceptanceQuestion: {
            select: {
              id: true,
              questionKey: true,
              questionText: true,
              fieldType: true,
              sectionKey: true,
              order: true,
              required: true,
              riskWeight: true,
            },
          },
        },
      }),
      prisma.acceptanceDocument.findMany({
        where: { responseId: response.id },
        take: 100,
        orderBy: [{ uploadedAt: 'desc' }, { id: 'asc' }],
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
      const questionDefs = getAllQuestions(questionnaireType as QuestionnaireType);
      const answerData = answers.map((a) => ({
        questionKey: a.AcceptanceQuestion.questionKey,
        answer: a.answer || '',
        comment: a.comment || undefined,
      }));

      completionPercentage = calculateCompletionPercentage(questionDefs, answerData);
    }

    // Build risk assessment data for easier access
    const riskAssessment = response
      ? {
          overallRiskScore: response.overallRiskScore,
          riskRating: response.riskRating,
          riskSummary: response.riskSummary,
        }
      : null;

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
  },
});
