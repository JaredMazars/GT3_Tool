import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { notificationService } from '@/lib/services/notifications/notificationService';
import {
  createPartnerManagerChangeRequestNotification,
  createPartnerManagerChangeInfoNotification,
  createChangeRequestApprovedNotification,
  createChangeRequestRejectedNotification,
} from '@/lib/services/notifications/templates';
import type { CreateChangeRequestInput, ResolveChangeRequestInput } from '@/lib/validation/schemas';

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ChangeType = 'PARTNER' | 'MANAGER';

export interface ChangeRequest {
  id: number;
  clientId: number;
  changeType: ChangeType;
  currentEmployeeCode: string;
  currentEmployeeName: string | null;
  proposedEmployeeCode: string;
  proposedEmployeeName: string | null;
  reason: string | null;
  status: ChangeRequestStatus;
  requestedById: string;
  requestedAt: Date;
  resolvedById: string | null;
  resolvedAt: Date | null;
  resolutionComment: string | null;
  Client?: {
    clientCode: string;
    clientNameFull: string | null;
    GSClientID: string;
  };
  RequestedBy?: {
    name: string | null;
  };
  ResolvedBy?: {
    name: string | null;
  };
}

/**
 * Create a new change request for client partner or manager
 */
export async function createChangeRequest(
  clientId: number,
  data: CreateChangeRequestInput,
  requestedById: string
): Promise<ChangeRequest> {
  try {
    // Fetch client details and validate
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        GSClientID: true,
        clientCode: true,
        clientNameFull: true,
        clientPartner: true,
        clientManager: true,
      },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Get current employee code based on change type
    const currentEmployeeCode =
      data.changeType === 'PARTNER' ? client.clientPartner : client.clientManager;

    // Validate that proposed employee is different from current
    if (data.proposedEmployeeCode === currentEmployeeCode) {
      throw new AppError(
        400,
        'Proposed employee is already the current ' + (data.changeType === 'PARTNER' ? 'partner' : 'manager'),
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate proposed employee exists and is active
    const proposedEmployee = await prisma.employee.findFirst({
      where: { EmpCode: data.proposedEmployeeCode },
      select: {
        EmpCode: true,
        EmpName: true,
        EmpCatCode: true,
        Active: true,
        WinLogon: true,
      },
    });

    if (!proposedEmployee || proposedEmployee.Active !== 'Yes') {
      throw new AppError(
        400,
        'Proposed employee is not active or does not exist',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate category code for partner changes
    if (data.changeType === 'PARTNER') {
      const validPartnerCodes = ['CARL', 'LOCAL', 'DIR'];
      if (!validPartnerCodes.includes(proposedEmployee.EmpCatCode)) {
        throw new AppError(
          400,
          `Client Partner must have category code CARL, LOCAL, or DIR. Selected employee has category code: ${proposedEmployee.EmpCatCode}`,
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    // Find proposed employee's user account
    const proposedUser = proposedEmployee.WinLogon
      ? await prisma.user.findFirst({
          where: { 
            email: proposedEmployee.WinLogon.toLowerCase(),
          },
          select: { id: true },
        })
      : null;

    if (!proposedUser) {
      throw new AppError(
        400,
        'Proposed employee does not have a user account',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check for duplicate pending request
    const existingPendingRequest = await prisma.clientPartnerManagerChangeRequest.findFirst({
      where: {
        clientId,
        changeType: data.changeType,
        status: 'PENDING',
      },
    });

    if (existingPendingRequest) {
      throw new AppError(
        400,
        'A pending change request already exists for this client and role',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Get current employee details
    const currentEmployee = await prisma.employee.findFirst({
      where: { EmpCode: currentEmployeeCode },
      select: {
        EmpCode: true,
        EmpName: true,
        WinLogon: true,
      },
    });

    // Find current employee's user account (optional - they might not have one)
    const currentUser = currentEmployee?.WinLogon
      ? await prisma.user.findFirst({
          where: { 
            email: currentEmployee.WinLogon.toLowerCase(),
          },
          select: { id: true },
        })
      : null;

    // Get requester details
    const requester = await prisma.user.findUnique({
      where: { id: requestedById },
      select: { name: true },
    });

    // Create the change request
    const changeRequest = await prisma.clientPartnerManagerChangeRequest.create({
      data: {
        clientId,
        changeType: data.changeType,
        currentEmployeeCode,
        currentEmployeeName: currentEmployee?.EmpName ?? null,
        proposedEmployeeCode: data.proposedEmployeeCode,
        proposedEmployeeName: proposedEmployee.EmpName,
        reason: data.reason ?? null,
        status: 'PENDING',
        requestedById,
      },
      include: {
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
            GSClientID: true,
          },
        },
        RequestedBy: {
          select: { name: true },
        },
      },
    });

    // Send notifications
    // 1. To proposed employee (actionable)
    const proposedNotification = createPartnerManagerChangeRequestNotification(
      data.changeType,
      client.clientNameFull || client.clientCode,
      client.clientCode,
      requester?.name || 'A user',
      data.reason ?? null,
      changeRequest.id
    );

    await notificationService.createNotification(
      proposedUser.id,
      'PARTNER_MANAGER_CHANGE_REQUEST',
      proposedNotification.title,
      proposedNotification.message,
      undefined, // taskId
      proposedNotification.actionUrl,
      requestedById
    );

    // 2. To current employee (informational) - only if they have a user account
    if (currentEmployee && currentUser) {
      const currentNotification = createPartnerManagerChangeInfoNotification(
        data.changeType,
        client.clientNameFull || client.clientCode,
        client.clientCode,
        requester?.name || 'A user',
        proposedEmployee.EmpName
      );

      await notificationService.createNotification(
        currentUser.id,
        'PARTNER_MANAGER_CHANGE_INFO',
        currentNotification.title,
        currentNotification.message,
        undefined, // taskId
        currentNotification.actionUrl,
        requestedById
      );
    }

    logger.info('Change request created', {
      requestId: changeRequest.id,
      clientId,
      changeType: data.changeType,
      requestedById,
    });

    return changeRequest as ChangeRequest;
  } catch (error) {
    logger.error('Failed to create change request', error);
    throw error;
  }
}

/**
 * Get change requests for a client
 */
export async function getChangeRequests(
  clientId: number,
  filters?: {
    status?: ChangeRequestStatus;
    page?: number;
    limit?: number;
  }
): Promise<{ requests: ChangeRequest[]; total: number }> {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: { clientId: number; status?: ChangeRequestStatus } = { clientId };
  if (filters?.status) {
    where.status = filters.status;
  }

  const [requests, total] = await Promise.all([
    prisma.clientPartnerManagerChangeRequest.findMany({
      where,
      include: {
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
            GSClientID: true,
          },
        },
        RequestedBy: {
          select: { name: true },
        },
        ResolvedBy: {
          select: { name: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.clientPartnerManagerChangeRequest.count({ where }),
  ]);

  return { requests: requests as ChangeRequest[], total };
}

/**
 * Approve a change request
 */
export async function approveChangeRequest(
  requestId: number,
  userId: string,
  data?: ResolveChangeRequestInput
): Promise<ChangeRequest> {
  try {
    // Fetch the request with all details
    const request = await prisma.clientPartnerManagerChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        Client: {
          select: {
            id: true,
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
            clientPartner: true,
            clientManager: true,
          },
        },
        RequestedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!request) {
      throw new AppError(404, 'Change request not found', ErrorCodes.NOT_FOUND);
    }

    if (request.status !== 'PENDING') {
      throw new AppError(
        400,
        'Change request has already been resolved',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Verify authorization - user must be the proposed employee or SYSTEM_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    });

    const employee = await prisma.employee.findFirst({
      where: {
        EmpCode: request.proposedEmployeeCode,
        WinLogon: user?.email,
      },
    });

    if (!employee && user?.role !== 'SYSTEM_ADMIN') {
      throw new AppError(
        403,
        'You are not authorized to approve this request',
        ErrorCodes.FORBIDDEN
      );
    }

    // Update request and client in a transaction
    const [updatedRequest] = await prisma.$transaction([
      prisma.clientPartnerManagerChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          resolvedById: userId,
          resolvedAt: new Date(),
          resolutionComment: data?.comment ?? null,
        },
        include: {
          Client: {
            select: {
              clientCode: true,
              clientNameFull: true,
              GSClientID: true,
            },
          },
          RequestedBy: {
            select: { name: true },
          },
          ResolvedBy: {
            select: { name: true },
          },
        },
      }),
      prisma.client.update({
        where: { id: request.Client.id },
        data:
          request.changeType === 'PARTNER'
            ? { clientPartner: request.proposedEmployeeCode }
            : { clientManager: request.proposedEmployeeCode },
      }),
    ]);

    // Send notification to requester
    const approvalNotification = createChangeRequestApprovedNotification(
      request.changeType as ChangeType,
      request.Client.clientNameFull || request.Client.clientCode,
      request.Client.clientCode,
      user?.name || 'A user',
      request.Client.GSClientID
    );

    await notificationService.createNotification(
      request.RequestedBy.id,
      'CHANGE_REQUEST_APPROVED',
      approvalNotification.title,
      approvalNotification.message,
      undefined, // taskId
      approvalNotification.actionUrl ?? undefined,
      userId
    );

    // Send notification to previous partner/manager if they have a user account
    const previousEmployee = await prisma.employee.findFirst({
      where: { EmpCode: request.currentEmployeeCode },
      select: {
        EmpCode: true,
        WinLogon: true,
      },
    });

    const previousUser = previousEmployee?.WinLogon
      ? await prisma.user.findFirst({
          where: { 
            email: previousEmployee.WinLogon.toLowerCase(),
          },
          select: { id: true },
        })
      : null;

    if (previousUser) {
      const roleLabel = request.changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';
      await notificationService.createNotification(
        previousUser.id,
        'PARTNER_MANAGER_CHANGE_COMPLETED',
        `${roleLabel} Change Completed`,
        `You have been replaced as ${roleLabel} for ${request.Client.clientNameFull || request.Client.clientCode} (${request.Client.clientCode}). The new ${roleLabel.toLowerCase()} is ${request.proposedEmployeeName}.`,
        undefined, // taskId
        undefined, // actionUrl
        userId
      );
    }

    logger.info('Change request approved', {
      requestId,
      clientId: request.clientId,
      changeType: request.changeType,
      approvedBy: userId,
    });

    return updatedRequest as ChangeRequest;
  } catch (error) {
    logger.error('Failed to approve change request', error);
    throw error;
  }
}

/**
 * Reject a change request
 */
export async function rejectChangeRequest(
  requestId: number,
  userId: string,
  data?: ResolveChangeRequestInput
): Promise<ChangeRequest> {
  try {
    // Fetch the request with all details
    const request = await prisma.clientPartnerManagerChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
          },
        },
        RequestedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!request) {
      throw new AppError(404, 'Change request not found', ErrorCodes.NOT_FOUND);
    }

    if (request.status !== 'PENDING') {
      throw new AppError(
        400,
        'Change request has already been resolved',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Verify authorization - user must be the proposed employee or SYSTEM_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    });

    const employee = await prisma.employee.findFirst({
      where: {
        EmpCode: request.proposedEmployeeCode,
        WinLogon: user?.email,
      },
    });

    if (!employee && user?.role !== 'SYSTEM_ADMIN') {
      throw new AppError(
        403,
        'You are not authorized to reject this request',
        ErrorCodes.FORBIDDEN
      );
    }

    // Update request
    const updatedRequest = await prisma.clientPartnerManagerChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        resolvedById: userId,
        resolvedAt: new Date(),
        resolutionComment: data?.comment ?? null,
      },
      include: {
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
            GSClientID: true,
          },
        },
        RequestedBy: {
          select: { name: true },
        },
        ResolvedBy: {
          select: { name: true },
        },
      },
    });

    // Send notification to requester
    const rejectionNotification = createChangeRequestRejectedNotification(
      request.changeType as ChangeType,
      request.Client.clientNameFull || request.Client.clientCode,
      request.Client.clientCode,
      user?.name || 'A user',
      data?.comment ?? null
    );

    await notificationService.createNotification(
      request.RequestedBy.id,
      'CHANGE_REQUEST_REJECTED',
      rejectionNotification.title,
      rejectionNotification.message,
      undefined, // taskId
      rejectionNotification.actionUrl ?? undefined,
      userId
    );

    logger.info('Change request rejected', {
      requestId,
      clientId: request.clientId,
      changeType: request.changeType,
      rejectedBy: userId,
    });

    return updatedRequest as ChangeRequest;
  } catch (error) {
    logger.error('Failed to reject change request', error);
    throw error;
  }
}
