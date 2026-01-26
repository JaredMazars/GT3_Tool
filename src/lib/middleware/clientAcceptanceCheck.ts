/**
 * Client Acceptance Middleware
 * Enforcement checks for client acceptance requirements
 */

import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { isClientAcceptanceValid } from '@/lib/services/acceptance/clientAcceptanceService';

/**
 * Check if client has valid acceptance before allowing task creation
 * Throws error if client acceptance is missing or invalid
 */
export async function enforceClientAcceptanceForTaskCreation(
  clientId: number
): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      clientCode: true,
      clientNameFull: true,
    },
  });

  if (!client) {
    throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
  }

  const hasValidAcceptance = await isClientAcceptanceValid(clientId);

  if (!hasValidAcceptance) {
    throw new AppError(
      403,
      `Client Acceptance required before creating tasks for ${client.clientNameFull || client.clientCode}. Please complete the Client Acceptance assessment first.`,
      ErrorCodes.FORBIDDEN,
      { clientId, clientCode: client.clientCode }
    );
  }
}

/**
 * Check if client has valid acceptance for task access
 * Returns validation result without throwing
 */
export async function checkClientAcceptanceForTaskAccess(
  clientId: number
): Promise<{
  isValid: boolean;
  message: string | null;
  clientAcceptanceUrl: string | null;
}> {
  const hasValidAcceptance = await isClientAcceptanceValid(clientId);

  if (!hasValidAcceptance) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, clientCode: true, clientNameFull: true, groupCode: true },
    });

    return {
      isValid: false,
      message: `Client Acceptance is required for this client before proceeding with engagement work. Please complete the assessment first.`,
      clientAcceptanceUrl: client ? `/dashboard/clients/${client.groupCode}/${client.id}` : null,
    };
  }

  return {
    isValid: true,
    message: null,
    clientAcceptanceUrl: null,
  };
}

/**
 * Check if engagement acceptance can proceed (requires client acceptance first)
 */
export async function enforceClientAcceptanceForEngagementAcceptance(
  clientId: number
): Promise<void> {
  const hasValidAcceptance = await isClientAcceptanceValid(clientId);

  if (!hasValidAcceptance) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { clientCode: true, clientNameFull: true },
    });

    throw new AppError(
      403,
      `Client Acceptance must be completed and approved before Engagement Acceptance can proceed for ${client?.clientNameFull || client?.clientCode || 'this client'}.`,
      ErrorCodes.FORBIDDEN,
      { clientId }
    );
  }
}
