export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute } from '@/lib/api/secureRoute';
import { getServLineCodesBySubGroup } from '@/lib/utils/serviceLineExternal';
import { logger } from '@/lib/utils/logger';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

const PRIMARY_WORKSPACE_CACHE_TTL = 10 * 60; // 10 minutes

interface PrimaryWorkspaceResponse {
  serviceLine: string;
  subServiceLineGroup: string;
  taskCount: number;
}

/**
 * GET /api/workspace/primary
 * Get user's primary workspace (the sub-service line group where they have the most tasks)
 * 
 * Logic:
 * 1. Get all sub-service line groups user has access to
 * 2. For each sub-group, count tasks where user is team member, partner, or manager
 * 3. Return the sub-group with highest task count
 * 4. If no tasks, return the first assigned sub-group
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    try {
      // Cache key includes user ID for personalization
      const cacheKey = `${CACHE_PREFIXES.USER}primary-workspace:${user.id}`;
      const cached = await cache.get<PrimaryWorkspaceResponse>(cacheKey);
      if (cached) {
        logger.info('Primary workspace cache hit', { userId: user.id });
        return NextResponse.json(successResponse(cached));
      }

      // Get all sub-service line groups user has access to
      const userSubGroups = await getUserSubServiceLineGroups(user.id);

      if (userSubGroups.length === 0) {
        throw new AppError(
          404,
          'No service line assignments found',
          ErrorCodes.NOT_FOUND
        );
      }

      // Get user's employee code(s) for partner/manager task lookup
      const userEmail = user.email.toLowerCase();
      const emailPrefix = userEmail.split('@')[0];
      
      const userEmployees = await prisma.employee.findMany({
        where: {
          OR: [
            { WinLogon: { equals: userEmail } },
            { WinLogon: { startsWith: `${emailPrefix}@` } },
          ],
        },
        select: { EmpCode: true },
      });
      
      const empCodes = userEmployees.map(e => e.EmpCode);

      // OPTIMIZATION: Batch fetch all service line mappings and codes at once
      // Instead of sequential queries for each sub-group
      const [allMappings, allServLineMappings] = await Promise.all([
        // Get all masterCode mappings for user's sub-groups in one query
        prisma.serviceLineExternal.findMany({
          where: {
            SubServlineGroupCode: { in: userSubGroups },
            masterCode: { not: null },
          },
          select: {
            SubServlineGroupCode: true,
            ServLineCode: true,
            masterCode: true,
          },
        }),
        // Also get the task counts preparation data
        prisma.serviceLineExternal.findMany({
          where: {
            SubServlineGroupCode: { in: userSubGroups },
            ServLineCode: { not: null },
          },
          select: {
            SubServlineGroupCode: true,
            ServLineCode: true,
          },
        }),
      ]);

      // Build lookup maps for O(1) access
      const subGroupToMasterCode = new Map<string, string>();
      const subGroupToServLineCodes = new Map<string, string[]>();

      // Process mappings
      for (const mapping of allMappings) {
        if (mapping.SubServlineGroupCode && mapping.masterCode) {
          // Store first masterCode found for each sub-group
          if (!subGroupToMasterCode.has(mapping.SubServlineGroupCode)) {
            subGroupToMasterCode.set(mapping.SubServlineGroupCode, mapping.masterCode);
          }
        }
      }

      // Process ServLineCode collections
      for (const mapping of allServLineMappings) {
        if (mapping.SubServlineGroupCode && mapping.ServLineCode) {
          const existing = subGroupToServLineCodes.get(mapping.SubServlineGroupCode) || [];
          existing.push(mapping.ServLineCode);
          subGroupToServLineCodes.set(mapping.SubServlineGroupCode, existing);
        }
      }

      // OPTIMIZATION: Parallelize all task count queries using Promise.all
      const taskCountPromises = userSubGroups.map(async (subGroup) => {
        const servLineCodes = subGroupToServLineCodes.get(subGroup) || [];
        const masterCode = subGroupToMasterCode.get(subGroup);

        if (servLineCodes.length === 0) {
          logger.warn('Sub-group has no ServLineCodes', { subGroup });
          return null;
        }

        if (!masterCode) {
          logger.warn('Sub-group has no masterCode mapping', { subGroup });
          return null;
        }

        // Count tasks where user is team member, partner, or manager
        const taskCount = await prisma.task.count({
          where: {
            Active: 'Yes',
            ServLineCode: { in: servLineCodes },
            OR: [
              { TaskTeam: { some: { userId: user.id } } },
              ...(empCodes.length > 0 ? [
                { TaskPartner: { in: empCodes } },
                { TaskManager: { in: empCodes } },
              ] : []),
            ],
          },
        });

        return {
          subGroup,
          serviceLine: masterCode,
          taskCount,
        };
      });

      // Execute all count queries in parallel
      const taskCountResults = await Promise.all(taskCountPromises);
      
      // Filter out null results and collect valid sub-group task counts
      const subGroupTaskCounts = taskCountResults.filter(
        (result): result is { subGroup: string; serviceLine: string; taskCount: number } => 
          result !== null
      );

      // Sort by task count (descending) and get the first one
      subGroupTaskCounts.sort((a, b) => b.taskCount - a.taskCount);

      // If no sub-groups with valid mappings, throw error
      if (subGroupTaskCounts.length === 0) {
        throw new AppError(
          404,
          'No valid service line mappings found for user sub-groups',
          ErrorCodes.NOT_FOUND
        );
      }

      // Return the sub-group with most tasks (or first if all have 0 tasks)
      const primary = subGroupTaskCounts[0]!;

      const responseData: PrimaryWorkspaceResponse = {
        serviceLine: primary.serviceLine,
        subServiceLineGroup: primary.subGroup,
        taskCount: primary.taskCount,
      };

      // Cache result
      await cache.set(cacheKey, responseData, PRIMARY_WORKSPACE_CACHE_TTL);

      logger.info('Primary workspace determined', {
        userId: user.id,
        serviceLine: responseData.serviceLine,
        subServiceLineGroup: responseData.subServiceLineGroup,
        taskCount: responseData.taskCount,
      });

      return NextResponse.json(successResponse(responseData));
    } catch (error) {
      logger.error('Error determining primary workspace', { userId: user.id, error });
      throw error;
    }
  },
});
