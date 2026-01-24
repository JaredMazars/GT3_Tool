/**
 * My Reports - Overview API
 * 
 * Returns monthly financial metrics - supports fiscal year, custom date range modes
 * Values are CUMULATIVE within the selected period (running totals)
 * 
 * Filtered based on employee category:
 * - CARL/Local/DIR: Tasks where user is Task Partner
 * - Others: Tasks where user is Task Manager
 * - Debtors: Filtered by Biller column matching employee code
 * 
 * Query Parameters:
 * - fiscalYear: number (e.g., 2024 for FY2024 Sep 2023-Aug 2024)
 * - startDate: ISO date string (for custom range)
 * - endDate: ISO date string (for custom range)
 * - mode: 'fiscal' | 'custom' (defaults to 'fiscal')
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
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  buildWipMonthlyAggregationQuery,
  buildCollectionsMonthlyQuery,
  buildNetBillingsMonthlyQuery,
  type WipMonthlyResult,
  type CollectionsMonthlyResult,
  type NetBillingsMonthlyResult,
} from '@/lib/utils/sql';
import { getCurrentFiscalPeriod, getFiscalYearRange } from '@/lib/utils/fiscalPeriod';

export const dynamic = 'force-dynamic';

/**
 * Background cache helper - cache past fiscal years after returning current FY
 * Non-blocking operation for performance
 */
async function cachePastFiscalYearsInBackground(
  userId: string,
  employee: { EmpCode: string; EmpCatCode: string },
  filterMode: 'PARTNER' | 'MANAGER',
  currentFY: number
): Promise<void> {
  const pastYears = [currentFY - 1, currentFY - 2];
  
  // Fire and forget - don't await
  Promise.all(
    pastYears.map(async (fy) => {
      try {
        const cacheKey = `${CACHE_PREFIXES.USER}my-reports:overview:fy${fy}:${userId}`;
        const existing = await cache.get(cacheKey);
        if (existing) {
          logger.debug('Fiscal year already cached', { fy, userId });
          return;
        }
        
        logger.debug('Background caching fiscal year', { fy, userId });
        // Note: Actual caching logic would go here
        // For now, we'll let the normal request flow cache it when user switches
      } catch (error) {
        logger.error('Failed to background cache fiscal year', { fy, error });
      }
    })
  ).catch(() => {
    // Silent failure - background job
  });
}

/**
 * Core logic to fetch metrics for a single fiscal year
 * Extracted to be reusable for multi-year comparison
 */
