/**
 * Service Line Service
 * Handles service line access control and operations with sub-service line group support
 */

import { prisma } from '@/lib/db/prisma';
import { ServiceLine, ServiceLineRole } from '@/types';
import { ServiceLineWithStats } from '@/types/dto';
import { logger } from '@/lib/utils/logger';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getSubServiceLineGroupsByMaster, getServLineCodesBySubGroup } from '@/lib/utils/serviceLineExternal';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

export type AssignmentType = 'MAIN_SERVICE_LINE' | 'SPECIFIC_SUBGROUP' | 'NONE';

/**
 * Get all service lines accessible to a user with their roles
 * Now groups sub-service line groups by master code
 * Results are cached for 10 minutes to improve login/dashboard performance
 */
export async function getUserServiceLines(userId: string): Promise<ServiceLineWithStats[]> {
  try {
    // Check cache first for performance
    const cacheKey = `${CACHE_PREFIXES.SERVICE_LINE}user:${userId}`;
    const cached = await cache.get<ServiceLineWithStats[]>(cacheKey);
    if (cached) {
      logger.info('Service lines cache hit', { userId });
      return cached;
    }

    // Fetch service line names and descriptions from ServiceLineMaster
    const serviceLineMasters = await prisma.serviceLineMaster.findMany({
      where: { active: true },
      select: {
        code: true,
        name: true,
        description: true,
      },
    });

    // Create maps for O(1) name and description lookups
    const nameMap = new Map<string, string>();
    const descriptionMap = new Map<string, string | null>();
    for (const master of serviceLineMasters) {
      nameMap.set(master.code, master.name);
      descriptionMap.set(master.code, master.description);
    }

    // Check if user is a SYSTEM_ADMIN - they get access to all service lines
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

    if (isSystemAdmin) {
      // SYSTEM_ADMIN gets access to all service lines with ADMINISTRATOR role
      const allServiceLines = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT'];
      
      // Map master codes to actual ServLineCodes from ServiceLineExternal
      const serviceLineMapping = await prisma.serviceLineExternal.findMany({
        where: {
          masterCode: { in: allServiceLines },
        },
        select: {
          ServLineCode: true,
          masterCode: true,
        },
      });

      // Create map of masterCode -> [ServLineCodes]
      const masterToServLineCodesMap = new Map<string, string[]>();
      for (const mapping of serviceLineMapping) {
        if (mapping.masterCode && mapping.ServLineCode) {
          const existing = masterToServLineCodesMap.get(mapping.masterCode) || [];
          existing.push(mapping.ServLineCode);
          masterToServLineCodesMap.set(mapping.masterCode, existing);
        }
      }

      // Get all actual ServLineCodes for querying tasks
      const allServLineCodes = Array.from(
        new Set(serviceLineMapping.map(m => m.ServLineCode).filter((code): code is string => code !== null))
      );
      
      // Get task counts for all service lines
      const [allTaskCounts, activeTaskCounts] = await Promise.all([
        prisma.task.groupBy({
          by: ['ServLineCode'],
          where: allServLineCodes.length > 0 ? { ServLineCode: { in: allServLineCodes } } : undefined,
          _count: true,
        }),
        prisma.task.groupBy({
          by: ['ServLineCode'],
          where: allServLineCodes.length > 0 ? {
            ServLineCode: { in: allServLineCodes },
            Active: 'Yes',
          } : { Active: 'Yes' },
          _count: true,
        }),
      ]);

      // Create lookup maps: ServLineCode -> count
      const taskCountMap = new Map(
        allTaskCounts.map(item => [item.ServLineCode, item._count])
      );
      const activeTaskCountMap = new Map(
        activeTaskCounts.map(item => [item.ServLineCode, item._count])
      );

      // Return all service lines with ADMINISTRATOR role for SYSTEM_ADMIN
      // Get all sub-groups for SYSTEM_ADMIN
      const allSubGroupsPromises = allServiceLines.map(masterCode =>
        getSubServiceLineGroupsByMaster(masterCode)
      );
      const allSubGroupsArrays = await Promise.all(allSubGroupsPromises);
      
      const result = allServiceLines.map((sl, index) => {
        const servLineCodes = masterToServLineCodesMap.get(sl) || [];
        
        // Sum up counts for all ServLineCodes mapped to this master code
        const taskCount = servLineCodes.reduce(
          (sum, code) => sum + (taskCountMap.get(code) || 0),
          0
        );
        const activeTaskCount = servLineCodes.reduce(
          (sum, code) => sum + (activeTaskCountMap.get(code) || 0),
          0
        );
        
        // Get all sub-groups for this master code
        const subGroups = (allSubGroupsArrays[index] || []).map(sg => ({
          code: sg.code,
          description: sg.description,
        }));

        return {
          id: -(index + 1), // Use negative IDs for virtual service line access
          serviceLine: sl,
          role: 'ADMINISTRATOR',
          taskCount,
          activeTaskCount,
          name: nameMap.get(sl),
          description: descriptionMap.get(sl) || undefined,
          subGroups,
        };
      });

      // Cache result (10 minutes = 600 seconds)
      await cache.set(cacheKey, result, 600);
      logger.info('Service lines cached', { userId, count: result.length });

      return result;
    }

    // For regular users, get their sub-service line group assignments
    const subGroupAssignments = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: {
        id: true,
        subServiceLineGroup: true,
        role: true,
        assignmentType: true,
        parentAssignmentId: true,
      },
    });

    if (subGroupAssignments.length === 0) {
      return [];
    }

    // Get unique sub-service line groups
    const subGroupCodes = Array.from(new Set(subGroupAssignments.map(a => a.subServiceLineGroup)));

    // Map sub-groups to master codes
    // CRITICAL FIX: Filter out rows where masterCode is NULL to ensure proper mapping
    // NOTE: We need ALL mappings, not distinct, because sub-group codes can belong to multiple masters
    const subGroupMapping = await prisma.serviceLineExternal.findMany({
      where: {
        SubServlineGroupCode: { in: subGroupCodes },
        masterCode: { not: null }, // Only get rows with valid masterCode
      },
      select: {
        SubServlineGroupCode: true,
        masterCode: true,
        ServLineCode: true,
      },
    });

    // Create map: subGroup -> Set of masterCodes (one sub-group can map to multiple masters)
    const subGroupToMasterMap = new Map<string, Set<string>>();
    for (const mapping of subGroupMapping) {
      if (mapping.SubServlineGroupCode && mapping.masterCode) {
        if (!subGroupToMasterMap.has(mapping.SubServlineGroupCode)) {
          subGroupToMasterMap.set(mapping.SubServlineGroupCode, new Set());
        }
        subGroupToMasterMap.get(mapping.SubServlineGroupCode)!.add(mapping.masterCode);
      }
    }

    // Group assignments by master code
    const masterCodeAssignments = new Map<string, typeof subGroupAssignments>();
    for (const assignment of subGroupAssignments) {
      const masterCodes = subGroupToMasterMap.get(assignment.subServiceLineGroup);
      if (!masterCodes || masterCodes.size === 0) {
        logger.warn('Sub-group has no master mapping', { 
          subGroup: assignment.subServiceLineGroup 
        });
        continue; // Skip unmapped sub-groups
      }
      
      // Add this assignment to all master codes it belongs to
      for (const masterCode of masterCodes) {
        const existing = masterCodeAssignments.get(masterCode) || [];
        existing.push(assignment);
        masterCodeAssignments.set(masterCode, existing);
      }
    }

    // Get all ServLineCodes for task counting
    const allServLineCodes: string[] = [];
    for (const mapping of subGroupMapping) {
      if (mapping.ServLineCode) {
        allServLineCodes.push(mapping.ServLineCode);
      }
    }

    // Get task counts
    const [allTaskCounts, activeTaskCounts] = await Promise.all([
      allServLineCodes.length > 0 ? prisma.task.groupBy({
        by: ['ServLineCode'],
        where: {
          ServLineCode: { in: allServLineCodes },
        },
        _count: true,
      }) : Promise.resolve([]),
      allServLineCodes.length > 0 ? prisma.task.groupBy({
        by: ['ServLineCode'],
        where: {
          ServLineCode: { in: allServLineCodes },
          Active: 'Yes',
        },
        _count: true,
      }) : Promise.resolve([]),
    ]);

    // Create lookup maps
    const taskCountMap = new Map(
      allTaskCounts.map(item => [item.ServLineCode, item._count])
    );
    const activeTaskCountMap = new Map(
      activeTaskCounts.map(item => [item.ServLineCode, item._count])
    );

    // Batch fetch: Get all sub-groups for all master codes in parallel
    const masterCodes = Array.from(masterCodeAssignments.keys());
    const allSubGroupsArrays = await Promise.all(
      masterCodes.map(code => getSubServiceLineGroupsByMaster(code))
    );
    const masterToSubGroupsMap = new Map<string, Awaited<ReturnType<typeof getSubServiceLineGroupsByMaster>>>();
    masterCodes.forEach((code, index) => {
      masterToSubGroupsMap.set(code, allSubGroupsArrays[index] || []);
    });

    // Build a map of SubServlineGroupCode -> ServLineCode[] from existing subGroupMapping data
    const subGroupToServLineCodesMap = new Map<string, string[]>();
    for (const mapping of subGroupMapping) {
      if (mapping.SubServlineGroupCode && mapping.ServLineCode) {
        const existing = subGroupToServLineCodesMap.get(mapping.SubServlineGroupCode) || [];
        existing.push(mapping.ServLineCode);
        subGroupToServLineCodesMap.set(mapping.SubServlineGroupCode, existing);
      }
    }

    // Fetch additional ServLineCodes for sub-groups not in the initial mapping
    const allUserSubGroups = Array.from(new Set(subGroupAssignments.map(a => a.subServiceLineGroup)));
    const missingSubGroups = allUserSubGroups.filter(sg => !subGroupToServLineCodesMap.has(sg));
    
    if (missingSubGroups.length > 0) {
      const additionalMappings = await prisma.serviceLineExternal.findMany({
        where: { SubServlineGroupCode: { in: missingSubGroups } },
        select: { SubServlineGroupCode: true, ServLineCode: true },
      });
      for (const mapping of additionalMappings) {
        if (mapping.SubServlineGroupCode && mapping.ServLineCode) {
          const existing = subGroupToServLineCodesMap.get(mapping.SubServlineGroupCode) || [];
          existing.push(mapping.ServLineCode);
          subGroupToServLineCodesMap.set(mapping.SubServlineGroupCode, existing);
        }
      }
    }

    // Build result: one entry per master code (now using pre-fetched data)
    const result: ServiceLineWithStats[] = [];
    for (const [masterCode, assignments] of masterCodeAssignments) {
      if (assignments.length === 0) continue;
      
      // Use pre-fetched sub-groups
      const allSubGroupsForMaster = masterToSubGroupsMap.get(masterCode) || [];
      const userSubGroupCodes = new Set(assignments.map(a => a.subServiceLineGroup));
      
      // Filter to only user's accessible sub-groups
      const accessibleSubGroups = allSubGroupsForMaster.filter(sg => 
        userSubGroupCodes.has(sg.code)
      ).map(sg => ({
        code: sg.code,
        description: sg.description,
      }));

      // Determine role (use highest role if multiple sub-groups)
      const roles = assignments.map(a => a.role);
      const role = getHighestRole(roles);

      // Calculate task counts using pre-fetched ServLineCodes map
      let taskCount = 0;
      let activeTaskCount = 0;

      for (const assignment of assignments) {
        const servLineCodes = subGroupToServLineCodesMap.get(assignment.subServiceLineGroup) || [];
        for (const code of servLineCodes) {
          taskCount += taskCountMap.get(code) || 0;
          activeTaskCount += activeTaskCountMap.get(code) || 0;
        }
      }

      result.push({
        id: assignments[0]!.id,
        serviceLine: masterCode,
        role,
        taskCount,
        activeTaskCount,
        name: nameMap.get(masterCode),
        description: descriptionMap.get(masterCode) || undefined,
        subGroups: accessibleSubGroups,
      });
    }

    // Cache result (10 minutes = 600 seconds)
    await cache.set(cacheKey, result, 600);
    logger.info('Service lines cached', { userId, count: result.length });

    return result;
  } catch (error) {
    logger.error('Error getting user service lines', { userId, error });
    throw error;
  }
}

