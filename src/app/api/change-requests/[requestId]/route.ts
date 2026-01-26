import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/change-requests/[requestId]
 * Get a single change request by ID
 * 
 * Authorization:
 * - User must be the proposedEmployee, currentEmployee, requester, or SYSTEM_ADMIN
 */
export const GET = secureRoute.queryWithParams<{ requestId: string }>({
  handler: async (request, { user, params }) => {
    const requestId = parseInt(params.requestId, 10);

    if (isNaN(requestId)) {
      throw new AppError(400, 'Invalid request ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Fetch the change request
    const changeRequest = await prisma.clientPartnerManagerChangeRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        clientId: true,
        changeType: true,
        currentEmployeeCode: true,
        currentEmployeeName: true,
        proposedEmployeeCode: true,
        proposedEmployeeName: true,
        reason: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
        resolutionComment: true,
        requiresDualApproval: true,
        currentEmployeeApprovedAt: true,
        currentEmployeeApprovedById: true,
        proposedEmployeeApprovedAt: true,
        proposedEmployeeApprovedById: true,
        User_ClientPartnerManagerChangeRequest_requestedByIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
        User_ClientPartnerManagerChangeRequest_resolvedByIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
        User_ClientPartnerManagerChangeRequest_currentEmployeeApprovedByIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
        User_ClientPartnerManagerChangeRequest_proposedEmployeeApprovedByIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
        Client: {
          select: {
            id: true,
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
          },
        },
      },
    });

    if (!changeRequest) {
      throw new AppError(404, 'Change request not found', ErrorCodes.NOT_FOUND);
    }

    // Authorization: User must be involved in the request or SYSTEM_ADMIN
    if (user.role !== 'SYSTEM_ADMIN') {
      // Check if user is the proposed employee
      const proposedEmployee = await prisma.employee.findFirst({
        where: {
          EmpCode: changeRequest.proposedEmployeeCode,
          WinLogon: user.email,
        },
      });

      // Check if user is the current employee
      const currentEmployee = await prisma.employee.findFirst({
        where: {
          EmpCode: changeRequest.currentEmployeeCode,
          WinLogon: user.email,
        },
      });

      // Check if user is the requester
      const isRequester = changeRequest.User_ClientPartnerManagerChangeRequest_requestedByIdToUser.id === user.id;

      if (!proposedEmployee && !currentEmployee && !isRequester) {
        throw new AppError(
          403,
          'You are not authorized to view this request',
          ErrorCodes.FORBIDDEN
        );
      }
    }

    return NextResponse.json(successResponse(changeRequest));
  },
});
