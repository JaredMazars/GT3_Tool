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

      // Count tasks for each sub-service line group
      const subGroupTaskCounts: Array<{
        subGroup: string;
        serviceLine: string;
        taskCount: number;
      }> = [];

      for (const subGroup of userSubGroups) {
        // Get ServLineCodes for this sub-group
        const servLineCodes = await getServLineCodesBySubGroup(subGroup);

        if (servLineCodes.length === 0) {
          logger.warn('Sub-group has no ServLineCodes', { subGroup });
          continue;
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

        // Determine master code (serviceLine) for this sub-group
        const mapping = await prisma.serviceLineExternal.findFirst({
          where: {
            SubServlineGroupCode: subGroup,
            masterCode: { not: null },
          },
          select: {
            masterCode: true,
          },
        });

        if (mapping?.masterCode) {
          subGroupTaskCounts.push({
            subGroup,
            serviceLine: mapping.masterCode,
            taskCount,
          });
        }
      }

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
