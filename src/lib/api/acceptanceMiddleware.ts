/**
 * Authorization middleware for acceptance and continuance module
 * Validates user access to projects and questionnaires
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

export type ProjectRole = 'VIEWER' | 'USER' | 'MANAGER' | 'ADMIN';

/**
 * Validate that a user has access to a project
 * Returns true if user has access (either through project membership or SUPERUSER role)
 */
export async function validateAcceptanceAccess(
  projectId: number,
  userId: string,
  requiredRole?: ProjectRole
): Promise<boolean> {
  try {
    // Check if user has access to project
    const access = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId,
      },
      select: {
        role: true,
        Project: {
          select: {
            serviceLine: true,
          },
        },
      },
    });

    if (!access) {
      // Check if user is SUPERUSER
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'SUPERUSER') {
        logger.warn('User access denied', {
          userId,
          projectId,
          reason: 'No project membership and not SUPERUSER',
        });
        return false;
      }

      // SUPERUSER has access
      return true;
    }

    // Check role if specified
    if (requiredRole) {
      const roleHierarchy: Record<ProjectRole, number> = {
        VIEWER: 0,
        USER: 1,
        MANAGER: 2,
        ADMIN: 3,
      };

      const userRoleLevel = roleHierarchy[access.role as ProjectRole] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        logger.warn('User role insufficient', {
          userId,
          projectId,
          userRole: access.role,
          requiredRole,
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error validating acceptance access', {
      error,
      userId,
      projectId,
    });
    return false;
  }
}

/**
 * Validate that a user can approve acceptance (Partner or SUPERUSER only)
 */
export async function canApproveAcceptanceValidation(
  projectId: number,
  userId: string
): Promise<boolean> {
  try {
    // Check if user is SUPERUSER
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SUPERUSER') {
      return true;
    }

    // Check if user is Partner (ADMIN role) for the project's service line
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { serviceLine: true },
    });

    if (!project) {
      return false;
    }

    const serviceLineAccess = await prisma.serviceLineUser.findUnique({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine: project.serviceLine,
        },
      },
      select: { role: true },
    });

    return serviceLineAccess?.role === 'ADMIN';
  } catch (error) {
    logger.error('Error checking approval permission', {
      error,
      userId,
      projectId,
    });
    return false;
  }
}

/**
 * Validate document access
 * Checks that the document belongs to a questionnaire response for a project the user can access
 */
export async function validateDocumentAccess(
  documentId: number,
  userId: string
): Promise<{ hasAccess: boolean; projectId?: number }> {
  try {
    const document = await prisma.acceptanceDocument.findUnique({
      where: { id: documentId },
      select: {
        Response: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!document) {
      return { hasAccess: false };
    }

    const projectId = document.Response.projectId;
    const hasAccess = await validateAcceptanceAccess(projectId, userId);

    return { hasAccess, projectId };
  } catch (error) {
    logger.error('Error validating document access', {
      error,
      userId,
      documentId,
    });
    return { hasAccess: false };
  }
}