/**
 * Get all sub-service line groups accessible to a user
 * Returns array of sub-service-line group codes the user has access to
 */
export async function getUserSubServiceLineGroups(userId: string): Promise<string[]> {
  try {
    // Check if user is a SYSTEM_ADMIN - they get access to all sub-groups
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

    if (isSystemAdmin) {
      // SYSTEM_ADMIN gets access to all sub-service line groups
      const allSubGroups = await prisma.serviceLineExternal.findMany({
        where: {
          SubServlineGroupCode: { not: null },
        },
        select: {
          SubServlineGroupCode: true,
        },
        distinct: ['SubServlineGroupCode'],
      });

      return allSubGroups
        .map(sg => sg.SubServlineGroupCode)
        .filter((code): code is string => code !== null);
    }

    // For regular users, get their sub-service line group assignments
    const subGroupAssignments = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: {
        subServiceLineGroup: true,
      },
    });

    return Array.from(new Set(subGroupAssignments.map(a => a.subServiceLineGroup)));
  } catch (error) {
    logger.error('Error getting user sub-service line groups', { userId, error });
    throw error;
  }
}

/**
 * Get all ServLineCodes accessible to a user based on their sub-service line group assignments
 * Returns array of ServLineCodes the user can access
 */
export async function getUserAccessibleServLineCodes(userId: string): Promise<string[]> {
  try {
    // Get user's accessible sub-service line groups
    const userSubGroups = await getUserSubServiceLineGroups(userId);

    if (userSubGroups.length === 0) {
      return [];
    }

    // Map sub-groups to ServLineCodes
    const servLineMapping = await prisma.serviceLineExternal.findMany({
      where: {
        SubServlineGroupCode: { in: userSubGroups },
      },
      select: {
        ServLineCode: true,
      },
    });

    // Return unique ServLineCodes
    return Array.from(
      new Set(
        servLineMapping
          .map(m => m.ServLineCode)
          .filter((code): code is string => code !== null)
      )
    );
  } catch (error) {
    logger.error('Error getting user accessible ServLineCodes', { userId, error });
    throw error;
  }
}

