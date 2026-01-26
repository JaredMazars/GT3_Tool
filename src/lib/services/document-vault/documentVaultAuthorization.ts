/**
 * Document Vault Authorization Service
 * Handles authorization checks for vault document operations
 */

import { prisma } from '@/lib/db/prisma';
import { SystemRole } from '@/types';
import type { VaultDocumentScope } from '@/types/documentVault';

/**
 * Check if a user can manage vault documents
 * System Admin: Can manage all documents
 * Service Line Manager+: Can manage documents for their service line
 * 
 * @param userId - User ID to check
 * @param serviceLine - Optional service line code to check (for service line scoped documents)
 * @returns true if user has management permissions
 */
export async function canManageVaultDocuments(
  userId: string,
  serviceLine?: string
): Promise<boolean> {
  try {
    // Get user's system role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN can manage all documents
    if (user.role === SystemRole.SYSTEM_ADMIN) {
      return true;
    }

    // If checking for a specific service line, verify user is MANAGER+ for that master service line
    if (serviceLine) {
      const serviceLineAssignment = await prisma.serviceLineUser.findFirst({
        where: {
          userId,
          masterCode: serviceLine,
          role: { in: ['ADMINISTRATOR', 'PARTNER', 'MANAGER'] },
        },
      });

      return !!serviceLineAssignment;
    }

    // Check if user is MANAGER+ for any service line
    const hasManagerPlusRole = await prisma.serviceLineUser.findFirst({
      where: {
        userId,
        role: { in: ['ADMINISTRATOR', 'PARTNER', 'MANAGER'] },
      },
    });

    return !!hasManagerPlusRole;
  } catch (error) {
    console.error('Error checking vault document management permission:', error);
    return false;
  }
}

/**
 * Check if a user can view a specific document
 * - Global documents: All authenticated users can view
 * - Service Line documents: Users with access to that service line can view
 * 
 * @param userId - User ID to check
 * @param document - Document to check access for
 * @returns true if user can view the document
 */
export async function canViewDocument(
  userId: string,
  document: {
    scope: VaultDocumentScope;
    serviceLine: string | null;
  }
): Promise<boolean> {
  try {
    // Global documents are accessible to all authenticated users
    if (document.scope === 'GLOBAL') {
      return true;
    }

    // Service line scoped documents require service line access
    if (document.scope === 'SERVICE_LINE' && document.serviceLine) {
      // Check if user is SYSTEM_ADMIN
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role === SystemRole.SYSTEM_ADMIN) {
        return true;
      }

      // Check if user has access to this master service line
      const serviceLineAccess = await prisma.serviceLineUser.findFirst({
        where: {
          userId,
          masterCode: document.serviceLine,
        },
      });

      return !!serviceLineAccess;
    }

    return false;
  } catch (error) {
    console.error('Error checking document view permission:', error);
    return false;
  }
}

/**
 * Check if a user can archive a specific document
 * Same rules as canManageVaultDocuments, but scoped to the document's service line
 * 
 * @param userId - User ID to check
 * @param document - Document to check
 * @returns true if user can archive the document
 */
export async function canArchiveDocument(
  userId: string,
  document: {
    scope: VaultDocumentScope;
    serviceLine: string | null;
  }
): Promise<boolean> {
  try {
    // Get user's system role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN can archive all documents
    if (user.role === SystemRole.SYSTEM_ADMIN) {
      return true;
    }

    // For service line scoped documents, check if user is MANAGER+ for that master service line
    if (document.scope === 'SERVICE_LINE' && document.serviceLine) {
      const serviceLineAssignment = await prisma.serviceLineUser.findFirst({
        where: {
          userId,
          masterCode: document.serviceLine,
          role: { in: ['ADMINISTRATOR', 'PARTNER', 'MANAGER'] },
        },
      });

      return !!serviceLineAssignment;
    }

    // For global documents, only system admin can archive
    return false;
  } catch (error) {
    console.error('Error checking document archive permission:', error);
    return false;
  }
}

/**
 * Get list of service lines where user has admin access (MANAGER+)
 * Used to filter documents that user can manage
 * 
 * @param userId - User ID
 * @returns Array of master service line codes (TAX, AUDIT, etc.)
 */
export async function getUserAdminServiceLines(
  userId: string
): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // SYSTEM_ADMIN has access to all service lines
    if (user?.role === SystemRole.SYSTEM_ADMIN) {
      const allServiceLines = await prisma.serviceLineMaster.findMany({
        where: { active: true },
        select: { code: true },
      });
      return allServiceLines.map(sl => sl.code);
    }

    // Get master service lines where user is MANAGER+
    const adminServiceLines = await prisma.serviceLineUser.findMany({
      where: {
        userId,
        role: { in: ['ADMINISTRATOR', 'PARTNER', 'MANAGER'] },
      },
      select: { masterCode: true },
      distinct: ['masterCode'],
    });

    // Return master codes, filtering out nulls
    return adminServiceLines
      .map(sl => sl.masterCode)
      .filter((code): code is string => code !== null);
  } catch (error) {
    console.error('Error getting user admin service lines:', error);
    return [];
  }
}

/**
 * Get list of service lines user has access to (any role)
 * Used to filter documents user can view
 * 
 * @param userId - User ID
 * @returns Array of master service line codes (TAX, AUDIT, etc.)
 */
export async function getUserAccessibleServiceLines(
  userId: string
): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // SYSTEM_ADMIN has access to all service lines
    if (user?.role === SystemRole.SYSTEM_ADMIN) {
      const allServiceLines = await prisma.serviceLineMaster.findMany({
        where: { active: true },
        select: { code: true },
      });
      return allServiceLines.map(sl => sl.code);
    }

    // Get master service lines where user has any assignment
    const serviceLineAssignments = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: { masterCode: true },
      distinct: ['masterCode'],
    });

    // Return master codes (TAX, AUDIT, etc.), filtering out nulls
    return serviceLineAssignments
      .map(sl => sl.masterCode)
      .filter((code): code is string => code !== null);
  } catch (error) {
    console.error('Error getting user accessible service lines:', error);
    return [];
  }
}
