/**
 * POST /api/clients/[id]/acceptance/initialize
 * Initialize or get existing client acceptance questionnaire
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getOrCreateClientAcceptance } from '@/lib/services/acceptance/clientAcceptanceService';
import { validateClientPartner } from '@/lib/services/clients/partnerValidation';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import { enrichObjectsWithEmployeeStatus } from '@/lib/services/employees/employeeStatusService';

export const POST = secureRoute.mutationWithParams<never, { id: string }>({
  feature: Feature.MANAGE_CLIENT_ACCEPTANCE,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;
    
    // Validate GUID format
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format', ErrorCodes.VALIDATION_ERROR);
    }

    // Get client with full details for team selection
    const client = await prisma.client.findUnique({
      where: { GSClientID },
      select: { 
        id: true,
        clientCode: true,
        clientNameFull: true,
        groupCode: true,
        groupDesc: true,
        clientPartner: true,
        clientManager: true,
        clientIncharge: true,
        industry: true,
        forvisMazarsIndustry: true,
        forvisMazarsSector: true,
        forvisMazarsSubsector: true,
      },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Validate current partner status (but don't block - UI will handle partner selection)
    const validation = await validateClientPartner(client.id);

    const acceptance = await getOrCreateClientAcceptance(client.id, user.id);

    // Enrich client data with employee names
    const enrichedClients = await enrichRecordsWithEmployeeNames(
      [client],
      [
        { codeField: 'clientPartner', nameField: 'clientPartnerName' },
        { codeField: 'clientManager', nameField: 'clientManagerName' },
        { codeField: 'clientIncharge', nameField: 'clientInchargeName' },
      ],
      true // Bypass cache for fresh data
    );

    // Enrich with employee status
    await enrichObjectsWithEmployeeStatus(enrichedClients, [
      { codeField: 'clientPartner', statusField: 'clientPartnerStatus' },
      { codeField: 'clientManager', statusField: 'clientManagerStatus' },
      { codeField: 'clientIncharge', statusField: 'clientInchargeStatus' },
    ]);

    const enrichedClient = enrichedClients[0]!;

    return NextResponse.json(successResponse({
      acceptance,
      client: {
        id: enrichedClient.id,
        clientCode: enrichedClient.clientCode,
        clientNameFull: enrichedClient.clientNameFull,
        groupCode: enrichedClient.groupCode,
        groupDesc: enrichedClient.groupDesc,
        clientPartner: enrichedClient.clientPartner,
        clientPartnerName: enrichedClient.clientPartnerName,
        clientPartnerStatus: enrichedClient.clientPartnerStatus,
        clientManager: enrichedClient.clientManager,
        clientManagerName: enrichedClient.clientManagerName,
        clientManagerStatus: enrichedClient.clientManagerStatus,
        clientIncharge: enrichedClient.clientIncharge,
        clientInchargeName: enrichedClient.clientInchargeName,
        clientInchargeStatus: enrichedClient.clientInchargeStatus,
        industry: enrichedClient.industry,
        forvisMazarsIndustry: enrichedClient.forvisMazarsIndustry,
        forvisMazarsSector: enrichedClient.forvisMazarsSector,
        forvisMazarsSubsector: enrichedClient.forvisMazarsSubsector,
      },
      currentPartnerValidation: {
        isValid: validation.isValid,
        reason: validation.reason,
        partner: validation.partner,
      },
    }));
  },
});
