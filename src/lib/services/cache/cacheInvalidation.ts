/**
 * Cache Invalidation Utilities
 * 
 * Provides event-driven cache invalidation for mutations.
 * Use these functions after creating, updating, or deleting entities
 * to ensure cache consistency.
 */

import { cache, CACHE_PREFIXES } from './CacheService';
import { logger } from '@/lib/utils/logger';

/**
 * @deprecated Task detail caches are now handled by React Query client-side.
 * This function is kept for backwards compatibility but no longer invalidates Redis.
 * Task mutations automatically invalidate React Query caches via query keys.
 */
export async function invalidateTaskCache(taskId: number): Promise<void> {
  // No-op: Task details are cached client-side by React Query
  // React Query automatically invalidates on mutations via query keys
  logger.debug('Task cache invalidation skipped (React Query handles this)', { taskId });
}

/**
 * Invalidate client detail cache
 * Also invalidates client search/list caches as the client data may appear in search results
 */
export async function invalidateClientCache(clientId: number | string): Promise<void> {
  try {
    // Invalidate all client search caches (use pattern to match all search variations)
    // This ensures updated client data appears in all search results immediately
    await cache.invalidatePattern(`${CACHE_PREFIXES.CLIENT}search:*`);
    logger.debug('Client caches invalidated', { clientId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
    logger.error('Failed to invalidate client caches', { clientId, error });
  }
}

/**
 * Invalidate client acceptance cache after submission or approval
 * Client acceptance is cached on the server for validation checks
 */
export async function invalidateClientAcceptanceCache(clientId: number): Promise<void> {
  try {
    await Promise.all([
      cache.invalidate(`${CACHE_PREFIXES.CLIENT_ACCEPTANCE}${clientId}`),
      cache.invalidate(`${CACHE_PREFIXES.CLIENT_ACCEPTANCE}status:${clientId}`),
      cache.invalidate(`${CACHE_PREFIXES.CLIENT_ACCEPTANCE}valid:${clientId}`),
      // Also invalidate client cache as acceptance status is part of client data
      cache.invalidate(`${CACHE_PREFIXES.CLIENT}${clientId}`),
    ]);
    logger.debug('Client acceptance cache invalidated', { clientId });
  } catch (error) {
    logger.error('Failed to invalidate client acceptance cache', { clientId, error });
    // Don't throw - cache invalidation failures shouldn't break the operation
  }
}

/**
 * Invalidate workspace counts cache for a specific service line and sub-group
 */
export async function invalidateWorkspaceCounts(
  serviceLine?: string,
  subServiceLineGroup?: string
): Promise<void> {
  try {
    if (serviceLine && subServiceLineGroup) {
      // Invalidate specific service line + sub-group
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}counts:${serviceLine}:${subServiceLineGroup}`);
    } else {
      // Invalidate all workspace counts
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}counts`);
    }
    logger.debug('Workspace counts cache invalidated', { serviceLine, subServiceLineGroup });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate all standard tasks cache for a service line
 */
export async function invalidateStandardTasksCache(serviceLine?: string): Promise<void> {
  try {
    if (serviceLine) {
      await cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}standard-tasks:${serviceLine}`);
    } else {
      await cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}standard-tasks`);
    }
    logger.debug('Standard tasks cache invalidated', { serviceLine });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate service line related caches
 */
export async function invalidateServiceLineCache(
  masterCode?: string,
  subGroupCode?: string
): Promise<void> {
  try {
    const promises: Promise<number>[] = [];
    
    if (masterCode) {
      promises.push(cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}master:${masterCode}`));
    }
    if (subGroupCode) {
      promises.push(cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}subgroup:${subGroupCode}`));
    }
    
    // Always invalidate service line mappings when any service line data changes
    promises.push(cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}`));
    
    await Promise.all(promises);
    logger.debug('Service line cache invalidated', { masterCode, subGroupCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate user-related caches (permissions, preferences, etc.)
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    await Promise.all([
      cache.invalidate(`${CACHE_PREFIXES.USER}${userId}`),
      cache.invalidate(`${CACHE_PREFIXES.PERMISSION}${userId}`),
    ]);
    logger.debug('User cache invalidated', { userId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate analytics caches
 */
export async function invalidateAnalyticsCache(
  clientId?: number | string,
  type?: 'ratios' | 'documents' | 'rating'
): Promise<void> {
  try {
    if (clientId && type) {
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}${type}:${clientId}`);
    } else if (clientId) {
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}client:${clientId}`);
    } else {
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}`);
    }
    logger.debug('Analytics cache invalidated', { clientId, type });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate approvals cache
 * Use this when approvals are created, resolved, or when data affecting approvals changes
 */
