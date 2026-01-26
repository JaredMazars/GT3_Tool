/**
 * GET /api/approvals/[id]/client-acceptance
 * Fetch client data for a client acceptance approval
 * 
 * This endpoint retrieves the GSClientID and client name for a client acceptance approval.
 * Used by the approval modal to display the full questionnaire.
 * 
 * Authorization: User must have approval access via:
 * 1. Direct assignment to a pending approval step, OR
 * 2. Fallback path: User's employee code matches the pendingPartnerCode in ClientAcceptance
 */

import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { successResponse, parseApprovalId } from '@/lib/utils/apiUtils';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

export const GET = secureRoute.queryWithParams<{ id: string }>({
  handler: async (request, { user, params }) => {
    const approvalId = parseApprovalId(params.id);
    
    // Get approval to check access and get workflow info
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      select: {
        workflowType: true,
        workflowId: true,
        ApprovalStep: {
          where: { 
            status: 'PENDING'
          },
          select: { 
            id: true,
            assignedToUserId: true
          }
        }
      }
    });
    
    if (!approval) {
      throw new AppError(404, 'Approval not found', ErrorCodes.NOT_FOUND);
    }
    
    // Verify this is a client acceptance approval
    if (approval.workflowType !== 'CLIENT_ACCEPTANCE') {
      throw new AppError(400, 'Invalid approval type', ErrorCodes.VALIDATION_ERROR);
    }
    
    // Check user has access - two paths:
    // 1. Direct assignment: user is assigned to a pending step
    const isDirectlyAssigned = approval.ApprovalStep.some(
      step => step.assignedToUserId === user.id
    );
    
    // 2. Fallback path for CLIENT_ACCEPTANCE: assignedToUserId is NULL and user's employee code matches pendingPartnerCode
    let isFallbackMatch = false;
    const hasNullAssignment = approval.ApprovalStep.some(step => step.assignedToUserId === null);
    
    if (hasNullAssignment && !isDirectlyAssigned) {
      // Get user's employee code
      const userWithEmail = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      });

      if (userWithEmail?.email) {
        const employee = await prisma.employee.findFirst({
          where: { WinLogon: userWithEmail.email },
          select: { EmpCode: true },
        });

        if (employee?.EmpCode) {
          // Check if this client acceptance has the user's employee code as pendingPartnerCode
          const clientAcceptance = await prisma.clientAcceptance.findUnique({
            where: { id: approval.workflowId },
            select: { pendingPartnerCode: true },
          });

          isFallbackMatch = clientAcceptance?.pendingPartnerCode === employee.EmpCode;
        }
      }
    }
    
    if (!isDirectlyAssigned && !isFallbackMatch) {
      throw new AppError(403, 'Not authorized to view this approval', ErrorCodes.FORBIDDEN);
    }
    
    // Fetch client acceptance and client data
    // workflowId points to ClientAcceptance.id
    const clientAcceptance = await prisma.clientAcceptance.findUnique({
      where: { id: approval.workflowId },
      select: {
        Client: {
          select: {
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
          }
        }
      }
    });
    
    if (!clientAcceptance || !clientAcceptance.Client) {
      throw new AppError(404, 'Client acceptance or client not found', ErrorCodes.NOT_FOUND);
    }
    
    return NextResponse.json(successResponse({
      GSClientID: clientAcceptance.Client.GSClientID,
      clientCode: clientAcceptance.Client.clientCode,
      clientName: clientAcceptance.Client.clientNameFull,
    }), {
      headers: {
        'Cache-Control': 'no-store', // Sensitive data, don't cache
      },
    });
  }
});
