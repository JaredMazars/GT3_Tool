/**
 * Service Line Service
 * Handles service line access control and operations
 */

import { prisma } from '@/lib/db/prisma';
import { ServiceLine, ServiceLineRole } from '@/types';
import { ServiceLineWithStats } from '@/types/dto';
import { logger } from '@/lib/utils/logger';

/**
 * Get all service lines accessible to a user with their roles
 */
export async function getUserServiceLines(userId: string): Promise<ServiceLineWithStats[]> {
  try {
    // Check if user is a SYSTEM_ADMIN - they get access to all service lines
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

    if (isSystemAdmin) {
      // SYSTEM_ADMIN gets access to all service lines with ADMINISTRATOR role
      const allServiceLines = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR'];
      
      // Get project counts for all service lines
      const [allProjectCounts, activeProjectCounts] = await Promise.all([
        prisma.project.groupBy({
          by: ['serviceLine'],
          _count: {
            id: true,
          },
        }),
        prisma.project.groupBy({
          by: ['serviceLine'],
          where: {
            status: 'ACTIVE',
            archived: false,
          },
          _count: {
            id: true,
          },
        }),
      ]);

      // Create lookup maps for fast access
      const projectCountMap = new Map(
        allProjectCounts.map(item => [item.serviceLine, item._count.id])
      );
      const activeProjectCountMap = new Map(
        activeProjectCounts.map(item => [item.serviceLine, item._count.id])
      );

      // Return all service lines with ADMINISTRATOR role for SYSTEM_ADMIN
      return allServiceLines.map((sl, index) => ({
        id: -(index + 1), // Use negative IDs for virtual service line access
        serviceLine: sl,
        role: 'ADMINISTRATOR',
        projectCount: projectCountMap.get(sl) || 0,
        activeProjectCount: activeProjectCountMap.get(sl) || 0,
      }));
    }

    // For regular users, get their explicit service line assignments
    const serviceLineUsers = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: {
        id: true,
        serviceLine: true,
        role: true,
      },
    });

    if (serviceLineUsers.length === 0) {
      return [];
    }

    // Get all service lines this user has access to
    const serviceLines = serviceLineUsers.map(slu => slu.serviceLine);

    // Use a single aggregation query to get project counts for all service lines
    const [allProjectCounts, activeProjectCounts] = await Promise.all([
      prisma.project.groupBy({
        by: ['serviceLine'],
        where: {
          serviceLine: { in: serviceLines },
        },
        _count: {
          id: true,
        },
      }),
      prisma.project.groupBy({
        by: ['serviceLine'],
        where: {
          serviceLine: { in: serviceLines },
          status: 'ACTIVE',
          archived: false,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Create lookup maps for fast access
    const projectCountMap = new Map(
      allProjectCounts.map(item => [item.serviceLine, item._count.id])
    );
    const activeProjectCountMap = new Map(
      activeProjectCounts.map(item => [item.serviceLine, item._count.id])
    );

    // Combine service line data with counts
    return serviceLineUsers.map(slu => ({
      id: slu.id,
      serviceLine: slu.serviceLine,
      role: slu.role,
      projectCount: projectCountMap.get(slu.serviceLine) || 0,
      activeProjectCount: activeProjectCountMap.get(slu.serviceLine) || 0,
    }));
  } catch (error) {
    logger.error('Error getting user service lines', { userId, error });
    throw error;
  }
}

/**
 * Check if a user has access to a service line
 */
export async function checkServiceLineAccess(
  userId: string,
  serviceLine: ServiceLine | string,
  requiredRole?: ServiceLineRole | string
): Promise<boolean> {
  try {
    // Check if user is a SYSTEM_ADMIN - they have access to all service lines with ADMINISTRATOR role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SYSTEM_ADMIN') {
      return true; // SYSTEM_ADMIN has access to everything
    }

    const serviceLineUser = await prisma.serviceLineUser.findUnique({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine: serviceLine as string,
        },
      },
    });

    if (!serviceLineUser) {
      return false;
    }

    // If no specific role required, just check access
    if (!requiredRole) {
      return true;
    }

    // Check role hierarchy using centralized utility
    const { hasServiceLineRole } = await import('@/lib/utils/roleHierarchy');
    return hasServiceLineRole(serviceLineUser.role, requiredRole as string);
  } catch (error) {
    logger.error('Error checking service line access', { userId, serviceLine, error });
    return false;
  }
}

