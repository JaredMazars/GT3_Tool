import { NextResponse } from 'next/server';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { getQuestionnaireStatus } from '@/lib/services/acceptance/questionnaireService';
import { calculateCompletionPercentage } from '@/lib/services/acceptance/riskCalculation';
import { getAllQuestions, type QuestionnaireType } from '@/constants/acceptance-questions';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/tasks/[id]/acceptance/status
 * Get questionnaire status and completion info
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    const status = await getQuestionnaireStatus(taskId);

    // If questionnaire exists, calculate completion percentage
    if (status.exists && status.questionnaireType) {
      const response = await prisma.clientAcceptanceResponse.findFirst({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          questionnaireType: true,
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

      if (response) {
        const questionDefs = getAllQuestions(response.questionnaireType as QuestionnaireType);
        const answerData = response.AcceptanceAnswer.map((a) => ({
          questionKey: a.AcceptanceQuestion.questionKey,
          answer: a.answer || '',
          comment: a.comment || undefined,
        }));

        const completionPercentage = calculateCompletionPercentage(questionDefs, answerData);

        return NextResponse.json(
          successResponse({
            ...status,
            completionPercentage,
          }),
          {
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        );
      }
    }

    return NextResponse.json(
      successResponse({
        ...status,
        completionPercentage: status.exists ? 0 : null,
      }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  },
});
