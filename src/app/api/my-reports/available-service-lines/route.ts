/**
 * My Reports - Available Service Lines API
 * 
 * Returns service lines where the employee has tasks (as partner or manager)
 * Used to populate service line filter dropdown
 * 
 * Access restricted to employees who are partners or managers
 */

import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface AvailableServiceLine {
  code: string;
  name: string;
  taskCount: number;
}

/**
 * GET /api/my-reports/available-service-lines
 * 
 * Returns array of service lines where user has tasks
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    try {
      const startTime = Date.now();

      // Check cache first
      const cacheKey = `${CACHE_PREFIXES.USER}my-reports:available-service-lines:${user.id}`;
      const cached = await cache.get<AvailableServiceLine[]>(cacheKey);
      if (cached) {
        logger.info('Returning cached available service lines', { userId: user.id });
        return NextResponse.json(successResponse(cached));
      }

      // 1. Find employee record for current user
      const userEmail = user.email.toLowerCase();
      const emailPrefix = userEmail.split('@')[0];

      const employee = await prisma.employee.findFirst({
        where: {
          AND: [
            { Active: 'Yes' },
            {
              OR: [
                { WinLogon: { equals: userEmail } },
                { WinLogon: { equals: emailPrefix } },
                { WinLogon: { startsWith: `${emailPrefix}@` } },
              ],
            },
          ],
        },
        select: {
          EmpCode: true,
          EmpCatCode: true,
        },
      });

      if (!employee) {
        throw new AppError(
          403,
          'No employee record found for your account',
          ErrorCodes.FORBIDDEN
        );
      }

      // 2. Determine filter mode based on employee category
      const partnerCategories = ['CARL', 'Local', 'DIR'];
      const isPartnerReport = partnerCategories.includes(employee.EmpCatCode);
      const filterField = isPartnerReport ? 'TaskPartner' : 'TaskManager';

      // 3. Query distinct service lines from tasks where employee is partner/manager
      const filterColumn = isPartnerReport ? Prisma.raw('TaskPartner') : Prisma.raw('TaskManager');
      
      const serviceLineCounts = await prisma.$queryRaw<Array<{
        ServLineCode: string;
        taskCount: number;
      }>>`
        SELECT t.ServLineCode, COUNT(DISTINCT t.TaskCode) as taskCount
        FROM Task t
        INNER JOIN WIPTransactions wip ON wip.TaskCode = t.TaskCode
        WHERE wip.${filterColumn} = ${employee.EmpCode}
        GROUP BY t.ServLineCode
        ORDER BY taskCount DESC
      `;

      if (serviceLineCounts.length === 0) {
        logger.info('No service lines found for employee', {
          userId: user.id,
          empCode: employee.EmpCode,
        });
        return NextResponse.json(successResponse([]));
      }

      // 4. Map ServLineCode to masterCode via ServiceLineExternal
      const servLineCodes = serviceLineCounts.map(sl => sl.ServLineCode);
      const serviceLineExternal = await prisma.serviceLineExternal.findMany({
        where: {
          ServLineCode: { in: servLineCodes },
          // Note: Not filtering by Active since all records have Active=false in the database
        },
        select: {
          ServLineCode: true,
          masterCode: true,
        },
      });

      // Create mapping
      const servLineToMasterMap = new Map<string, string>();
      serviceLineExternal.forEach(sle => {
        if (sle.ServLineCode && sle.masterCode) {
          servLineToMasterMap.set(sle.ServLineCode, sle.masterCode);
        }
      });

      // 5. Get unique master codes with aggregated task counts
      const masterCodeCounts = new Map<string, number>();
      serviceLineCounts.forEach(sl => {
        const masterCode = servLineToMasterMap.get(sl.ServLineCode);
        if (masterCode) {
          const currentCount = masterCodeCounts.get(masterCode) || 0;
          masterCodeCounts.set(masterCode, currentCount + Number(sl.taskCount));
        }
      });

      // 6. Fetch service line master names
      const masterCodes = Array.from(masterCodeCounts.keys());
      const serviceLineMaster = await prisma.serviceLineMaster.findMany({
        where: {
          code: { in: masterCodes },
          active: true,
        },
        select: {
          code: true,
          name: true,
        },
      });

      // 7. Build result array
      const result: AvailableServiceLine[] = serviceLineMaster.map(slm => ({
        code: slm.code,
        name: slm.name,
        taskCount: masterCodeCounts.get(slm.code) || 0,
      }))
      .sort((a, b) => b.taskCount - a.taskCount); // Sort by task count descending

      // Cache for 30 minutes
      await cache.set(cacheKey, result, 1800);

      const duration = Date.now() - startTime;
      logger.info('Available service lines generated', {
        userId: user.id,
        empCode: employee.EmpCode,
        serviceLineCount: result.length,
        duration,
      });

      return NextResponse.json(successResponse(result));
    } catch (error) {
      logger.error('Error fetching available service lines', error);
      return handleApiError(error, 'Fetch available service lines');
    }
  },
});
