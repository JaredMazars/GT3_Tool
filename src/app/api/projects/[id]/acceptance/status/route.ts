import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toProjectId } from '@/types/branded';
import { getQuestionnaireStatus } from '@/lib/services/acceptance/questionnaireService';
import { calculateCompletionPercentage } from '@/lib/services/acceptance/riskCalculation';
import { getAllQuestions } from '@/constants/acceptance-questions';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/projects/[id]/acceptance/status
 * Get questionnaire status and completion info
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
    const projectId = toProjectId(id);

    const status = await getQuestionnaireStatus(projectId);

    // If questionnaire exists, calculate completion percentage
    if (status.exists && status.questionnaireType) {
      const response = await prisma.clientAcceptanceResponse.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          AcceptanceAnswer: {
            include: {
              Question: true,
            },
          },
        },
      });

      if (response) {
        const questionDefs = getAllQuestions(response.questionnaireType as any);
        const answerData = response.AcceptanceAnswer.map((a) => ({
          questionKey: a.Question.questionKey,
          answer: a.answer || '',
          comment: a.comment || undefined,
        }));

        const completionPercentage = calculateCompletionPercentage(questionDefs, answerData);

        return NextResponse.json(
          successResponse({
            ...status,
            completionPercentage,
          })
        );
      }
    }

    return NextResponse.json(
      successResponse({
        ...status,
        completionPercentage: status.exists ? 0 : null,
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/acceptance/status');
  }
}





