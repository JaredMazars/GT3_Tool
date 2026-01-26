/**
 * Partner Validation Service
 * Validates that a client's assigned partner is active and qualified
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

export interface PartnerValidationResult {
  isValid: boolean;
  partner?: {
    EmpCode: string;
    EmpNameFull: string;
    Active: string;
    EmpCatCode: string;
  };
  reason?: 'NO_PARTNER' | 'PARTNER_INACTIVE' | 'PARTNER_NOT_FOUND';
}

/**
 * Validate that a client's assigned partner is active
 * 
 * Checks:
 * 1. Client has a partner assigned (Client.clientPartner is not null/empty)
 * 2. Partner exists in Employee table
 * 3. Partner is active (Employee.Active = 'Yes')
 * 
 * @param clientId - Internal client ID
 * @returns Validation result with partner info and reason if invalid
 */
export async function validateClientPartner(
  clientId: number
): Promise<PartnerValidationResult> {
  try {
    // Get client with partner code
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        clientCode: true,
        clientNameFull: true,
        clientPartner: true,
      },
    });

    if (!client) {
      logger.warn('Client not found for partner validation', { clientId });
      return {
        isValid: false,
        reason: 'NO_PARTNER',
      };
    }

    // Check if client has a partner assigned
    if (!client.clientPartner || client.clientPartner.trim() === '') {
      logger.warn('Client has no partner assigned', {
        clientId,
        clientCode: client.clientCode,
      });
      return {
        isValid: false,
        reason: 'NO_PARTNER',
      };
    }

    // Look up partner in Employee table
    const partner = await prisma.employee.findFirst({
      where: {
        EmpCode: client.clientPartner.trim(),
      },
      select: {
        EmpCode: true,
        EmpNameFull: true,
        Active: true,
        EmpCatCode: true,
      },
    });

    if (!partner) {
      logger.warn('Partner employee not found', {
        clientId,
        clientCode: client.clientCode,
        partnerCode: client.clientPartner,
      });
      return {
        isValid: false,
        reason: 'PARTNER_NOT_FOUND',
      };
    }

    // Check if partner is active
    if (partner.Active !== 'Yes') {
      logger.warn('Partner is not active', {
        clientId,
        clientCode: client.clientCode,
        partnerCode: partner.EmpCode,
        partnerName: partner.EmpNameFull,
        status: partner.Active,
      });
      return {
        isValid: false,
        partner,
        reason: 'PARTNER_INACTIVE',
      };
    }

    // Check if partner has correct category code (CARL, LOCAL, or DIR)
    if (!['CARL', 'LOCAL', 'DIR'].includes(partner.EmpCatCode)) {
      logger.warn('Partner does not have appropriate category', {
        clientId,
        clientCode: client.clientCode,
        partnerCode: partner.EmpCode,
        partnerName: partner.EmpNameFull,
        categoryCode: partner.EmpCatCode,
      });
      return {
        isValid: false,
        partner,
        reason: 'PARTNER_INACTIVE', // Use same reason code since UI handles it similarly
      };
    }

    // Partner is valid
    logger.info('Partner validation successful', {
      clientId,
      clientCode: client.clientCode,
      partnerCode: partner.EmpCode,
      partnerName: partner.EmpNameFull,
      categoryCode: partner.EmpCatCode,
    });

    return {
      isValid: true,
      partner,
    };
  } catch (error) {
    logger.error('Error validating client partner', { clientId, error });
    throw error;
  }
}

/**
 * Get user ID for a client's partner (for approval routing)
 * 
 * @param clientId - Internal client ID
 * @returns User ID if found, null otherwise
 */
export async function getClientPartnerUserId(
  clientId: number
): Promise<string | null> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { clientPartner: true },
    });

    if (!client?.clientPartner) {
      return null;
    }

    // Find user by employee code (must be active partner with correct category)
    const employee = await prisma.employee.findFirst({
      where: {
        EmpCode: client.clientPartner.trim(),
        Active: 'Yes',
        EmpCatCode: { in: ['CARL', 'LOCAL', 'DIR'] }, // Must be a partner
      },
      select: {
        WinLogon: true,
      },
    });

    if (!employee?.WinLogon) {
      return null;
    }

    // Find user by email (WinLogon is the email)
    const user = await prisma.user.findFirst({
      where: {
        email: employee.WinLogon,
      },
      select: {
        id: true,
      },
    });

    return user?.id || null;
  } catch (error) {
    logger.error('Error getting client partner user ID', { clientId, error });
    return null;
  }
}
