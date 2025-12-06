import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AcceptanceErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { SaveAnswersByKeySchema } from '@/lib/validation/schemas';
import { calculateRiskAssessment } from '@/lib/services/acceptance/riskCalculation';
import { getAllQuestions } from '@/constants/acceptance-questions';
import { sanitizeComment } from '@/lib/utils/sanitization';
import { enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';
import { validateAcceptanceAccess } from '@/lib/api/acceptanceMiddleware';
import { logAnswersSaved } from '@/lib/services/acceptance/auditLog';

/**
 * PATCH /api/tasks/[id]/acceptance/answers
 * Save or update questionnaire answers (autosave)
 */
export async function PATCH(
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

    // Rate limit autosave to prevent abuse
    await enforceRateLimit(request, RateLimitPresets.STANDARD);

    // Validate user has access to task
    const hasAccess = await validateAcceptanceAccess(taskId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', code: AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = SaveAnswersByKeySchema.parse(body);

    // Get the active questionnaire response for this task
    const response = await prisma.clientAcceptanceResponse.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Questionnaire not initialized. Call /initialize first.' },
        { status: 404 }
      );
    }

    // Check if user can edit (not reviewed)
    if (response.reviewedAt) {
      return NextResponse.json(
        { error: 'Cannot modify questionnaire after review', code: AcceptanceErrorCodes.CANNOT_MODIFY_AFTER_REVIEW },
        { status: 403 }
      );
    }

    // Get all questions for this questionnaire type to map keys to IDs
    const allQuestions = await prisma.acceptanceQuestion.findMany({
      where: { questionnaireType: response.questionnaireType },
      select: {
        id: true,
        questionKey: true,
      },
    });

    const questionMap = new Map(allQuestions.map((q) => [q.questionKey, q]));

    // Batch upsert answers (no transaction - each upsert is atomic)
    const upsertPromises = validated.answers
      .map((answerInput) => {
        const question = questionMap.get(answerInput.questionKey);
        
        if (!question) {
          console.warn(`Question with key ${answerInput.questionKey} not found`);
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
        });
      })
      .filter((p) => p !== null);

    // Execute all upserts in parallel
    await Promise.all(upsertPromises);

    // Get all current answers (optimized query - only needed fields)
    const allAnswers = await prisma.acceptanceAnswer.findMany({
      where: { responseId: response.id },
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
    const questionDefs = getAllQuestions(response.questionnaireType as any);
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

    const updatedResponse = { updated, riskAssessment };

    // Audit log
    await logAnswersSaved(taskId, user.id, validated.answers.length);

    return NextResponse.json(
      successResponse({
        response: updatedResponse.updated,
        riskAssessment: updatedResponse.riskAssessment,
      })
    );
  } catch (error) {
    return handleApiError(error, 'PATCH /api/tasks/[id]/acceptance/answers');
  }
}

