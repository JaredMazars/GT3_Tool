/**
 * POST /api/clients/[id]/acceptance/research/skip
 * Skip company research for client acceptance
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { markResearchCompleted } from '@/lib/services/acceptance/clientAcceptanceService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/utils/logger';

export const POST = secureRoute.mutationWithParams<never, { id: string }>({
  feature: Feature.MANAGE_CLIENT_ACCEPTANCE,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;
    
    // Validate GUID format
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format', ErrorCodes.VALIDATION_ERROR);
    }

    // Get client
    const client = await prisma.client.findUnique({
      where: { GSClientID },
      select: { 
        id: true, 
        clientNameFull: true 
      },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    logger.info('Client research skipped', {
      clientId: client.id,
      clientName: client.clientNameFull,
      userId: user.id,
    });

    // Mark research as completed (skipped)
    await markResearchCompleted(client.id, true, user.id);

    return NextResponse.json(successResponse({ 
      message: 'Research skipped successfully',
      clientId: client.id 
    }));
  },
});
