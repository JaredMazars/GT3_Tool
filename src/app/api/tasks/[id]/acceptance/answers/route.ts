import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes, AcceptanceErrorCodes } from '@/lib/utils/errorHandler';
import { SaveAnswersByKeySchema } from '@/lib/validation/schemas';
import { calculateRiskAssessment } from '@/lib/services/acceptance/riskCalculation';
import { getAllQuestions, type QuestionnaireType } from '@/constants/acceptance-questions';
import { sanitizeComment } from '@/lib/utils/sanitization';
import { validateAcceptanceAccess } from '@/lib/api/acceptanceMiddleware';
import { logAnswersSaved } from '@/lib/services/acceptance/auditLog';
import { logger } from '@/lib/utils/logger';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * PATCH /api/tasks/[id]/acceptance/answers
 * Save or update questionnaire answers (autosave)
 */
export const PATCH = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: SaveAnswersByKeySchema,
  handler: async (request, { user, params, data }) => {
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
        reviewedAt: true,
      },
    });

    if (!response) {
      throw new AppError(
        404,
        'Questionnaire not initialized. Call /initialize first.',
        ErrorCodes.NOT_FOUND
      );
    }

    // Check if user can edit (not reviewed)
    if (response.reviewedAt) {
      throw new AppError(
        403,
        'Cannot modify questionnaire after review',
        AcceptanceErrorCodes.CANNOT_MODIFY_AFTER_REVIEW
      );
    }

    // Get all questions for this questionnaire type to map keys to IDs
    const allQuestions = await prisma.acceptanceQuestion.findMany({
      where: { questionnaireType: response.questionnaireType },
      take: 200,
      select: {
        id: true,
        questionKey: true,
      },
    });

    const questionMap = new Map(allQuestions.map((q) => [q.questionKey, q]));

    // Deduplicate answers by questionKey (keep last occurrence to preserve latest user input)
    const answerMap = new Map<string, typeof data.answers[0]>();
    data.answers.forEach(answer => {
      answerMap.set(answer.questionKey, answer);
    });
    const deduplicatedAnswers = Array.from(answerMap.values());

    // Log if duplicates were found
    if (deduplicatedAnswers.length !== data.answers.length) {
      logger.warn('Duplicate question keys detected in submission', {
        taskId,
        original: data.answers.length,
        deduplicated: deduplicatedAnswers.length,
      });
    }

    // Batch upsert answers (no transaction - each upsert is atomic)
    const upsertPromises = deduplicatedAnswers
      .map((answerInput) => {
        const question = questionMap.get(answerInput.questionKey);

        if (!question) {
          logger.warn('Question not found', { questionKey: answerInput.questionKey });
          return null;
        }

        // Sanitize comment to prevent XSS
        const sanitizedComment = sanitizeComment(answerInput.comment);

        return prisma.acceptanceAnswer.upsert({
          where: {
            responseId_questionId: {
              responseId: response.id,
              questionId: question.id,
            },
          },
          create: {
            responseId: response.id,
            questionId: question.id,
            answer: answerInput.answer,
            comment: sanitizedComment,
          },
          update: {
            answer: answerInput.answer,
            comment: sanitizedComment,
          },
          select: { id: true },
        });
      })
      .filter((p) => p !== null);

    // Execute all upserts in parallel
    await Promise.all(upsertPromises);

    // Get all current answers (optimized query - only needed fields)
    const allAnswers = await prisma.acceptanceAnswer.findMany({
      where: { responseId: response.id },
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
    });

    // Calculate risk assessment
    const questionDefs = getAllQuestions(response.questionnaireType as QuestionnaireType);
    const answerData = allAnswers.map((a) => ({
      questionKey: a.AcceptanceQuestion.questionKey,
      answer: a.answer || '',
      comment: a.comment || undefined,
    }));

    const riskAssessment = calculateRiskAssessment(questionDefs, answerData);

    // Update response with risk assessment
    const updated = await prisma.clientAcceptanceResponse.update({
      where: { id: response.id },
      data: {
        overallRiskScore: riskAssessment.overallRiskScore,
        riskRating: riskAssessment.riskRating,
        riskSummary: riskAssessment.riskSummary,
      },
      select: {
        id: true,
        overallRiskScore: true,
        riskRating: true,
        riskSummary: true,
        completedAt: true,
        reviewedAt: true,
      },
    });

    // Audit log
    await logAnswersSaved(taskId, user.id, data.answers.length);

    return NextResponse.json(
      successResponse({
        response: updated,
        riskAssessment,
      })
    );
  },
});