/**
 * Get user's role in a service line
 */
export async function getServiceLineRole(
  userId: string,
  serviceLine: ServiceLine | string
): Promise<ServiceLineRole | string | null> {
  try {
    // Check if user is a SYSTEM_ADMIN - they have ADMINISTRATOR role in all service lines
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SYSTEM_ADMIN') {
      return 'ADMINISTRATOR';
    }

    const serviceLineUser = await prisma.serviceLineUser.findUnique({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine: serviceLine as string,
        },
      },
      select: {
        role: true,
      },
    });

    return serviceLineUser?.role || null;
  } catch (error) {
    logger.error('Error getting service line role', { userId, serviceLine, error });
    return null;
  }
}

/**
 * Grant user access to a service line
 */
export async function grantServiceLineAccess(
  userId: string,
  serviceLine: ServiceLine | string,
  role: ServiceLineRole | string = ServiceLineRole.USER
): Promise<void> {
  try {
    await prisma.serviceLineUser.upsert({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine: serviceLine as string,
        },
      },
      update: {
        role: role as string,
        updatedAt: new Date(),
      },
      create: {
        userId,
        serviceLine: serviceLine as string,
        role: role as string,
      },
    });

    logger.info('Granted service line access', { userId, serviceLine, role });
  } catch (error) {
    logger.error('Error granting service line access', { userId, serviceLine, role, error });
    throw error;
  }
}

/**
 * Revoke user access to a service line
 */
export async function revokeServiceLineAccess(
  userId: string,
  serviceLine: ServiceLine | string
): Promise<void> {
  try {
    await prisma.serviceLineUser.delete({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine: serviceLine as string,
        },
      },
    });

    logger.info('Revoked service line access', { userId, serviceLine });
  } catch (error) {
    logger.error('Error revoking service line access', { userId, serviceLine, error });
    throw error;
  }
}

/**
 * Update user's role in a service line
 */
export async function updateServiceLineRole(
  userId: string,
  serviceLine: ServiceLine | string,
  role: ServiceLineRole | string
): Promise<void> {
  try {
    await prisma.serviceLineUser.update({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine: serviceLine as string,
        },
      },
      data: {
        role: role as string,
        updatedAt: new Date(),
      },
    });

    logger.info('Updated service line role', { userId, serviceLine, role });
  } catch (error) {
    logger.error('Error updating service line role', { userId, serviceLine, role, error });
    throw error;
  }
}

/**
 * Get all users with access to a service line
 */
export async function getServiceLineUsers(serviceLine: ServiceLine | string) {
  try {
    const users = await prisma.serviceLineUser.findMany({
      where: {
        serviceLine: serviceLine as string,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  } catch (error) {
    logger.error('Error getting service line users', { serviceLine, error });
    throw error;
  }
}

/**
 * Get service line statistics
 */
export async function getServiceLineStats(serviceLine: ServiceLine | string) {
  try {
    const [
      totalProjects,
      activeProjects,
      archivedProjects,
      totalUsers,
      recentProjects,
    ] = await Promise.all([
      prisma.project.count({
        where: { serviceLine: serviceLine as string },
      }),
      prisma.project.count({
        where: { 
          serviceLine: serviceLine as string, 
          status: 'ACTIVE',
          archived: false,
        },
      }),
      prisma.project.count({
        where: { 
          serviceLine: serviceLine as string, 
          archived: true,
        },
      }),
      prisma.serviceLineUser.count({
        where: { serviceLine: serviceLine as string },
      }),
      prisma.project.findMany({
        where: { serviceLine: serviceLine as string },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          projectType: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalProjects,
      activeProjects,
      archivedProjects,
      totalUsers,
      recentProjects,
    };
  } catch (error) {
    logger.error('Error getting service line stats', { serviceLine, error });
    throw error;
  }
}
