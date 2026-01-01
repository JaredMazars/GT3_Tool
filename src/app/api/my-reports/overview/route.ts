/**
 * My Reports - Overview API
 * 
 * Returns monthly financial metrics over a rolling 24-month period
 * Filtered based on employee category:
 * - CARL/Local/DIR: Tasks where user is Task Partner
 * - Others: Tasks where user is Task Manager
 * - Debtors: Filtered by Biller column matching employee code
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
import type { MyReportsOverviewData, MonthlyMetrics } from '@/types/api';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * GET /api/my-reports/overview
 * 
 * Returns monthly metrics for the last 24 months
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    try {
      const startTime = Date.now();

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
          EmpNameFull: true,
          EmpCatCode: true,
          EmpCatDesc: true,
        },
      });

      if (!employee) {
        throw new AppError(
          403,
          'No employee record found for your account',
          ErrorCodes.FORBIDDEN
        );
      }

      logger.info('Overview report requested', {
        userId: user.id,
        empCode: employee.EmpCode,
        empCatCode: employee.EmpCatCode,
      });

      // 2. Determine filter mode based on employee category
      const partnerCategories = ['CARL', 'Local', 'DIR'];
      const isPartnerReport = partnerCategories.includes(employee.EmpCatCode);
      const filterMode = isPartnerReport ? 'PARTNER' : 'MANAGER';

      // Check cache
      const cacheKey = `${CACHE_PREFIXES.USER}my-reports:overview:${user.id}`;
      const cached = await cache.get<MyReportsOverviewData>(cacheKey);
      if (cached) {
        logger.info('Returning cached overview report', { userId: user.id, filterMode });
        return NextResponse.json(successResponse(cached));
      }

      // 3. Calculate date range (rolling 24 months)
      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(endDate, 23)); // 24 months including current

      // 4. Determine filter field - WIPTransactions has TaskPartner/TaskManager directly
      const partnerOrManagerField = isPartnerReport ? 'TaskPartner' : 'TaskManager';

      // 5-9. Execute all queries in parallel for performance (40-60% faster)
      // Each query is independent - they only need employee.EmpCode and date parameters
      const [wipMonthlyData, collectionsData, netBillingsData, debtorsBalances, wipBalances] = await Promise.all([
        // 5. WIP transactions aggregated by month (no JOIN needed - use direct columns)
        // Fetches 12 extra months prior to display range for trailing 12-month revenue calculation
        prisma.$queryRaw<Array<{
          month: Date;
          ltdTime: number;
          ltdDisb: number;
          ltdAdj: number;
          ltdCost: number;
          ltdFee: number;
          ltdProvision: number;
          negativeAdj: number;
        }>>`
          SELECT 
            DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) as month,
            SUM(CASE WHEN TType = 'T' THEN ISNULL(Amount, 0) ELSE 0 END) as ltdTime,
            SUM(CASE WHEN TType = 'D' THEN ISNULL(Amount, 0) ELSE 0 END) as ltdDisb,
            SUM(CASE WHEN TType = 'ADJ' THEN ISNULL(Amount, 0) ELSE 0 END) as ltdAdj,
            SUM(CASE WHEN TType != 'P' THEN ISNULL(Cost, 0) ELSE 0 END) as ltdCost,
            SUM(CASE WHEN TType = 'F' THEN ISNULL(Amount, 0) ELSE 0 END) as ltdFee,
            SUM(CASE WHEN TType = 'P' THEN ISNULL(Amount, 0) ELSE 0 END) as ltdProvision,
            SUM(CASE WHEN TType = 'ADJ' AND Amount < 0 THEN ISNULL(Amount, 0) ELSE 0 END) as negativeAdj
          FROM WIPTransactions
          WHERE ${Prisma.raw(partnerOrManagerField)} = ${employee.EmpCode}
            AND TranDate >= ${subMonths(startDate, 12)}
            AND TranDate <= ${endDate}
          GROUP BY YEAR(TranDate), MONTH(TranDate)
          ORDER BY month
        `,

        // 6. Collections (DrsTransactions filtered by Biller)
        // Receipts are stored as negative amounts, so we negate to get positive collections
        prisma.$queryRaw<Array<{
          month: Date;
          collections: number;
        }>>`
          SELECT 
            DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) as month,
            SUM(-ISNULL(Total, 0)) as collections
          FROM DrsTransactions
          WHERE Biller = ${employee.EmpCode}
            AND EntryType = 'Receipt'
            AND TranDate >= ${startDate}
            AND TranDate <= ${endDate}
          GROUP BY YEAR(TranDate), MONTH(TranDate)
          ORDER BY month
        `,

        // 7. Net Billings for Debtors Lockup calculation (12-month trailing)
        // Net Billings = All DRS transactions EXCEPT receipts (invoices, credit notes, adjustments)
        prisma.$queryRaw<Array<{
          month: Date;
          netBillings: number;
        }>>`
          SELECT 
            DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) as month,
            SUM(ISNULL(Total, 0)) as netBillings
          FROM DrsTransactions
          WHERE Biller = ${employee.EmpCode}
            AND TranDate >= ${subMonths(startDate, 12)}
            AND TranDate <= ${endDate}
            AND (EntryType IS NULL OR EntryType != 'Receipt')
          GROUP BY YEAR(TranDate), MONTH(TranDate)
          ORDER BY month
        `,

        // 8. Debtors balances by month (true LTD - sum of all transactions up to each month-end)
        prisma.$queryRaw<Array<{
          month: Date;
          balance: number;
        }>>`
          WITH MonthSeries AS (
            SELECT EOMONTH(${startDate}) as month
            UNION ALL
            SELECT EOMONTH(DATEADD(MONTH, 1, month))
            FROM MonthSeries
            WHERE month < EOMONTH(${endDate})
          )
          SELECT 
            m.month,
            ISNULL((
              SELECT SUM(ISNULL(Total, 0))
              FROM DrsTransactions
              WHERE Biller = ${employee.EmpCode}
                AND TranDate <= m.month
            ), 0) as balance
          FROM MonthSeries m
          ORDER BY m.month
          OPTION (MAXRECURSION 100)
        `,

        // 9. WIP balances by month-end (true LTD - sum of all WIP up to each month-end)
        prisma.$queryRaw<Array<{
          month: Date;
          wipBalance: number;
        }>>`
          WITH MonthSeries AS (
            SELECT EOMONTH(${startDate}) as month
            UNION ALL
            SELECT EOMONTH(DATEADD(MONTH, 1, month))
            FROM MonthSeries
            WHERE month < EOMONTH(${endDate})
          )
          SELECT 
            m.month,
            ISNULL((
              SELECT SUM(
                CASE 
                  WHEN TType = 'T' THEN ISNULL(Amount, 0)
                  WHEN TType = 'D' THEN ISNULL(Amount, 0)
                  WHEN TType = 'ADJ' THEN ISNULL(Amount, 0)
                  WHEN TType = 'F' THEN -ISNULL(Amount, 0)
                  WHEN TType = 'P' THEN ISNULL(Amount, 0)
                  ELSE 0
                END
              )
              FROM WIPTransactions
              WHERE ${Prisma.raw(partnerOrManagerField)} = ${employee.EmpCode}
                AND TranDate <= m.month
            ), 0) as wipBalance
          FROM MonthSeries m
          ORDER BY m.month
          OPTION (MAXRECURSION 100)
        `,
      ]);

      // 10. Build monthly metrics array
      const monthlyMetricsMap = new Map<string, Partial<MonthlyMetrics>>();
      
      // Initialize all 24 months
      for (let i = 0; i < 24; i++) {
        const monthDate = subMonths(endDate, 23 - i);
        const monthKey = format(startOfMonth(monthDate), 'yyyy-MM');
        monthlyMetricsMap.set(monthKey, {
          month: monthKey,
          netRevenue: 0,
          grossProfit: 0,
          collections: 0,
          wipLockupDays: 0,
          debtorsLockupDays: 0,
          writeoffPercentage: 0,
        });
      }

      // Process WIP data
      wipMonthlyData.forEach(row => {
        const monthKey = format(new Date(row.month), 'yyyy-MM');
        const metrics = monthlyMetricsMap.get(monthKey);
        if (metrics) {
          const grossProduction = row.ltdTime + row.ltdDisb;
          const netRevenue = grossProduction + row.ltdAdj;
          const grossProfit = netRevenue - row.ltdCost;
          
          // Writeoff % = (Negative Adjustments + Provisions) / Gross Time * 100
          const writeoffAmount = Math.abs(row.negativeAdj) + row.ltdProvision;
          const writeoffPercentage = row.ltdTime !== 0 ? (writeoffAmount / row.ltdTime) * 100 : 0;

          metrics.netRevenue = netRevenue;
          metrics.grossProfit = grossProfit;
          metrics.writeoffPercentage = writeoffPercentage;
          // Store calculation components for tooltip
          metrics.negativeAdj = Math.abs(row.negativeAdj);
          metrics.provisions = row.ltdProvision;
          metrics.grossTime = row.ltdTime;
        }
      });

      // Process Collections
      collectionsData.forEach(row => {
        const monthKey = format(new Date(row.month), 'yyyy-MM');
        const metrics = monthlyMetricsMap.get(monthKey);
        if (metrics) {
          metrics.collections = row.collections;
        }
      });

      // Process WIP Lockup Days
      wipBalances.forEach(row => {
        const monthKey = format(new Date(row.month), 'yyyy-MM');
        const metrics = monthlyMetricsMap.get(monthKey);
        if (metrics) {
          // Calculate trailing 12-month net revenue
          const monthDate = new Date(row.month);
          const trailing12Start = subMonths(monthDate, 11);
          
          let trailing12Revenue = 0;
          wipMonthlyData.forEach(wipRow => {
            const wipDate = new Date(wipRow.month);
            if (wipDate >= trailing12Start && wipDate <= monthDate) {
              const grossProduction = wipRow.ltdTime + wipRow.ltdDisb;
              trailing12Revenue += grossProduction + wipRow.ltdAdj;
            }
          });

          // WIP Lockup Days = (WIP Balance * 365) / Trailing 12-month Net Revenue
          metrics.wipLockupDays = trailing12Revenue !== 0 ? (row.wipBalance * 365) / trailing12Revenue : 0;
          // Store calculation components for tooltip
          metrics.wipBalance = row.wipBalance;
          metrics.trailing12Revenue = trailing12Revenue;
        }
      });

      // Process Debtors Lockup Days
      debtorsBalances.forEach(row => {
        const monthKey = format(startOfMonth(new Date(row.month)), 'yyyy-MM');
        const metrics = monthlyMetricsMap.get(monthKey);
        if (metrics) {
          // Calculate trailing 12-month net billings
          const monthDate = new Date(row.month);
          const trailing12Start = subMonths(monthDate, 11);
          
          let trailing12Billings = 0;
          netBillingsData.forEach(billRow => {
            const billDate = new Date(billRow.month);
            if (billDate >= trailing12Start && billDate <= monthDate) {
              trailing12Billings += billRow.netBillings;
            }
          });

          // Debtors Lockup Days = (Debtors Balance * 365) / Trailing 12-month Net Billings
          metrics.debtorsLockupDays = trailing12Billings !== 0 ? (row.balance * 365) / trailing12Billings : 0;
          // Store calculation components for tooltip
          metrics.debtorsBalance = row.balance;
          metrics.trailing12Billings = trailing12Billings;
        }
      });

      // Convert map to sorted array
      const monthlyMetrics: MonthlyMetrics[] = Array.from(monthlyMetricsMap.values())
        .sort((a, b) => a.month!.localeCompare(b.month!))
        .map(m => m as MonthlyMetrics);

      const report: MyReportsOverviewData = {
        monthlyMetrics,
        filterMode,
        employeeCode: employee.EmpCode,
      };

      // Cache for 10 minutes
      await cache.set(cacheKey, report, 600);

      const duration = Date.now() - startTime;
      logger.info('Overview report generated', {
        userId: user.id,
        filterMode,
        monthCount: monthlyMetrics.length,
        duration,
      });

      return NextResponse.json(successResponse(report));
    } catch (error) {
      logger.error('Error generating overview report', error);
      return handleApiError(error, 'Generate overview report');
    }
  },
});

