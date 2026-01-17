/**
 * GET /api/clients/[id]/acceptance/answers
 * Get client acceptance answers
 * 
 * PUT /api/clients/[id]/acceptance/answers
 * Save/update client acceptance answers
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { 
  getClientAcceptance,
  saveClientAcceptanceAnswers,
  saveClientAcceptanceAnswersBatch,
  getQuestionIdFromKey
} from '@/lib/services/acceptance/clientAcceptanceService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

const SaveAnswerSchema = z.union([
  // Single answer (backward compatibility)
  z.object({
    questionId: z.number().optional(),
    questionKey: z.string().optional(),
    answer: z.string(),
    comment: z.string().optional(),
  }).refine(data => data.questionId || data.questionKey, {
    message: 'Either questionId or questionKey must be provided'
  }),
  
  // Batch answers (new)
  z.object({
    answers: z.array(z.object({
      questionKey: z.string(),
      answer: z.string(),
      comment: z.string().optional(),
    })).min(1),
  }),
]);

async function getClientIdFromGSID(GSClientID: string): Promise<number> {
  const validationResult = GSClientIDSchema.safeParse(GSClientID);
  if (!validationResult.success) {
    throw new AppError(400, 'Invalid client ID format', ErrorCodes.VALIDATION_ERROR);
  }

  const client = await prisma.client.findUnique({
    where: { GSClientID },
    select: { id: true },
  });

  if (!client) {
    throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
  }

  return client.id;
}

export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const clientId = await getClientIdFromGSID(params.id);
    const acceptance = await getClientAcceptance(clientId);

    return NextResponse.json(successResponse(acceptance));
  },
});

export const PUT = secureRoute.mutationWithParams<typeof SaveAnswerSchema, { id: string }>({
  feature: Feature.MANAGE_CLIENT_ACCEPTANCE,
  schema: SaveAnswerSchema,
  handler: async (request, { user, params, data }) => {
    const clientId = await getClientIdFromGSID(params.id);

    // Check if this is a batch save
    if ('answers' in data) {
      // Process batch using transaction for better performance
      await saveClientAcceptanceAnswersBatch(
        clientId,
        data.answers,
        user.id
      );
      
      return NextResponse.json(successResponse({ 
        success: true, 
        saved: data.answers.length 
      }));
    } else {
      // Process single (existing logic)
      let questionId = data.questionId;
      if (!questionId && data.questionKey) {
        questionId = await getQuestionIdFromKey(data.questionKey) ?? undefined;
        if (!questionId) {
          throw new AppError(404, 'Question not found', ErrorCodes.NOT_FOUND);
        }
      }

      if (!questionId) {
        throw new AppError(400, 'Question ID could not be resolved', ErrorCodes.VALIDATION_ERROR);
      }

      await saveClientAcceptanceAnswers(
        clientId,
        questionId,
        data.answer,
        data.comment || null,
        user.id
      );

      return NextResponse.json(successResponse({ success: true }));
    }
  },
});
