/**
 * Month Series SQL Utilities
 * 
 * Provides reusable SQL fragments for generating month series CTEs
 * Used for time-series reports requiring month-end dates
 */

import { Prisma } from '@prisma/client';

/**
 * Generate a Month Series CTE that produces month-end dates
 * Uses recursive CTE to generate EOMONTH dates from start to end
 * 
 * @param startDate - Start date (will use EOMONTH of this date)
 * @param endDate - End date (will use EOMONTH of this date)
 * @returns Prisma.Sql fragment for use in $queryRaw
 * 
 * @example
 * const monthSeriesCTE = generateMonthSeriesCTE(startDate, endDate);
 * prisma.$queryRaw`
 *   ${monthSeriesCTE}
 *   SELECT m.month FROM MonthSeries m
 *   OPTION (MAXRECURSION 100)
 * `
 */
export function generateMonthSeriesCTE(startDate: Date, endDate: Date): Prisma.Sql {
  return Prisma.sql`
    WITH MonthSeries AS (
      SELECT EOMONTH(${startDate}) as month
      UNION ALL
      SELECT EOMONTH(DATEADD(MONTH, 1, month))
      FROM MonthSeries
      WHERE month < EOMONTH(${endDate})
    )`;
}

/**
 * Generate a Month Series CTE with a custom CTE name
 * Useful when combining with other CTEs in the same query
 * 
 * @param startDate - Start date (will use EOMONTH of this date)
 * @param endDate - End date (will use EOMONTH of this date)
 * @param cteName - Name for the CTE (default: 'MonthSeries')
 * @returns Prisma.Sql fragment for use in $queryRaw
 */
export function generateNamedMonthSeriesCTE(
  startDate: Date,
  endDate: Date,
  cteName: string = 'MonthSeries'
): Prisma.Sql {
  return Prisma.sql`
    ${Prisma.raw(cteName)} AS (
      SELECT EOMONTH(${startDate}) as month
      UNION ALL
      SELECT EOMONTH(DATEADD(MONTH, 1, month))
      FROM ${Prisma.raw(cteName)}
      WHERE month < EOMONTH(${endDate})
    )`;
}
