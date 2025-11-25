import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toProjectId } from '@/types/branded';
import { validateRequiredQuestions } from '@/lib/services/acceptance/riskCalculation';
import { getAllQuestions } from '@/constants/acceptance-questions';

/**
 * POST /api/projects/[id]/acceptance/submit
 * Submit questionnaire for review
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

    // Get the active questionnaire response for this project
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

    if (!response) {
      return NextResponse.json(
        { error: 'Questionnaire not initialized' },
        { status: 404 }
      );
    }

    // Check if already completed
    if (response.completedAt) {
      return NextResponse.json(
        { error: 'Questionnaire already submitted' },
        { status: 400 }
      );
    }

    // Validate all required questions are answered
    const questionDefs = getAllQuestions(response.questionnaireType as any);
    const answerData = response.AcceptanceAnswer.map((a) => ({
      questionKey: a.Question.questionKey,
      answer: a.answer || '',
      comment: a.comment || undefined,
    }));

    const validation = validateRequiredQuestions(questionDefs, answerData);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Not all required questions have been answered',
          missingQuestions: validation.missingQuestions,
        },
        { status: 400 }
      );
    }

    // Mark as completed
    const updatedResponse = await prisma.clientAcceptanceResponse.update({
      where: { id: response.id },
      data: {
        completedAt: new Date(),
        completedBy: user.email || user.id,
      },
    });

    // TODO: Send notification to Partner/Superuser for review

    return NextResponse.json(
      successResponse({
        response: updatedResponse,
        message: 'Questionnaire submitted successfully for review',
      })
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/acceptance/submit');
  }
}





