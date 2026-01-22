export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

export interface UserAccessibleGroup {
  code: string;
  description: string;
  masterCode: string;
  masterName: string;
  activeTasks: number;
  totalTasks: number;
}

export interface GroupedAccessibleGroups {
  serviceLine: string;
  serviceLineName: string;
  groups: UserAccessibleGroup[];
}

/**
 * GET /api/service-lines/user-accessible-groups
 * Fetch all SubServLineGroups accessible to the current user across all service lines
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    try {
      // Get user's accessible sub-service line groups
      const userSubGroups = await getUserSubServiceLineGroups(user.id);

      if (userSubGroups.length === 0) {
        return NextResponse.json(successResponse([]));
      }

      // Fetch all external service lines for these sub-groups with master info
      const externalLines = await prisma.serviceLineExternal.findMany({
        where: {
          SubServlineGroupCode: { in: userSubGroups },
          masterCode: { not: null },
        },
        select: {
          SubServlineGroupCode: true,
          SubServlineGroupDesc: true,
          masterCode: true,
          ServLineCode: true,
        },
        orderBy: [
          { masterCode: 'asc' },
          { SubServlineGroupCode: 'asc' },
        ],
      });

      // Get master service line names
      const masterCodes = Array.from(
        new Set(externalLines.map(e => e.masterCode).filter((c): c is string => c !== null))
      );

      const masterServiceLines = await prisma.serviceLineMaster.findMany({
        where: {
          code: { in: masterCodes },
          active: true,
        },
        select: {
          code: true,
          name: true,
        },
      });

      const masterCodeToName = new Map(
        masterServiceLines.map(m => [m.code, m.name])
      );

      // Build map of SubServLineGroup -> master info and ServLineCodes
      const subGroupMap = new Map<string, {
        code: string;
        description: string;
        masterCode: string;
        masterName: string;
        servLineCodes: string[];
      }>();

      for (const line of externalLines) {
        if (!line.SubServlineGroupCode || !line.masterCode) continue;

        if (!subGroupMap.has(line.SubServlineGroupCode)) {
          subGroupMap.set(line.SubServlineGroupCode, {
            code: line.SubServlineGroupCode,
            description: line.SubServlineGroupDesc || '',
            masterCode: line.masterCode,
            masterName: masterCodeToName.get(line.masterCode) || line.masterCode,
            servLineCodes: [],
          });
        }

        // Collect ServLineCodes for task counting
        if (line.ServLineCode) {
          const entry = subGroupMap.get(line.SubServlineGroupCode)!;
          entry.servLineCodes.push(line.ServLineCode);
        }
      }

      // Get all ServLineCodes for task counting
      const allServLineCodes = Array.from(subGroupMap.values())
        .flatMap(sg => sg.servLineCodes);

      // Get task counts for the current user's assigned tasks across all ServLineCodes
      let taskCounts = new Map<string, { total: number; active: number }>();
      
      if (allServLineCodes.length > 0) {
        // Get user's employee code(s) to check for partner/manager tasks
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

        // Count tasks where user is team member, partner, or manager
        const userTasks = await prisma.task.findMany({
          where: {
            ServLineCode: { in: allServLineCodes },
            OR: [
              { TaskTeam: { some: { userId: user.id } } },
              ...(empCodes.length > 0 ? [
                { TaskPartner: { in: empCodes } },
                { TaskManager: { in: empCodes } },
              ] : []),
            ],
          },
          select: {
            ServLineCode: true,
            Active: true,
          },
        });

        // Count tasks by ServLineCode
        for (const task of userTasks) {
          if (!task.ServLineCode) continue;
          const existing = taskCounts.get(task.ServLineCode) || { total: 0, active: 0 };
          existing.total += 1;
          if (task.Active === 'Yes') {
            existing.active += 1;
          }
          taskCounts.set(task.ServLineCode, existing);
        }
      }

      // Build result with task counts
      const groups: UserAccessibleGroup[] = Array.from(subGroupMap.values()).map(sg => {
        let totalTasks = 0;
        let activeTasks = 0;

        for (const code of sg.servLineCodes) {
          const counts = taskCounts.get(code);
          if (counts) {
            totalTasks += counts.total;
            activeTasks += counts.active;
          }
        }

        return {
          code: sg.code,
          description: sg.description,
          masterCode: sg.masterCode,
          masterName: sg.masterName,
          activeTasks,
          totalTasks,
        };
      });

      // Group by master service line
      const groupedByServiceLine = new Map<string, GroupedAccessibleGroups>();

      for (const group of groups) {
        if (!groupedByServiceLine.has(group.masterCode)) {
          groupedByServiceLine.set(group.masterCode, {
            serviceLine: group.masterCode,
            serviceLineName: group.masterName,
            groups: [],
          });
        }
        groupedByServiceLine.get(group.masterCode)!.groups.push(group);
      }

      const result = Array.from(groupedByServiceLine.values());

      logger.info('User accessible groups fetched', {
        userId: user.id,
        totalGroups: groups.length,
        serviceLines: result.length,
      });

      return NextResponse.json(successResponse(result));
    } catch (error) {
      logger.error('Error fetching user accessible groups', { userId: user.id, error });
      throw error;
    }
  },
});

