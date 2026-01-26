/**
 * WIP Balance Calculation SQL Utilities
 * 
 * Provides optimized SQL queries for calculating WIP balances using window functions.
 * Replaces inefficient correlated subqueries with single-scan aggregations.
 * 
 * Performance: O(n) single scan vs O(n*m) correlated subquery approach
 */

import { Prisma } from '@prisma/client';

/**
 * WIP Transaction Type multipliers for balance calculation
 * Net WIP = Time + Disbursements + Adjustments - Fees + Provisions
 */
export const WIP_TTYPE_MULTIPLIERS = {
  T: 1,      // Time - added
  D: 1,      // Disbursements - added
  ADJ: 1,    // Adjustments - added
  F: -1,     // Fees - subtracted (billing)
  P: 1,      // Provisions - added
} as const;

/**
 * Generate SQL CASE statement for WIP amount calculation by TType
 * Returns the Amount with correct sign based on transaction type
 * 
 * @returns Prisma.Sql fragment for CASE statement
 */
export function getWipAmountCaseExpression(): Prisma.Sql {
  return Prisma.sql`
    CASE 
      WHEN TType = 'T' THEN ISNULL(Amount, 0)
      WHEN TType = 'D' THEN ISNULL(Amount, 0)
      WHEN TType = 'ADJ' THEN ISNULL(Amount, 0)
      WHEN TType = 'F' THEN -ISNULL(Amount, 0)
      WHEN TType = 'P' THEN ISNULL(Amount, 0)
      ELSE 0
    END`;
}

/**
 * Build optimized WIP balance query using window functions
 * 
 * This replaces the correlated subquery approach:
 * - OLD: For each month, scan all transactions up to that month (O(n*m))
 * - NEW: Single scan with running total via window function (O(n))
 * 
 * @param filterField - 'TaskPartner' or 'TaskManager'
 * @param employeeCode - Employee code to filter by
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Prisma.Sql for complete query
 * 
 * @example
 * const query = buildOptimizedWipBalanceQuery('TaskPartner', 'EMP001', startDate, endDate);
 * const results = await prisma.$queryRaw(query);
 */
export function buildOptimizedWipBalanceQuery(
  filterField: 'TaskPartner' | 'TaskManager',
  employeeCode: string,
  startDate: Date,
  endDate: Date
): Prisma.Sql {
  const fieldFilter = filterField === 'TaskPartner' 
    ? Prisma.sql`TaskPartner = ${employeeCode}`
    : Prisma.sql`TaskManager = ${employeeCode}`;

  return Prisma.sql`
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
      WHERE ${fieldFilter}
        AND TranDate <= ${endDate}
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
  `;
}

/**
 * Build optimized Debtors balance query using window functions
 * 
 * Similar to WIP balance but for DrsTransactions table
 * 
 * @param billerCode - Employee code to filter by Biller column
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Prisma.Sql for complete query
 */
export function buildOptimizedDebtorsBalanceQuery(
  billerCode: string,
  startDate: Date,
  endDate: Date
): Prisma.Sql {
  return Prisma.sql`
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
      WHERE Biller = ${billerCode}
        AND TranDate <= ${endDate}
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
  `;
}

/**
 * Types for query results
 */
export interface WipBalanceResult {
  month: Date;
  wipBalance: number;
}

export interface DebtorsBalanceResult {
  month: Date;
  balance: number;
}