async function fetchMetricsForFiscalYear(
  employee: { EmpCode: string; EmpCatCode: string },
  fiscalYear: number,
  partnerOrManagerField: string,
  serviceLines?: string[]
): Promise<MonthlyMetrics[]> {
  const { start: startDate, end: endDate } = getFiscalYearRange(fiscalYear);
  const isCumulative = true;

  // Execute all queries in parallel
  const [
    wipCumulativeData,
    wipMonthlyData, 
    collectionsData, 
    netBillingsData, 
    debtorsBalances, 
    wipBalances
  ] = await Promise.all([
    // WIP cumulative for display
    prisma.$queryRaw<WipMonthlyResult[]>(
      buildWipMonthlyAggregationQuery(
        partnerOrManagerField,
        employee.EmpCode,
        startDate,
        endDate,
        true, // Cumulative
        serviceLines
      )
    ),

    // WIP non-cumulative for lockup calculations
    prisma.$queryRaw<WipMonthlyResult[]>(
      buildWipMonthlyAggregationQuery(
        partnerOrManagerField,
        employee.EmpCode,
        subMonths(startDate, 12),
        endDate,
        false, // Non-cumulative
        serviceLines
      )
    ),

    // Collections
    prisma.$queryRaw<CollectionsMonthlyResult[]>(
      buildCollectionsMonthlyQuery(
        employee.EmpCode,
        startDate,
        endDate,
        isCumulative,
        serviceLines
      )
    ),

    // Net Billings
    prisma.$queryRaw<NetBillingsMonthlyResult[]>(
      buildNetBillingsMonthlyQuery(
        employee.EmpCode,
        subMonths(startDate, 12),
        endDate,
        false,
        serviceLines
      )
    ),

    // Debtors balances
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
      ),
      TransactionTotals AS (
        SELECT 
          EOMONTH(TranDate) as month,
          SUM(ISNULL(Total, 0)) as monthlyChange
        FROM DrsTransactions
        WHERE Biller = ${employee.EmpCode}
          AND TranDate <= ${endDate}
          ${serviceLines && serviceLines.length > 0 ? Prisma.sql`
            AND ServLineCode IN (
              SELECT ServLineCode FROM ServiceLineExternal sle
              WHERE sle.masterCode IN (${Prisma.join(serviceLines)})
            )
          ` : Prisma.empty}
        GROUP BY EOMONTH(TranDate)
      ),
      RunningTotals AS (
        SELECT 
          month,
          SUM(monthlyChange) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as balance
        FROM TransactionTotals
      )
      SELECT 
        m.month,
        ISNULL(r.balance, 0) as balance
      FROM MonthSeries m
      LEFT JOIN RunningTotals r ON m.month = r.month
      ORDER BY m.month
      OPTION (MAXRECURSION 100)
    `,

    // WIP balances
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
      ),
      TransactionTotals AS (
        SELECT 
          EOMONTH(TranDate) as month,
          SUM(
            CASE 
              WHEN TType = 'T' THEN ISNULL(Amount, 0)
              WHEN TType = 'D' THEN ISNULL(Amount, 0)
              WHEN TType = 'ADJ' THEN ISNULL(Amount, 0)
              WHEN TType = 'F' THEN -ISNULL(Amount, 0)
              WHEN TType = 'P' THEN ISNULL(Amount, 0)
              ELSE 0
            END
          ) as monthlyChange
        FROM WIPTransactions
        WHERE ${Prisma.raw(partnerOrManagerField)} = ${employee.EmpCode}
          AND TranDate <= ${endDate}
          ${serviceLines && serviceLines.length > 0 ? Prisma.sql`
            AND TaskCode IN (
              SELECT TaskCode FROM Task t
              INNER JOIN ServiceLineExternal sle ON t.ServLineCode = sle.ServLineCode
              WHERE sle.masterCode IN (${Prisma.join(serviceLines)})
            )
          ` : Prisma.empty}
        GROUP BY EOMONTH(TranDate)
      ),
      RunningTotals AS (
        SELECT 
          month,
          SUM(monthlyChange) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as wipBalance
        FROM TransactionTotals
      )
      SELECT 
        m.month,
        ISNULL(r.wipBalance, 0) as wipBalance
      FROM MonthSeries m
      LEFT JOIN RunningTotals r ON m.month = r.month
      ORDER BY m.month
      OPTION (MAXRECURSION 100)
    `,
  ]);

  // Build monthly metrics
  const monthlyMetricsMap = new Map<string, Partial<MonthlyMetrics>>();
  
  let currentMonth = startOfMonth(startDate);
  const endOfPeriod = endOfMonth(endDate);
  while (currentMonth <= endOfPeriod) {
    const monthKey = format(currentMonth, 'yyyy-MM');
    monthlyMetricsMap.set(monthKey, {
      month: monthKey,
      netRevenue: 0,
      grossProfit: 0,
      collections: 0,
      wipLockupDays: 0,
      debtorsLockupDays: 0,
      writeoffPercentage: 0,
    });
    currentMonth = startOfMonth(subMonths(currentMonth, -1));
  }

  // Process WIP data
  const wipDataForDisplay = isCumulative && wipCumulativeData.length > 0 ? wipCumulativeData : wipMonthlyData;
  
  wipDataForDisplay.forEach(row => {
    const monthKey = format(new Date(row.month), 'yyyy-MM');
    const metrics = monthlyMetricsMap.get(monthKey);
    if (metrics) {
      const grossProduction = row.ltdTime; // Gross Production = Time only
      const netRevenue = row.ltdTime + row.ltdAdj; // Net Revenue = Time + Adjustments
      const grossProfit = netRevenue - row.ltdCost;
      
      const writeoffAmount = Math.abs(row.negativeAdj) + row.ltdProvision;
      const writeoffPercentage = row.ltdTime !== 0 ? (writeoffAmount / row.ltdTime) * 100 : 0;

      metrics.netRevenue = netRevenue;
      metrics.grossProfit = grossProfit;
      metrics.writeoffPercentage = writeoffPercentage;
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
      const monthDate = new Date(row.month);
      const trailing12Start = subMonths(monthDate, 11);
      
      let trailing12Revenue = 0;
      wipMonthlyData.forEach(wipRow => {
        const wipDate = new Date(wipRow.month);
        if (wipDate >= trailing12Start && wipDate <= monthDate) {
          // Net Revenue = Time + Adjustments
          trailing12Revenue += wipRow.ltdTime + wipRow.ltdAdj;
        }
      });

      metrics.wipLockupDays = trailing12Revenue !== 0 ? (row.wipBalance * 365) / trailing12Revenue : 0;
      metrics.wipBalance = row.wipBalance;
      metrics.trailing12Revenue = trailing12Revenue;
    }
  });

  // Process Debtors Lockup Days
  debtorsBalances.forEach(row => {
    const monthKey = format(startOfMonth(new Date(row.month)), 'yyyy-MM');
    const metrics = monthlyMetricsMap.get(monthKey);
    if (metrics) {
      const monthDate = new Date(row.month);
      const trailing12Start = subMonths(monthDate, 11);
      
      let trailing12Billings = 0;
      netBillingsData.forEach(billRow => {
        const billDate = new Date(billRow.month);
        if (billDate >= trailing12Start && billDate <= monthDate) {
          trailing12Billings += billRow.netBillings;
        }
      });

      metrics.debtorsLockupDays = trailing12Billings !== 0 ? (row.balance * 365) / trailing12Billings : 0;
      metrics.debtorsBalance = row.balance;
      metrics.trailing12Billings = trailing12Billings;
    }
  });

  return Array.from(monthlyMetricsMap.values())
    .sort((a, b) => a.month!.localeCompare(b.month!))
    .map(m => m as MonthlyMetrics);
}