export async function invalidateApprovalsCache(): Promise<void> {
  try {
    await cache.invalidate(`${CACHE_PREFIXES.USER}approvals`);
    logger.debug('Approvals cache invalidated');
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate workflow-specific caches based on workflow type
 * Use this when an approval is approved/rejected to invalidate entity-specific caches
 */
export async function invalidateWorkflowCache(
  workflowType: string,
  workflowId: number
): Promise<void> {
  try {
    const { prisma } = await import('@/lib/db/prisma');
    
    switch (workflowType) {
      case 'CLIENT_ACCEPTANCE': {
        // Query ClientAcceptance to get clientId
        const acceptance = await prisma.clientAcceptance.findUnique({
          where: { id: workflowId },
          select: { clientId: true },
        });
        
        if (acceptance) {
          // Invalidate both acceptance cache and client cache
          // Client cache needs invalidation because team members may have changed
          await Promise.all([
            invalidateClientAcceptanceCache(acceptance.clientId),
            invalidateOnClientMutation(acceptance.clientId),
          ]);
          logger.debug('Client acceptance workflow cache invalidated', { workflowId, clientId: acceptance.clientId });
        }
        break;
      }
      
      case 'ENGAGEMENT_LETTER':
      case 'DPA':
      case 'ACCEPTANCE': {
        // These workflow types use task IDs
        // Task caches are handled by React Query, but we invalidate workspace counts
        logger.debug('Task-based workflow cache invalidation handled by React Query', { workflowType, workflowId });
        break;
      }
      
      case 'VAULT_DOCUMENT': {
        // Vault document caches - handled by React Query
        logger.debug('Vault document workflow cache invalidation handled by React Query', { workflowType, workflowId });
        break;
      }
      
      case 'CHANGE_REQUEST': {
        // Change request caches - handled by React Query
        logger.debug('Change request workflow cache invalidation handled by React Query', { workflowType, workflowId });
        break;
      }
      
      default: {
        logger.debug('No specific cache invalidation for workflow type', { workflowType, workflowId });
        break;
      }
    }
  } catch (error) {
    logger.error('Failed to invalidate workflow cache', { workflowType, workflowId, error });
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Comprehensive invalidation after task creation/update
 * Use this when a task is created, updated, or deleted
 * 
 * Note: Task detail caches are handled by React Query client-side.
 * This only invalidates shared/computed Redis caches.
 */
export async function invalidateOnTaskMutation(
  taskId: number,
  serviceLine?: string,
  subServiceLineGroup?: string
): Promise<void> {
  try {
    await Promise.all([
      // Task details cached by React Query - no Redis invalidation needed
      // Invalidate client search caches (task counts are shown in search results)
      cache.invalidatePattern(`${CACHE_PREFIXES.CLIENT}search:*`),
      invalidateWorkspaceCounts(serviceLine, subServiceLineGroup),
      invalidateApprovalsCache(), // Task changes can affect approvals (acceptance, engagement letters, review notes)
    ]);
    logger.debug('Task mutation caches invalidated', { taskId, serviceLine, subServiceLineGroup });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Comprehensive invalidation after client creation/update
 * Use this when a client is created, updated, or deleted
 */
export async function invalidateOnClientMutation(
  clientId: number | string
): Promise<void> {
  try {
    await Promise.all([
      // Invalidate client search caches (important for server-side cached search results)
      invalidateClientCache(clientId),
      // Client changes can affect workspace counts (groups)
      invalidateWorkspaceCounts(),
      // Client changes can affect change requests
      invalidateApprovalsCache(),
    ]);
    logger.debug('Client mutation caches invalidated', { clientId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate user's service line cache
 * Use this when a user's service line access is granted, revoked, or modified
 */
export async function invalidateUserServiceLines(userId: string): Promise<void> {
  try {
    await cache.delete(`${CACHE_PREFIXES.SERVICE_LINE}user:${userId}`);
    logger.info('Invalidated user service line cache', { userId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate subgroups cache for a master service line
 * Use this when service line external mappings change
 */
export async function invalidateSubGroupsCache(masterCode: string): Promise<void> {
  try {
    await cache.delete(`${CACHE_PREFIXES.SERVICE_LINE}subgroups:${masterCode}`);
    logger.debug('Invalidated subgroups cache', { masterCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Comprehensive invalidation after service line access mutation
 * Use this when granting, revoking, or modifying service line access
 */
export async function invalidateOnServiceLineAccessMutation(
  userId: string,
  masterCode?: string
): Promise<void> {
  try {
    const promises: Promise<void>[] = [
      invalidateUserServiceLines(userId),
    ];
    
    if (masterCode) {
      promises.push(invalidateSubGroupsCache(masterCode));
    }
    
    await Promise.all(promises);
    logger.debug('Service line access mutation caches invalidated', { userId, masterCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate all caches related to a specific group
 * Use this when group data changes or when group-related analytics are updated
 */
export async function invalidateGroupCache(groupCode: string): Promise<void> {
  try {
    await Promise.all([
      cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}graphs:group:${groupCode}`),
      // Invalidate group list caches that might include this group
      cache.invalidate(`${CACHE_PREFIXES.CLIENT}groups`),
    ]);
    logger.debug('Group cache invalidated', { groupCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Comprehensive invalidation after group mutation
 * Use this when a group is created, updated, or when clients are added/removed from a group
 */
export async function invalidateOnGroupMutation(
  groupCode: string
): Promise<void> {
  try {
    await Promise.all([
      invalidateGroupCache(groupCode),
      // Group changes can affect workspace counts
      invalidateWorkspaceCounts(),
    ]);
    logger.debug('Group mutation caches invalidated', { groupCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate planner caches for a specific service line
 * Use this after task team mutations to ensure multi-user data consistency
 * 
 * Uses pattern matching to clear all cache variations (different filter/page combinations)
 * This is more efficient than clearing all planner caches globally
 * 
 * @param serviceLine - The master service line code (e.g., 'TAX', 'AUDIT')
 * @param subServiceLineGroup - The sub-service line group code (e.g., 'TAX_CORP', 'TAX_INDV')
 * @returns Total count of invalidated cache keys
 */
export async function invalidatePlannerCachesForServiceLine(
  serviceLine: string,
  subServiceLineGroup: string
): Promise<number> {
  try {
    // Use pattern matching to clear all variations of planner caches
    // This clears caches regardless of filter combinations or pagination
    const [
      clientCount, 
      employeeCount, 
      clientFilterCount,
      employeeFilterCount,
      globalClientCount,
      globalEmployeeCount,
      globalFilterCount,
    ] = await Promise.all([
      // Client planner caches: task:planner:clients:TAX:TAX_CORP:*
      cache.invalidatePattern(`${CACHE_PREFIXES.TASK}planner:clients:${serviceLine}:${subServiceLineGroup}:*`),
      // Employee planner caches: task:planner:employees:TAX:TAX_CORP:*
      cache.invalidatePattern(`${CACHE_PREFIXES.TASK}planner:employees:${serviceLine}:${subServiceLineGroup}:*`),
      // Client filter caches: task:planner:filters:TAX:TAX_CORP:user:*
      cache.invalidatePattern(`${CACHE_PREFIXES.TASK}planner:filters:${serviceLine}:${subServiceLineGroup}:*`),
      // Employee filter caches: task:planner:employees:filters:TAX:TAX_CORP
      cache.invalidatePattern(`${CACHE_PREFIXES.TASK}planner:employees:filters:${serviceLine}:${subServiceLineGroup}`),
      // Global planner caches (used by Staff Planner / Country Management)
      cache.invalidatePattern(`${CACHE_PREFIXES.TASK}global-planner:clients:*`),
      cache.invalidatePattern(`${CACHE_PREFIXES.TASK}global-planner:employees:*`),
      // Global filter caches
      cache.invalidatePattern(`${CACHE_PREFIXES.TASK}global-planner:*:filters`),
    ]);

    const totalCleared = clientCount + employeeCount + clientFilterCount + employeeFilterCount + 
                         globalClientCount + globalEmployeeCount + globalFilterCount;
    
    logger.info('Invalidated planner caches for service line', {
      serviceLine,
      subServiceLineGroup,
      clientCachesCleared: clientCount,
      employeeCachesCleared: employeeCount,
      clientFilterCachesCleared: clientFilterCount,
      employeeFilterCachesCleared: employeeFilterCount,
      globalClientCachesCleared: globalClientCount,
      globalEmployeeCachesCleared: globalEmployeeCount,
      globalFilterCachesCleared: globalFilterCount,
      totalKeysCleared: totalCleared,
    });

    return totalCleared;
  } catch (error) {
    logger.error('Failed to invalidate planner caches', { 
      serviceLine, 
      subServiceLineGroup, 
      error 
    });
    return 0;
  }
}

/**
 * Invalidate My Reports caches for a specific user or all users
 * Use this when WIP or DRS transactions are modified (nightly sync)
 * 
 * @param userId - Optional user ID to invalidate specific user's caches
 */
export async function invalidateMyReportsCache(userId?: string): Promise<void> {
  try {
    if (userId) {
      // Invalidate all cache variations for specific user (fiscal years + custom ranges)
      await cache.invalidatePattern(`${CACHE_PREFIXES.USER}my-reports:overview:*:${userId}`);
      logger.debug('My Reports cache invalidated for user', { userId });
    } else {
      // Invalidate all My Reports caches (admin operation after data sync)
      await cache.invalidatePattern(`${CACHE_PREFIXES.USER}my-reports:overview:*`);
      logger.info('My Reports cache invalidated for all users');
    }
  } catch (error) {
    logger.error('Failed to invalidate My Reports cache', { userId, error });
    // Silent fail - cache invalidation errors are not critical
  }
}




