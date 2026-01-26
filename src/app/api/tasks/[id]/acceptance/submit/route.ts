import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes, AcceptanceErrorCodes } from '@/lib/utils/errorHandler';
import { validateRequiredQuestions } from '@/lib/services/acceptance/riskCalculation';
import { getAllQuestions, type QuestionnaireType } from '@/constants/acceptance-questions';
import { validateAcceptanceAccess } from '@/lib/api/acceptanceMiddleware';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * POST /api/tasks/[id]/acceptance/submit
 * Submit questionnaire for review
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    // Validate user has access to task
    const hasAccess = await validateAcceptanceAccess(taskId, user.id);
    
    if (!hasAccess) {
      throw new AppError(
        403,
        'Forbidden',
        AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    // Get the active questionnaire response for this task
    const response = await prisma.clientAcceptanceResponse.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        questionnaireType: true,
        completedAt: true,
        AcceptanceAnswer: {
          take: 500,
          select: {
            answer: true,
            comment: true,
            AcceptanceQuestion: {
              select: {
                questionKey: true,
              },
            },
          },
        },
      },
    });

    if (!response) {
      throw new AppError(
        404,
        'Questionnaire not initialized',
        AcceptanceErrorCodes.QUESTIONNAIRE_NOT_INITIALIZED
      );
    }

    // Check if already completed
    if (response.completedAt) {
      throw new AppError(
        400,
        'Questionnaire already submitted',
        AcceptanceErrorCodes.ALREADY_SUBMITTED
      );
    }

    // Validate all required questions are answered
    const questionDefs = getAllQuestions(response.questionnaireType as QuestionnaireType);
    const answerData = response.AcceptanceAnswer.map((a) => ({
      questionKey: a.AcceptanceQuestion.questionKey,
      answer: a.answer || '',
      comment: a.comment || undefined,
    }));

    const validation = validateRequiredQuestions(questionDefs, answerData);

    if (!validation.isValid) {
      // Map missing question keys to human-readable text for better UX
      const missingQuestionDetails = validation.missingQuestions.map((key) => {
        const question = questionDefs.find((q) => q.questionKey === key);
        return {
          questionKey: key,
          questionText: question?.questionText || key,
          sectionKey: question?.sectionKey || 'unknown',
        };
      });

      throw new AppError(
        400,
        'Not all required questions have been answered',
        AcceptanceErrorCodes.INCOMPLETE_QUESTIONNAIRE,
        { 
          missingQuestions: validation.missingQuestions,
          missingQuestionDetails,
          count: validation.missingQuestions.length,
        }
      );
    }

    // Mark as completed
    const updatedResponse = await prisma.clientAcceptanceResponse.update({
      where: { id: response.id },
      data: {
        completedAt: new Date(),
        completedBy: user.email || user.id,
      },
      select: {
        id: true,
        taskId: true,
        questionnaireType: true,
        completedAt: true,
        completedBy: true,
        overallRiskScore: true,
        riskRating: true,
      },
    });

    // TODO: Send notification to Partner/System Admin for review

    return NextResponse.json(
      successResponse({
        response: updatedResponse,
        message: 'Questionnaire submitted successfully for review',
      })
    );
  },
});
