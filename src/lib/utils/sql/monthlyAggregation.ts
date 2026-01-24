/**
 * Monthly Aggregation SQL Utilities
 * 
 * Provides query builders for monthly aggregations on WIPTransactions
 * and DrsTransactions tables. Uses YEAR(TranDate), MONTH(TranDate) for
 * GROUP BY operations.
 */

import { Prisma } from '@prisma/client';

/**
 * WIP Monthly Aggregation Result
 */
export interface WipMonthlyResult {
  month: Date;
  ltdTime: number;
  ltdDisb: number;
  ltdAdj: number;
  ltdCost: number;
  ltdFee: number;
  ltdProvision: number;
  negativeAdj: number;
}

/**
 * Collections Monthly Result
 */
export interface CollectionsMonthlyResult {
  month: Date;
  collections: number;
}

/**
 * Net Billings Monthly Result
 */
export interface NetBillingsMonthlyResult {
  month: Date;
  netBillings: number;
}

/**
 * Build WIP monthly aggregation query
 * 
 * Groups WIP transactions by month using YEAR(TranDate) and MONTH(TranDate).
 * 
 * @param filterField - 'TaskPartner' or 'TaskManager' (determines report type)
 * @param employeeCode - Employee code to filter by
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param cumulative - If true, returns cumulative totals (running sum), default false
 * @param serviceLines - Optional array of masterCode values to filter by service line
 * @returns Prisma.Sql for complete query
 * 
 * @example
 * // Monthly values
 * const query = buildWipMonthlyAggregationQuery('TaskPartner', 'EMP001', startDate, endDate);
 * // Cumulative values (fiscal year)
 * const cumulativeQuery = buildWipMonthlyAggregationQuery('TaskPartner', 'EMP001', startDate, endDate, true);
 * // With service line filter
 * const filteredQuery = buildWipMonthlyAggregationQuery('TaskPartner', 'EMP001', startDate, endDate, true, ['TAX', 'AUDIT']);
 * const results = await prisma.$queryRaw<WipMonthlyResult[]>(query);
 */
export function buildWipMonthlyAggregationQuery(
  filterField: 'TaskPartner' | 'TaskManager',
  employeeCode: string,
  startDate: Date,
  endDate: Date,
  cumulative: boolean = false,
  serviceLines?: string[]
): Prisma.Sql {
  // Build dynamic filter based on report type
  const fieldFilter = filterField === 'TaskPartner' 
    ? Prisma.sql`TaskPartner = ${employeeCode}`
    : Prisma.sql`TaskManager = ${employeeCode}`;

  // Build service line filter if provided
  const serviceLineFilter = serviceLines && serviceLines.length > 0
    ? Prisma.sql`
      AND TaskCode IN (
        SELECT TaskCode FROM Task t
        INNER JOIN ServiceLineExternal sle ON t.ServLineCode = sle.ServLineCode
        WHERE sle.masterCode IN (${Prisma.join(serviceLines)})
      )
    `
    : Prisma.empty;

  // Non-cumulative: monthly aggregations (existing behavior)
  if (!cumulative) {
    return Prisma.sql`
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
      WHERE ${fieldFilter}
        AND TranDate >= ${startDate}
        AND TranDate <= ${endDate}
        ${serviceLineFilter}
      GROUP BY YEAR(TranDate), MONTH(TranDate)
      ORDER BY YEAR(TranDate), MONTH(TranDate)
    `;
  }

  // Cumulative: running totals using window functions
  return Prisma.sql`
    WITH MonthlyTotals AS (
      SELECT 
        DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) as month,
        SUM(CASE WHEN TType = 'T' THEN ISNULL(Amount, 0) ELSE 0 END) as monthlyTime,
        SUM(CASE WHEN TType = 'D' THEN ISNULL(Amount, 0) ELSE 0 END) as monthlyDisb,
        SUM(CASE WHEN TType = 'ADJ' THEN ISNULL(Amount, 0) ELSE 0 END) as monthlyAdj,
        SUM(CASE WHEN TType != 'P' THEN ISNULL(Cost, 0) ELSE 0 END) as monthlyCost,
        SUM(CASE WHEN TType = 'F' THEN ISNULL(Amount, 0) ELSE 0 END) as monthlyFee,
        SUM(CASE WHEN TType = 'P' THEN ISNULL(Amount, 0) ELSE 0 END) as monthlyProvision,
        SUM(CASE WHEN TType = 'ADJ' AND Amount < 0 THEN ISNULL(Amount, 0) ELSE 0 END) as monthlyNegativeAdj
      FROM WIPTransactions
      WHERE ${fieldFilter}
        AND TranDate >= ${startDate}
        AND TranDate <= ${endDate}
        ${serviceLineFilter}
      GROUP BY YEAR(TranDate), MONTH(TranDate)
    )
    SELECT 
      month,
      SUM(monthlyTime) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as ltdTime,
      SUM(monthlyDisb) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as ltdDisb,
      SUM(monthlyAdj) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as ltdAdj,
      SUM(monthlyCost) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as ltdCost,
      SUM(monthlyFee) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as ltdFee,
      SUM(monthlyProvision) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as ltdProvision,
      SUM(monthlyNegativeAdj) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as negativeAdj
    FROM MonthlyTotals
    ORDER BY month
  `;
}