/**
 * Get highest role from a list of roles based on hierarchy
 */
function getHighestRole(roles: string[]): string {
  const hierarchy = ['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER'];
  for (const role of hierarchy) {
    if (roles.includes(role)) {
      return role;
    }
  }
  return roles[0] || 'VIEWER';
}

/**
 * Check if a user has access to a specific sub-service line group
 */
export async function checkSubGroupAccess(
  userId: string,
  subGroupCode: string,
  requiredRole?: ServiceLineRole | string
): Promise<boolean> {
  try {
    // Check if user is a SYSTEM_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SYSTEM_ADMIN') {
      return true;
    }

    const assignment = await prisma.serviceLineUser.findFirst({
      where: {
        userId,
        subServiceLineGroup: subGroupCode,
      },
    });

    if (!assignment) {
      return false;
    }

    if (!requiredRole) {
      return true;
    }

    // Check role hierarchy
    const { hasServiceLineRole } = await import('@/lib/utils/roleHierarchy');
    return hasServiceLineRole(assignment.role, requiredRole as string);
  } catch (error) {
    logger.error('Error checking sub-group access', { userId, subGroupCode, error });
    return false;
  }
}

/**
 * Check if a user has access to a service line (checks if user has ANY sub-group in that service line)
 */
export async function checkServiceLineAccess(
  userId: string,
  serviceLine: ServiceLine | string,
  requiredRole?: ServiceLineRole | string
): Promise<boolean> {
  try {
    // Check if user is a SYSTEM_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SYSTEM_ADMIN') {
      return true;
    }

    // Get all sub-groups for this master code
    const subGroups = await getSubServiceLineGroupsByMaster(serviceLine as string);
    const subGroupCodes = subGroups.map(sg => sg.code);

    if (subGroupCodes.length === 0) {
      return false;
    }

    // Check if user has access to any sub-group
    const assignments = await prisma.serviceLineUser.findMany({
      where: {
        userId,
        subServiceLineGroup: { in: subGroupCodes },
      },
    });

    if (assignments.length === 0) {
      return false;
    }

    if (!requiredRole) {
      return true;
    }

    // Check if any assignment meets role requirement
    const { hasServiceLineRole } = await import('@/lib/utils/roleHierarchy');
    return assignments.some(a => hasServiceLineRole(a.role, requiredRole as string));
  } catch (error) {
    logger.error('Error checking service line access', { userId, serviceLine, error });
    return false;
  }
}