/**
 * GET /api/my-reports/overview
 * 
 * Returns monthly metrics - supports fiscal year, custom date range, or rolling 24-month
 * Query params:
 *  - fiscalYear: number (e.g., 2024 for FY2024)
 *  - startDate: ISO date string (for custom range)
 *  - endDate: ISO date string (for custom range)
 *  - mode: 'fiscal' | 'custom' (defaults to 'fiscal')
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    try {
      const startTime = Date.now();

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const fiscalYearParam = searchParams.get('fiscalYear');
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');
      const mode = (searchParams.get('mode') || 'fiscal') as 'fiscal' | 'custom';
      const serviceLines = searchParams.get('serviceLines')
        ?.split(',')
        .filter(Boolean)
        .map(sl => sl.trim().toUpperCase()) || [];

      // Determine fiscal year
      const currentFY = getCurrentFiscalPeriod().fiscalYear;
      const fiscalYear = fiscalYearParam === 'all' ? 'all' : (fiscalYearParam ? parseInt(fiscalYearParam, 10) : currentFY);

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
        fiscalYear,
        mode,
      });

      // 2. Determine filter mode based on employee category
      const partnerCategories = ['CARL', 'Local', 'DIR'];
      const isPartnerReport = partnerCategories.includes(employee.EmpCatCode);
      const filterMode = isPartnerReport ? 'PARTNER' : 'MANAGER';

      // 4. Determine filter field - WIPTransactions has TaskPartner/TaskManager directly
      const partnerOrManagerField = isPartnerReport ? 'TaskPartner' : 'TaskManager';

      // Handle 'all' years mode - fetch 3 years in parallel
      if (fiscalYear === 'all' && mode === 'fiscal') {
        const years = [currentFY, currentFY - 1, currentFY - 2];
        
        // Check cache for multi-year data
        const serviceLineKey = serviceLines.length > 0 ? serviceLines.join(',') : 'all';
        const cacheKey = `${CACHE_PREFIXES.USER}my-reports:overview:all-years:${serviceLineKey}:${user.id}`;
        const cached = await cache.get<MyReportsOverviewData>(cacheKey);
        if (cached) {
          logger.info('Returning cached multi-year overview report', { userId: user.id, filterMode });
          return NextResponse.json(successResponse(cached));
        }

        logger.info('Fetching multi-year overview report', { userId: user.id, years });

        // Fetch all years in parallel
        const yearlyDataArray = await Promise.all(
          years.map(fy => fetchMetricsForFiscalYear(employee, fy, partnerOrManagerField, serviceLines.length > 0 ? serviceLines : undefined))
        );

        // Build yearlyData object
        const yearlyData: { [year: string]: MonthlyMetrics[] } = {};
        years.forEach((year, index) => {
          yearlyData[year.toString()] = yearlyDataArray[index];
        });

        const report: MyReportsOverviewData = {
          yearlyData,
          filterMode,
          employeeCode: employee.EmpCode,
          fiscalYear: 'all',
          isCumulative: true,
        };

        // Cache multi-year data for 30 minutes
        await cache.set(cacheKey, report, 1800);

        logger.info('Multi-year overview report generated', {
          userId: user.id,
          filterMode,
          yearCount: years.length,
        });

        return NextResponse.json(successResponse(report));
      }

      // Handle fiscal year single-year mode
      if (mode === 'fiscal' && typeof fiscalYear === 'number') {
        const serviceLineKey = serviceLines.length > 0 ? serviceLines.join(',') : 'all';
        const cacheKey = `${CACHE_PREFIXES.USER}my-reports:overview:fy${fiscalYear}:${serviceLineKey}:${user.id}`;
        
        const cached = await cache.get<MyReportsOverviewData>(cacheKey);
        if (cached) {
          logger.info('Returning cached overview report', { userId: user.id, filterMode, mode, fiscalYear });
          return NextResponse.json(successResponse(cached));
        }

        logger.info('Fetching fiscal year overview report', { userId: user.id, fiscalYear, serviceLines: serviceLineKey });

        const monthlyMetrics = await fetchMetricsForFiscalYear(employee, fiscalYear, partnerOrManagerField, serviceLines.length > 0 ? serviceLines : undefined);

        const report: MyReportsOverviewData = {
          monthlyMetrics,
          filterMode,
          employeeCode: employee.EmpCode,
          fiscalYear,
          isCumulative: true,
        };

        // Cache - use longer TTL for past fiscal years
        const cacheTTL = fiscalYear < currentFY ? 3600 : 1800;
        await cache.set(cacheKey, report, cacheTTL);

        // Background cache past fiscal years
        if (fiscalYear === currentFY) {
          cachePastFiscalYearsInBackground(user.id, employee, filterMode, currentFY);
        }

        logger.info('Fiscal year overview report generated', {
          userId: user.id,
          filterMode,
          fiscalYear,
          monthCount: monthlyMetrics.length,
        });

        return NextResponse.json(successResponse(report));
      }

      // Handle custom date range mode
      let startDate: Date;
      let endDate: Date;
      let isCumulative = true;
      
      if (mode === 'custom' && startDateParam && endDateParam) {
        startDate = startOfMonth(parseISO(startDateParam));
        endDate = endOfMonth(parseISO(endDateParam));
      } else {
        throw new AppError(400, 'Invalid request: custom mode requires startDate and endDate', ErrorCodes.VALIDATION_ERROR);
      }

      const serviceLineKey = serviceLines.length > 0 ? serviceLines.join(',') : 'all';
      const cacheKey = `${CACHE_PREFIXES.USER}my-reports:overview:custom:${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}:${serviceLineKey}:${user.id}`;
      
      const cached = await cache.get<MyReportsOverviewData>(cacheKey);
      if (cached) {
        logger.info('Returning cached custom date range overview report', { userId: user.id, filterMode });
        return NextResponse.json(successResponse(cached));
      }

      // Execute queries for custom date range
      const queryStartTime = Date.now();
      const [
        wipCumulativeData,
        wipMonthlyData, 
        collectionsData, 
        netBillingsData, 
        debtorsBalances, 
        wipBalances
      ] = await Promise.all([
        // 5a. WIP cumulative for display (fiscal year range only)
        isCumulative
          ? prisma.$queryRaw<WipMonthlyResult[]>(
              buildWipMonthlyAggregationQuery(
                partnerOrManagerField,
                employee.EmpCode,
                startDate,
                endDate,
                true, // Cumulative for display
                serviceLines.length > 0 ? serviceLines : undefined
              )
            )
          : Promise.resolve([]), // Skip if not cumulative mode

        // 5b. WIP non-cumulative for lockup calculations
        // Always fetch this with 12 extra months for trailing calculations
        prisma.$queryRaw<WipMonthlyResult[]>(
          buildWipMonthlyAggregationQuery(
            partnerOrManagerField,
            employee.EmpCode,
            subMonths(startDate, 12),
            endDate,
            false, // Non-cumulative for lockup calculations
            serviceLines.length > 0 ? serviceLines : undefined
          )
        ),

        // 6. Collections
        prisma.$queryRaw<CollectionsMonthlyResult[]>(
          buildCollectionsMonthlyQuery(
            employee.EmpCode,
            startDate,
            endDate,
            isCumulative, // Cumulative for display
            serviceLines.length > 0 ? serviceLines : undefined
          )
        ),

        // 7. Net Billings for Debtors Lockup calculation (always non-cumulative for trailing calc)
        prisma.$queryRaw<NetBillingsMonthlyResult[]>(
          buildNetBillingsMonthlyQuery(
            employee.EmpCode,
            subMonths(startDate, 12),
            endDate,
            false, // Non-cumulative for lockup calculations
            serviceLines.length > 0 ? serviceLines : undefined
          )
        ),

        // 8. Debtors balances by month (OPTIMIZED: window function for running total)
        // Single scan with running total vs correlated subquery for each month
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
          ),
          TransactionTotals AS (
            SELECT 
              EOMONTH(TranDate) as month,
              SUM(ISNULL(Total, 0)) as monthlyChange
            FROM DrsTransactions
            WHERE Biller = ${employee.EmpCode}
              AND TranDate <= ${endDate}
              ${serviceLines && serviceLines.length > 0 ? Prisma.sql`
                AND ServLineCode IN (
                  SELECT ServLineCode FROM ServiceLineExternal sle
                  WHERE sle.masterCode IN (${Prisma.join(serviceLines)})
                )
              ` : Prisma.empty}
            GROUP BY EOMONTH(TranDate)
          ),
          RunningTotals AS (
            SELECT 
              month,
              SUM(monthlyChange) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as balance
            FROM TransactionTotals
          )
          SELECT 
            m.month,
            ISNULL(r.balance, 0) as balance
          FROM MonthSeries m
          LEFT JOIN RunningTotals r ON m.month = r.month
          ORDER BY m.month
          OPTION (MAXRECURSION 100)
        `,

        // 9. WIP balances by month-end (OPTIMIZED: window function for running total)
        // Single scan with running total vs correlated subquery for each month
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
          ),
          TransactionTotals AS (
            SELECT 
              EOMONTH(TranDate) as month,
              SUM(
                CASE 
                  WHEN TType = 'T' THEN ISNULL(Amount, 0)
                  WHEN TType = 'D' THEN ISNULL(Amount, 0)
                  WHEN TType = 'ADJ' THEN ISNULL(Amount, 0)
                  WHEN TType = 'F' THEN -ISNULL(Amount, 0)
                  WHEN TType = 'P' THEN ISNULL(Amount, 0)
                  ELSE 0
                END
              ) as monthlyChange
            FROM WIPTransactions
            WHERE ${Prisma.raw(partnerOrManagerField)} = ${employee.EmpCode}
              AND TranDate <= ${endDate}
              ${serviceLines && serviceLines.length > 0 ? Prisma.sql`
                AND TaskCode IN (
                  SELECT TaskCode FROM Task t
                  INNER JOIN ServiceLineExternal sle ON t.ServLineCode = sle.ServLineCode
                  WHERE sle.masterCode IN (${Prisma.join(serviceLines)})
                )
              ` : Prisma.empty}
            GROUP BY EOMONTH(TranDate)
          ),
          RunningTotals AS (
            SELECT 
              month,
              SUM(monthlyChange) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as wipBalance
            FROM TransactionTotals
          )
          SELECT 
            m.month,
            ISNULL(r.wipBalance, 0) as wipBalance
          FROM MonthSeries m
          LEFT JOIN RunningTotals r ON m.month = r.month
          ORDER BY m.month
          OPTION (MAXRECURSION 100)
        `,
      ]);

      const queryDuration = Date.now() - queryStartTime;
      logger.info('My Reports queries completed', {
        userId: user.id,
        queryDurationMs: queryDuration,
        filterMode,
        wipMonthlyCount: wipMonthlyData.length,
        debtorsBalanceCount: debtorsBalances.length,
        wipBalanceCount: wipBalances.length,
      });

      // 10. Build monthly metrics array
      const monthlyMetricsMap = new Map<string, Partial<MonthlyMetrics>>();
      
      // Initialize months for the selected period
      let currentMonth = startOfMonth(startDate);
      const endOfPeriod = endOfMonth(endDate);
      while (currentMonth <= endOfPeriod) {
        const monthKey = format(currentMonth, 'yyyy-MM');
        monthlyMetricsMap.set(monthKey, {
          month: monthKey,
          netRevenue: 0,
          grossProfit: 0,
          collections: 0,
          wipLockupDays: 0,
          debtorsLockupDays: 0,
          writeoffPercentage: 0,
        });
        currentMonth = startOfMonth(subMonths(currentMonth, -1)); // Next month
      }

      // Process WIP data
      // Use cumulative data for display if available, otherwise use monthly data
      const wipDataForDisplay = isCumulative && wipCumulativeData.length > 0 ? wipCumulativeData : wipMonthlyData;
      
      wipDataForDisplay.forEach(row => {
        const monthKey = format(new Date(row.month), 'yyyy-MM');
        const metrics = monthlyMetricsMap.get(monthKey);
        if (metrics) {
          const grossProduction = row.ltdTime; // Gross Production = Time only
          const netRevenue = row.ltdTime + row.ltdAdj; // Net Revenue = Time + Adjustments
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
              // Net Revenue = Time + Adjustments
              trailing12Revenue += wipRow.ltdTime + wipRow.ltdAdj;
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
        dateRange: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
        },
        isCumulative,
      };

      // Cache custom date range for 30 minutes
      await cache.set(cacheKey, report, 1800);

      const duration = Date.now() - startTime;
      logger.info('Custom date range overview report generated', {
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

