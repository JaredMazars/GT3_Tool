import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { successResponse, parseApprovalId } from '@/lib/utils/apiUtils';
import { fetchWorkflowData } from '@/lib/services/approvals/workflowRegistry';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/approvals/[id]/workflow
 * Fetch workflow-specific data for an approval
 * 
 * This endpoint retrieves the underlying workflow data (e.g., vault document, change request)
 * for a given approval. Used by client components to display detailed workflow information.
 * 
 * Authorization: User must be assigned as an approver on at least one step of the approval.
 */
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
          where: { assignedToUserId: user.id },
          select: { id: true }
        }
      }
    });
    
    if (!approval) {
      throw new AppError(404, 'Approval not found', ErrorCodes.NOT_FOUND);
    }
    
    // Check user has access (must be an approver on this approval)
    if (approval.ApprovalStep.length === 0) {
      throw new AppError(403, 'Not authorized to view this approval', ErrorCodes.FORBIDDEN);
    }
    
    // Fetch workflow-specific data
    const workflowData = await fetchWorkflowData(
      approval.workflowType as any,
      approval.workflowId
    );
    
    return NextResponse.json(successResponse(workflowData), {
      headers: {
        'Cache-Control': 'no-store', // Sensitive data, don't cache
      },
    });
  }
});
