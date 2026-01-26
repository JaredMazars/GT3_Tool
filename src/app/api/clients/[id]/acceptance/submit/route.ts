/**
 * POST /api/clients/[id]/acceptance/submit
 * Submit client acceptance for Partner approval
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { submitClientAcceptance } from '@/lib/services/acceptance/clientAcceptanceService';
import { validateClientPartner } from '@/lib/services/clients/partnerValidation';
import { approvalService } from '@/lib/services/approvals/approvalService';
import { invalidateApprovalsCache } from '@/lib/services/cache/cacheInvalidation';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

const SubmitAcceptanceSchema = z.object({
  answers: z.record(
    z.string(),
    z.object({
      answer: z.string(),
      comment: z.string().optional(),
    })
  ),
  selectedPartnerCode: z.string().optional(),
  selectedManagerCode: z.string().optional(),
  selectedInchargeCode: z.string().optional(),
});

export const POST = secureRoute.mutationWithParams<typeof SubmitAcceptanceSchema, { id: string }>({
  feature: Feature.MANAGE_CLIENT_ACCEPTANCE,
  schema: SubmitAcceptanceSchema,
  handler: async (request, { user, params, data }) => {
    const GSClientID = params.id;
    
    // Validate GUID format
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format', ErrorCodes.VALIDATION_ERROR);
    }

    // Get client with partner info
    const client = await prisma.client.findUnique({
      where: { GSClientID },
      select: { 
        id: true,
        clientCode: true,
        clientNameFull: true,
        clientPartner: true,
      },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Determine which partner will approve (use selected or fall back to current)
    const approvalPartnerCode = data.selectedPartnerCode || client.clientPartner;

    // Validate the partner who will approve is active and has correct category
    let partnerEmployee;
    if (approvalPartnerCode) {
      partnerEmployee = await prisma.employee.findFirst({
        where: {
          EmpCode: approvalPartnerCode.trim(),
        },
        select: {
          EmpCode: true,
          EmpNameFull: true,
          WinLogon: true,
          Active: true,
          EmpCatCode: true,
        },
      });

      if (!partnerEmployee) {
        throw new AppError(
          400,
          `Selected partner (${approvalPartnerCode}) not found in system.`,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (partnerEmployee.Active !== 'Yes') {
        throw new AppError(
          400,
          `Selected partner (${partnerEmployee.EmpNameFull}) is not active.`,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (!['CARL', 'LOCAL', 'DIR'].includes(partnerEmployee.EmpCatCode)) {
        throw new AppError(
          400,
          `Selected partner (${partnerEmployee.EmpNameFull}) does not have appropriate category (CARL, LOCAL, or DIR).`,
          ErrorCodes.VALIDATION_ERROR
        );
      }
    } else {
      throw new AppError(
        400,
        'No partner selected for approval.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Submit the acceptance (calculates risk, saves answers, marks as completed, stores pending team)
    const acceptance = await submitClientAcceptance({
      clientId: client.id,
      answers: data.answers,
      userId: user.id,
      selectedPartnerCode: data.selectedPartnerCode,
      selectedManagerCode: data.selectedManagerCode,
      selectedInchargeCode: data.selectedInchargeCode,
    });

    // Create approval workflow record routed to the selected/current partner
    const approval = await approvalService.createApproval({
      workflowType: 'CLIENT_ACCEPTANCE',
      workflowId: acceptance.id,
      title: `Client Acceptance for ${client.clientNameFull || client.clientCode}`,
      description: `Risk Rating: ${acceptance.riskRating || 'Unknown'}`,
      requestedById: user.id,
      context: { 
        clientPartnerCode: approvalPartnerCode,
        clientPartnerName: partnerEmployee?.EmpNameFull || null,
        clientPartnerEmail: partnerEmployee?.WinLogon || null,
        clientId: client.id,
        clientCode: client.clientCode,
        clientName: client.clientNameFull || client.clientCode,
        hasPendingTeamChanges: !!(data.selectedPartnerCode || data.selectedManagerCode || data.selectedInchargeCode),
      },
    });

    // Link approval to acceptance record
    await prisma.clientAcceptance.update({
      where: { id: acceptance.id },
      data: { approvalId: approval.id },
    });

    // Invalidate approvals cache
    await invalidateApprovalsCache();

    return NextResponse.json(successResponse({
      ...acceptance,
      approvalId: approval.id,
    }));
  },
});
