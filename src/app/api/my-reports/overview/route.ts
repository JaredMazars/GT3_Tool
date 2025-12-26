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

      // 4. Determine filter field for tasks
      const partnerOrManagerField = isPartnerReport ? 'TaskPartner' : 'TaskManager';

      // 5. Fetch WIP transactions aggregated by month (using JOIN to avoid parameter limit)
      const wipMonthlyData = await prisma.$queryRaw<Array<{
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
          DATEFROMPARTS(YEAR(w.TranDate), MONTH(w.TranDate), 1) as month,
          SUM(CASE WHEN w.TType = 'T' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdTime,
          SUM(CASE WHEN w.TType = 'D' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdDisb,
          SUM(CASE WHEN w.TType = 'ADJ' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdAdj,
          SUM(CASE WHEN w.TType != 'P' THEN ISNULL(w.Cost, 0) ELSE 0 END) as ltdCost,
          SUM(CASE WHEN w.TType = 'F' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdFee,
          SUM(CASE WHEN w.TType = 'P' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdProvision,
          SUM(CASE WHEN w.TType = 'ADJ' AND w.Amount < 0 THEN ISNULL(w.Amount, 0) ELSE 0 END) as negativeAdj
        FROM WIPTransactions w
        INNER JOIN Task t ON w.GSTaskID = t.GSTaskID
        WHERE t.${Prisma.raw(partnerOrManagerField)} = ${employee.EmpCode}
          AND w.TranDate >= ${startDate}
          AND w.TranDate <= ${endDate}
        GROUP BY YEAR(w.TranDate), MONTH(w.TranDate)
        ORDER BY month
      `;

      // 6. Fetch Collections (DrsTransactions filtered by Biller)
      // Note: Receipts are stored as negative amounts, so we negate to get positive collections
      const collectionsData = await prisma.$queryRaw<Array<{
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
      `;

      // 7. Fetch Net Billings for Debtors Lockup calculation (12-month trailing)
      // Net Billings = All DRS transactions (invoices, credit notes, etc.)
      const netBillingsData = await prisma.$queryRaw<Array<{
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
        GROUP BY YEAR(TranDate), MONTH(TranDate)
        ORDER BY month
      `;

      // 8. Calculate Debtors balances by month from DrsTransactions
      // Cumulative balance = sum of all transactions up to each month-end
      const debtorsBalances = await prisma.$queryRaw<Array<{
        month: Date;
        balance: number;
      }>>`
        SELECT 
          EOMONTH(TranDate) as month,
          SUM(ISNULL(Total, 0)) as balance
        FROM DrsTransactions
        WHERE Biller = ${employee.EmpCode}
          AND TranDate <= ${endDate}
        GROUP BY EOMONTH(TranDate)
        HAVING EOMONTH(TranDate) >= ${startDate}
        ORDER BY month
      `;

      // 9. Calculate WIP balances by month-end (using JOIN to avoid parameter limit)
      const wipBalances = await prisma.$queryRaw<Array<{
        month: Date;
        wipBalance: number;
      }>>`
        SELECT 
          EOMONTH(w.TranDate) as month,
          SUM(
            CASE 
              WHEN w.TType = 'T' THEN ISNULL(w.Amount, 0)
              WHEN w.TType = 'D' THEN ISNULL(w.Amount, 0)
              WHEN w.TType = 'ADJ' THEN ISNULL(w.Amount, 0)
              WHEN w.TType = 'F' THEN -ISNULL(w.Amount, 0)
              WHEN w.TType = 'P' THEN ISNULL(w.Amount, 0)
              ELSE 0
            END
          ) as wipBalance
        FROM WIPTransactions w
        INNER JOIN Task t ON w.GSTaskID = t.GSTaskID
        WHERE t.${Prisma.raw(partnerOrManagerField)} = ${employee.EmpCode}
          AND w.TranDate <= ${endDate}
        GROUP BY EOMONTH(w.TranDate)
        HAVING EOMONTH(w.TranDate) >= ${startDate}
        ORDER BY month
      `;

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

