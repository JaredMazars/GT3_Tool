/**
 * POST /api/clients/[id]/acceptance/research
 * Trigger company research for client acceptance
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { saveClientResearchData } from '@/lib/services/acceptance/clientAcceptanceService';
import { companyResearchAgent } from '@/lib/services/bd/companyResearchAgent';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/utils/logger';

export const POST = secureRoute.aiWithParams<never, { id: string }>({
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
        clientNameFull: true,
        clientCode: true 
      },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    logger.info('Client research requested', {
      clientId: client.id,
      clientName: client.clientNameFull,
      userId: user.id,
    });

    // Perform research using client name
    const companyName = client.clientNameFull || client.clientCode;
    const result = await companyResearchAgent.research(companyName);

    // Save research data
    await saveClientResearchData(client.id, result, user.id);

    logger.info('Client research completed', {
      clientId: client.id,
      confidence: result.confidence,
      overallRisk: result.riskAssessment.overallRisk,
    });

    return NextResponse.json(successResponse(result));
  },
});