/**
 * Get user's role in a service line (returns highest role if user has multiple sub-groups)
 */
export async function getServiceLineRole(
  userId: string,
  serviceLine: ServiceLine | string
): Promise<ServiceLineRole | string | null> {
  try {
    // Check if user is a SYSTEM_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SYSTEM_ADMIN') {
      return 'ADMINISTRATOR';
    }

    // Get all sub-groups for this master code
    const subGroups = await getSubServiceLineGroupsByMaster(serviceLine as string);
    const subGroupCodes = subGroups.map(sg => sg.code);

    if (subGroupCodes.length === 0) {
      return null;
    }

    // Get user's assignments
    const assignments = await prisma.serviceLineUser.findMany({
      where: {
        userId,
        subServiceLineGroup: { in: subGroupCodes },
      },
      select: {
        role: true,
      },
    });

    if (assignments.length === 0) {
      return null;
    }

    // Return highest role
    return getHighestRole(assignments.map(a => a.role));
  } catch (error) {
    logger.error('Error getting service line role', { userId, serviceLine, error });
    return null;
  }
}

/**
 * Grant user access to a service line or specific sub-groups
 */
export async function grantServiceLineAccess(
  userId: string,
  serviceLineOrSubGroups: ServiceLine | string | string[],
  role: ServiceLineRole | string = ServiceLineRole.USER,
  type: 'main' | 'subgroup' = 'main'
): Promise<void> {
  try {
    if (type === 'main') {
      // Grant access to all sub-groups for the main service line
      const masterCode = serviceLineOrSubGroups as string;
      const subGroups = await getSubServiceLineGroupsByMaster(masterCode);

      if (subGroups.length === 0) {
        throw new AppError(
          400,
          `Service line ${masterCode} has no sub-groups configured in ServiceLineExternal`,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Generate a parent assignment ID within SQL Server INT range (max: 2,147,483,647)
      // Get the highest current parentAssignmentId and increment
      const maxParent = await prisma.serviceLineUser.findFirst({
        orderBy: { parentAssignmentId: 'desc' },
        select: { parentAssignmentId: true },
      });
      const parentId = (maxParent?.parentAssignmentId || 0) + 1;

      // Create/update records for all sub-groups
      await prisma.$transaction(async (tx) => {
        for (const sg of subGroups) {
          const existing = await tx.serviceLineUser.findFirst({
            where: {
              userId,
              subServiceLineGroup: sg.code,
              masterCode,
            },
          });

          if (existing) {
            await tx.serviceLineUser.update({
              where: { id: existing.id },
              data: {
                role: role as string,
                assignmentType: 'MAIN_SERVICE_LINE',
                parentAssignmentId: parentId,
              },
            });
          } else {
            await tx.serviceLineUser.create({
              data: {
                userId,
                subServiceLineGroup: sg.code,
                masterCode,
                role: role as string,
                assignmentType: 'MAIN_SERVICE_LINE',
                parentAssignmentId: parentId,
                updatedAt: new Date(),
              },
            });
          }
        }
      });

      logger.info('Granted main service line access', { userId, masterCode, role, subGroupCount: subGroups.length });
    } else {
      // Grant access to specific sub-groups
      const subGroupCodes = Array.isArray(serviceLineOrSubGroups) 
        ? serviceLineOrSubGroups 
        : [serviceLineOrSubGroups];

      // For each sub-group, get its master code(s) from ServiceLineExternal
      const mappings = await prisma.serviceLineExternal.findMany({
        where: {
          SubServlineGroupCode: { in: subGroupCodes },
          masterCode: { not: null },
        },
        select: {
          SubServlineGroupCode: true,
          masterCode: true,
        },
      });

      // Create assignments for each sub-group with its master code
      await prisma.$transaction(async (tx) => {
        for (const mapping of mappings) {
          const existing = await tx.serviceLineUser.findFirst({
            where: {
              userId,
              subServiceLineGroup: mapping.SubServlineGroupCode!,
              masterCode: mapping.masterCode!,
            },
          });

          if (existing) {
            await tx.serviceLineUser.update({
              where: { id: existing.id },
              data: {
                role: role as string,
                assignmentType: 'SPECIFIC_SUBGROUP',
                parentAssignmentId: null,
              },
            });
          } else {
            await tx.serviceLineUser.create({
              data: {
                userId,
                subServiceLineGroup: mapping.SubServlineGroupCode!,
                masterCode: mapping.masterCode,
                role: role as string,
                assignmentType: 'SPECIFIC_SUBGROUP',
                parentAssignmentId: null,
                updatedAt: new Date(),
              },
            });
          }
        }
      });

      logger.info('Granted specific sub-group access', { userId, subGroupCodes, role });
    }
  } catch (error) {
    logger.error('Error granting service line access', { userId, serviceLineOrSubGroups, role, type, error });
    throw error;
  }
}

/**
 * Revoke user access to a service line or specific sub-groups
 */
export async function revokeServiceLineAccess(
  userId: string,
  serviceLineOrSubGroups: ServiceLine | string | string[],
  type: 'main' | 'subgroup' = 'main'
): Promise<void> {
  try {
    if (type === 'main') {
      // Revoke access to all sub-groups for the main service line
      const masterCode = serviceLineOrSubGroups as string;
      const subGroups = await getSubServiceLineGroupsByMaster(masterCode);
      const subGroupCodes = subGroups.map(sg => sg.code);

      // Delete only assignments for this specific master code to avoid deleting shared sub-groups
      await prisma.serviceLineUser.deleteMany({
        where: {
          userId,
          masterCode,
          subServiceLineGroup: { in: subGroupCodes },
        },
      });

      logger.info('Revoked main service line access', { userId, masterCode, subGroupCount: subGroupCodes.length });
    } else {
      // Revoke access to specific sub-groups
      const subGroupCodes = Array.isArray(serviceLineOrSubGroups)
        ? serviceLineOrSubGroups
        : [serviceLineOrSubGroups];

      await prisma.serviceLineUser.deleteMany({
        where: {
          userId,
          subServiceLineGroup: { in: subGroupCodes },
        },
      });

      logger.info('Revoked specific sub-group access', { userId, subGroupCodes });
    }
  } catch (error) {
    logger.error('Error revoking service line access', { userId, serviceLineOrSubGroups, type, error });
    throw error;
  }
}

/**
 * Update user's role in a service line or sub-group
 */
export async function updateServiceLineRole(
  userId: string,
  serviceLineOrSubGroup: ServiceLine | string,
  role: ServiceLineRole | string,
  isSubGroup: boolean = false
): Promise<void> {
  try {
    if (isSubGroup) {
      // Update role for all assignments of this specific sub-group (across all master codes)
      await prisma.serviceLineUser.updateMany({
        where: {
          userId,
          subServiceLineGroup: serviceLineOrSubGroup as string,
        },
        data: {
          role: role as string,
        },
      });

      logger.info('Updated sub-group role', { userId, subGroup: serviceLineOrSubGroup, role });
    } else {
      // Update role for all sub-groups in the service line
      const subGroups = await getSubServiceLineGroupsByMaster(serviceLineOrSubGroup as string);
      const subGroupCodes = subGroups.map(sg => sg.code);

      // Update all assignments for this master code
      const masterCode = serviceLineOrSubGroup as string;
      await prisma.serviceLineUser.updateMany({
        where: {
          userId,
          masterCode,
          subServiceLineGroup: { in: subGroupCodes },
        },
        data: {
          role: role as string,
        },
      });

      logger.info('Updated service line role', { userId, masterCode, role, count: subGroupCodes.length });
    }
  } catch (error) {
    logger.error('Error updating service line role', { userId, serviceLineOrSubGroup, role, error });
    throw error;
  }
}

/**
 * Switch user's assignment type between main service line and specific sub-groups
 */
export async function switchAssignmentType(
  userId: string,
  masterCode: string,
  newType: 'main' | 'specific',
  specificSubGroups?: string[]
): Promise<void> {
  try {
    if (newType === 'main') {
      // Delete existing assignments and create main service line assignment
      const existingAssignments = await prisma.serviceLineUser.findMany({
        where: {
          userId,
          subServiceLineGroup: {
            in: (await getSubServiceLineGroupsByMaster(masterCode)).map(sg => sg.code),
          },
        },
        select: { role: true },
      });

      const role = existingAssignments.length > 0 ? getHighestRole(existingAssignments.map(a => a.role)) : 'USER';

      // Delete all current assignments
      await revokeServiceLineAccess(userId, masterCode, 'main');

      // Create main service line assignment
      await grantServiceLineAccess(userId, masterCode, role, 'main');

      logger.info('Switched to main service line assignment', { userId, masterCode });
    } else {
      // Switch to specific sub-groups
      if (!specificSubGroups || specificSubGroups.length === 0) {
        throw new Error('Specific sub-groups must be provided when switching to specific assignment type');
      }

      // Get current role
      const existingAssignments = await prisma.serviceLineUser.findMany({
        where: {
          userId,
          subServiceLineGroup: {
            in: (await getSubServiceLineGroupsByMaster(masterCode)).map(sg => sg.code),
          },
        },
        select: { role: true },
      });

      const role = existingAssignments.length > 0 ? getHighestRole(existingAssignments.map(a => a.role)) : 'USER';

      // Delete all current assignments
      await revokeServiceLineAccess(userId, masterCode, 'main');

      // Create specific sub-group assignments
      await grantServiceLineAccess(userId, specificSubGroups, role, 'subgroup');

      logger.info('Switched to specific sub-group assignment', { userId, masterCode, subGroups: specificSubGroups });
    }
  } catch (error) {
    logger.error('Error switching assignment type', { userId, masterCode, newType, error });
    throw error;
  }
}

/**
 * Get user's assignment type for a service line
 */
export async function getUserAssignmentType(userId: string, masterCode: string): Promise<AssignmentType> {
  try {
    const subGroups = await getSubServiceLineGroupsByMaster(masterCode);
    const subGroupCodes = subGroups.map(sg => sg.code);

    if (subGroupCodes.length === 0) {
      return 'NONE';
    }

    const assignments = await prisma.serviceLineUser.findMany({
      where: {
        userId,
        subServiceLineGroup: { in: subGroupCodes },
      },
      select: {
        assignmentType: true,
      },
    });

    if (assignments.length === 0) {
      return 'NONE';
    }

    // If user has all sub-groups and all are MAIN_SERVICE_LINE type
    if (assignments.length === subGroupCodes.length && 
        assignments.every(a => a.assignmentType === 'MAIN_SERVICE_LINE')) {
      return 'MAIN_SERVICE_LINE';
    }

    return 'SPECIFIC_SUBGROUP';
  } catch (error) {
    logger.error('Error getting user assignment type', { userId, masterCode, error });
    return 'NONE';
  }
}

/**
 * Get all users with access to a service line
 */
export async function getServiceLineUsers(serviceLine: ServiceLine | string) {
  try {
    // Get all sub-groups for this master code
    const subGroups = await getSubServiceLineGroupsByMaster(serviceLine as string);
    const subGroupCodes = subGroups.map(sg => sg.code);

    const users = await prisma.serviceLineUser.findMany({
      where: {
        subServiceLineGroup: { in: subGroupCodes },
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

    // Group by user and determine assignment type
    const userMap = new Map<string, any>();
    for (const assignment of users) {
      if (!userMap.has(assignment.userId)) {
        userMap.set(assignment.userId, {
          ...assignment,
          subGroups: [assignment.subServiceLineGroup],
          hasAllSubGroups: false,
        });
      } else {
        const existing = userMap.get(assignment.userId);
        existing.subGroups.push(assignment.subServiceLineGroup);
      }
    }

    // Determine if each user has all sub-groups
    for (const [userId, userData] of userMap) {
      userData.hasAllSubGroups = userData.subGroups.length === subGroupCodes.length;
    }

    return Array.from(userMap.values());
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
    // Get all sub-groups for this service line
    const subGroups = await getSubServiceLineGroupsByMaster(serviceLine as string);
    const subGroupCodes = subGroups.map(sg => sg.code);

    // Get all ServLineCodes for these sub-groups
    const servLineCodes: string[] = [];
    for (const subGroup of subGroups) {
      const codes = await getServLineCodesBySubGroup(subGroup.code, serviceLine as string);
      servLineCodes.push(...codes);
    }

    const uniqueServLineCodes = Array.from(new Set(servLineCodes));

    const [
      totalTasks,
      activeTasks,
      inactiveTasks,
      totalUsers,
      recentTasks,
    ] = await Promise.all([
      prisma.task.count({
        where: { ServLineCode: { in: uniqueServLineCodes } },
      }),
      prisma.task.count({
        where: { 
          ServLineCode: { in: uniqueServLineCodes }, 
          Active: 'Yes',
        },
      }),
      prisma.task.count({
        where: { 
          ServLineCode: { in: uniqueServLineCodes }, 
          Active: 'No',
        },
      }),
      prisma.serviceLineUser.count({
        where: { subServiceLineGroup: { in: subGroupCodes } },
      }),
      prisma.task.findMany({
        where: { ServLineCode: { in: uniqueServLineCodes } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalTasks,
      activeTasks,
      archivedProjects: inactiveTasks,
      totalUsers,
      recentProjects: recentTasks,
    };
  } catch (error) {
    logger.error('Error getting service line stats', { serviceLine, error });
    throw error;
  }
}

/**
 * Ensure user has access to all shared services with USER role
 * Called automatically when a new user account is created
 * SYSTEM_ADMIN users are skipped (they already have full access)
 * 
 * @param userId - The user ID to grant shared services access to
 * @throws Error if access cannot be granted
 */
export async function ensureSharedServiceAccess(userId: string): Promise<void> {
  try {
    // Check if user is SYSTEM_ADMIN - they already have full access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SYSTEM_ADMIN') {
      logger.info('Skipping shared service assignment for SYSTEM_ADMIN', { userId });
      return;
    }

    // Define all shared services (excluding COUNTRY_MANAGEMENT which requires explicit assignment)
    const sharedServices = [
      'QRM',
      'BUSINESS_DEV',
      'IT',
      'FINANCE',
      'HR',
    ];

    logger.info('Assigning shared services access to new user', { 
      userId, 
      sharedServices 
    });

    // Grant access to each shared service with USER role
    // Use sequential processing to avoid overwhelming the database
    for (const serviceLine of sharedServices) {
      try {

        await grantServiceLineAccess(userId, serviceLine, ServiceLineRole.USER, 'main');
        logger.info('Granted shared service access', { userId, serviceLine });
      } catch (error) {

        // Log warning but continue with other services
        logger.warn('Failed to grant access to shared service', { 
          userId, 
          serviceLine, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('Completed shared services assignment', { userId });
  } catch (error) {
    logger.error('Error ensuring shared service access', { userId, error });
    throw error;
  }
}
