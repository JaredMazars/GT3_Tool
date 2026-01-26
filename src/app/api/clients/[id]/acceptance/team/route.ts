/**
 * PUT /api/clients/[id]/acceptance/team
 * Save client team selections (pending until approval)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { saveClientTeamSelections } from '@/lib/services/acceptance/clientAcceptanceService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

const TeamSelectionsSchema = z.object({
  partnerCode: z.string().optional(),
  managerCode: z.string().optional(),
  inchargeCode: z.string().optional(),
});

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

export const PUT = secureRoute.mutationWithParams<typeof TeamSelectionsSchema, { id: string }>({
  feature: Feature.MANAGE_CLIENT_ACCEPTANCE,
  schema: TeamSelectionsSchema,
  handler: async (request, { user, params, data }) => {
    const clientId = await getClientIdFromGSID(params.id);
    
    await saveClientTeamSelections(clientId, data, user.id);
    
    return NextResponse.json(successResponse({ success: true }));
  },
});