/**
 * Build Collections monthly aggregation query
 * 
 * Aggregates DRS receipt transactions by month using YEAR(TranDate) and MONTH(TranDate).
 * Receipts are stored as negative amounts, so we negate to get positive collections.
 * 
 * @param billerCode - Employee code (Biller column)
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param cumulative - If true, returns cumulative totals (running sum), default false
 * @param serviceLines - Optional array of masterCode values to filter by service line
 * @returns Prisma.Sql for complete query
 * 
 * @example
 * const query = buildCollectionsMonthlyQuery('EMP001', startDate, endDate);
 * const results = await prisma.$queryRaw<CollectionsMonthlyResult[]>(query);
 */
export function buildCollectionsMonthlyQuery(
  billerCode: string,
  startDate: Date,
  endDate: Date,
  cumulative: boolean = false,
  serviceLines?: string[]
): Prisma.Sql {
  // Build service line filter if provided
  // Note: DrsTransactions has ServLineCode directly, not TaskCode
  const serviceLineFilter = serviceLines && serviceLines.length > 0
    ? Prisma.sql`
      AND ServLineCode IN (
        SELECT ServLineCode FROM ServiceLineExternal sle
        WHERE sle.masterCode IN (${Prisma.join(serviceLines)})
      )
    `
    : Prisma.empty;

  // Non-cumulative: monthly aggregations (existing behavior)
  if (!cumulative) {
    return Prisma.sql`
      SELECT 
        DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) as month,
        SUM(-ISNULL(Total, 0)) as collections
      FROM DrsTransactions
      WHERE Biller = ${billerCode}
        AND EntryType = 'Receipt'
        AND TranDate >= ${startDate}
        AND TranDate <= ${endDate}
        ${serviceLineFilter}
      GROUP BY YEAR(TranDate), MONTH(TranDate)
      ORDER BY YEAR(TranDate), MONTH(TranDate)
    `;
  }

  // Cumulative: running totals using window functions
  return Prisma.sql`
    WITH MonthlyCollections AS (
      SELECT 
        DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) as month,
        SUM(-ISNULL(Total, 0)) as monthlyCollections
      FROM DrsTransactions
      WHERE Biller = ${billerCode}
        AND EntryType = 'Receipt'
        AND TranDate >= ${startDate}
        AND TranDate <= ${endDate}
        ${serviceLineFilter}
      GROUP BY YEAR(TranDate), MONTH(TranDate)
    )
    SELECT 
      month,
      SUM(monthlyCollections) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as collections
    FROM MonthlyCollections
    ORDER BY month
  `;
}

/**
 * Build Net Billings monthly aggregation query
 * 
 * Aggregates all DRS transactions EXCEPT receipts (invoices, credit notes, adjustments).
 * Used for Debtors Lockup calculation (trailing 12-month net billings).
 * 
 * @param billerCode - Employee code (Biller column)
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param cumulative - If true, returns cumulative totals (running sum), default false
 * @param serviceLines - Optional array of masterCode values to filter by service line
 * @returns Prisma.Sql for complete query
 * 
 * @example
 * const query = buildNetBillingsMonthlyQuery('EMP001', startDate, endDate);
 * const results = await prisma.$queryRaw<NetBillingsMonthlyResult[]>(query);
 */
export function buildNetBillingsMonthlyQuery(
  billerCode: string,
  startDate: Date,
  endDate: Date,
  cumulative: boolean = false,
  serviceLines?: string[]
): Prisma.Sql {
  // Build service line filter if provided
  // Note: DrsTransactions has ServLineCode directly, not TaskCode
  const serviceLineFilter = serviceLines && serviceLines.length > 0
    ? Prisma.sql`
      AND ServLineCode IN (
        SELECT ServLineCode FROM ServiceLineExternal sle
        WHERE sle.masterCode IN (${Prisma.join(serviceLines)})
      )
    `
    : Prisma.empty;

  // Non-cumulative: monthly aggregations (existing behavior)
  if (!cumulative) {
    return Prisma.sql`
      SELECT 
        DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) as month,
        SUM(ISNULL(Total, 0)) as netBillings
      FROM DrsTransactions
      WHERE Biller = ${billerCode}
        AND TranDate >= ${startDate}
        AND TranDate <= ${endDate}
        AND (EntryType IS NULL OR EntryType != 'Receipt')
        ${serviceLineFilter}
      GROUP BY YEAR(TranDate), MONTH(TranDate)
      ORDER BY YEAR(TranDate), MONTH(TranDate)
    `;
  }

  // Cumulative: running totals using window functions
  return Prisma.sql`
    WITH MonthlyBillings AS (
      SELECT 
        DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) as month,
        SUM(ISNULL(Total, 0)) as monthlyBillings
      FROM DrsTransactions
      WHERE Biller = ${billerCode}
        AND TranDate >= ${startDate}
        AND TranDate <= ${endDate}
        AND (EntryType IS NULL OR EntryType != 'Receipt')
        ${serviceLineFilter}
      GROUP BY YEAR(TranDate), MONTH(TranDate)
    )
    SELECT 
      month,
      SUM(monthlyBillings) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as netBillings
    FROM MonthlyBillings
    ORDER BY month
  `;
}
