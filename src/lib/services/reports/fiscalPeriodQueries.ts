/**
 * Fiscal Period Query Helpers
 * 
 * Utilities for filtering database queries by fiscal periods
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  getFiscalYearRange,
  getFiscalQuarterRange,
  getFiscalMonthRange,
  type FiscalPeriodFilter,
} from '@/lib/utils/fiscalPeriod';

/**
 * Build Prisma where clause for filtering by fiscal year
 * Returns date range filter for any DateTime field
 * 
 * @example
 * const where = {
 *   ...buildFiscalYearFilter(2024, 'TranDate')
 * };
 * prisma.drsTransactions.findMany({ where });
 */
export function buildFiscalYearFilter(
  fiscalYear: number,
  dateField: string = 'TranDate'
): Record<string, any> {
  const { start, end } = getFiscalYearRange(fiscalYear);
  
  return {
    [dateField]: {
      gte: start,
      lte: end,
    },
  };
}

/**
 * Build Prisma where clause for filtering by fiscal quarter
 * 
 * @example
 * const where = {
 *   ...buildFiscalQuarterFilter(2024, 2, 'TranDate')
 * };
 * prisma.wIPTransactions.findMany({ where });
 */
export function buildFiscalQuarterFilter(
  fiscalYear: number,
  fiscalQuarter: number,
  dateField: string = 'TranDate'
): Record<string, any> {
  const { start, end } = getFiscalQuarterRange(fiscalYear, fiscalQuarter);
  
  return {
    [dateField]: {
      gte: start,
      lte: end,
    },
  };
}

/**
 * Build Prisma where clause for filtering by fiscal month
 * 
 * @example
 * const where = {
 *   ...buildFiscalMonthFilter(2024, 1, 'TranDate')
 * };
 * prisma.drsTransactions.findMany({ where });
 */
export function buildFiscalMonthFilter(
  fiscalYear: number,
  fiscalMonth: number,
  dateField: string = 'TranDate'
): Record<string, any> {
  const { start, end } = getFiscalMonthRange(fiscalYear, fiscalMonth);
  
  return {
    [dateField]: {
      gte: start,
      lte: end,
    },
  };
}

/**
 * Build flexible fiscal period filter based on provided parameters
 * Auto-detects whether to filter by year, quarter, or month
 * 
 * @example
 * // Filter by fiscal year
 * const where = buildFiscalPeriodFilter({ fiscalYear: 2024 }, 'TranDate');
 * 
 * // Filter by quarter
 * const where = buildFiscalPeriodFilter({ fiscalYear: 2024, fiscalQuarter: 2 }, 'TranDate');
 * 
 * // Filter by month
 * const where = buildFiscalPeriodFilter({ fiscalYear: 2024, fiscalMonth: 5 }, 'TranDate');
 */
export function buildFiscalPeriodFilter(
  filter: FiscalPeriodFilter,
  dateField: string = 'TranDate'
): Record<string, any> {
  const { fiscalYear, fiscalQuarter, fiscalMonth } = filter;
  
  if (!fiscalYear) {
    return {};
  }
  
  // Most specific filter wins
  if (fiscalMonth !== undefined) {
    return buildFiscalMonthFilter(fiscalYear, fiscalMonth, dateField);
  } else if (fiscalQuarter !== undefined) {
    return buildFiscalQuarterFilter(fiscalYear, fiscalQuarter, dateField);
  } else {
    return buildFiscalYearFilter(fiscalYear, dateField);
  }
}

/**
 * Get available fiscal periods from the database
 * Useful for populating dropdowns and filters
 * 
 * @example
 * const years = await getFiscalPeriods({ groupBy: 'year' });
 * const quarters = await getFiscalPeriods({ fiscalYear: 2024, groupBy: 'quarter' });
 */
export async function getFiscalPeriods(options: {
  fiscalYear?: number;
  fiscalQuarter?: number;
  groupBy?: 'year' | 'quarter' | 'month';
  orderBy?: 'asc' | 'desc';
} = {}) {
  const { fiscalYear, fiscalQuarter, groupBy = 'month', orderBy = 'asc' } = options;
  
  const where: Prisma.FiscalPeriodWhereInput = {};
  
  if (fiscalYear !== undefined) {
    where.fiscalYear = fiscalYear;
  }
  
  if (fiscalQuarter !== undefined) {
    where.fiscalQuarter = fiscalQuarter;
  }
  
  if (groupBy === 'year') {
    // Get distinct fiscal years
    const result = await prisma.fiscalPeriod.groupBy({
      by: ['fiscalYear'],
      _min: {
        startDate: true,
      },
      _max: {
        endDate: true,
      },
      where,
      orderBy: {
        fiscalYear: orderBy,
      },
    });
    
    return result.map(r => ({
      fiscalYear: r.fiscalYear,
      startDate: r._min.startDate,
      endDate: r._max.endDate,
      label: `FY${r.fiscalYear}`,
    }));
  } else if (groupBy === 'quarter') {
    // Get distinct fiscal quarters
    const result = await prisma.fiscalPeriod.groupBy({
      by: ['fiscalYear', 'fiscalQuarter'],
      _min: {
        startDate: true,
        quarterName: true,
      },
      _max: {
        endDate: true,
      },
      where,
      orderBy: [
        { fiscalYear: orderBy },
        { fiscalQuarter: orderBy },
      ],
    });
    
    return result.map(r => ({
      fiscalYear: r.fiscalYear,
      fiscalQuarter: r.fiscalQuarter,
      startDate: r._min.startDate,
      endDate: r._max.endDate,
      label: r._min.quarterName,
    }));
  } else {
    // Get all fiscal months
    const result = await prisma.fiscalPeriod.findMany({
      where,
      select: {
        periodKey: true,
        fiscalYear: true,
        fiscalQuarter: true,
        fiscalMonth: true,
        calendarMonth: true,
        calendarYear: true,
        startDate: true,
        endDate: true,
        periodName: true,
        quarterName: true,
      },
      orderBy: [
        { fiscalYear: orderBy },
        { fiscalMonth: orderBy },
      ],
    });
    
    return result.map(r => ({
      ...r,
      label: r.periodName,
    }));
  }
}

/**
 * Get fiscal year range for available data in a table
 * Useful for determining the min/max fiscal years that have data
 * 
 * @example
 * const range = await getDataFiscalYearRange('DrsTransactions', 'TranDate');
 * // Returns { minFiscalYear: 2020, maxFiscalYear: 2024 }
 */
export async function getDataFiscalYearRange(
  tableName: string,
  dateField: string = 'TranDate'
): Promise<{ minFiscalYear: number; maxFiscalYear: number } | null> {
  try {
    // Get min and max dates from the table using raw SQL
    const result = await prisma.$queryRawUnsafe<
      Array<{ minDate: Date | null; maxDate: Date | null }>
    >(
      `SELECT MIN(${dateField}) as minDate, MAX(${dateField}) as maxDate FROM ${tableName}`
    );
    
    if (!result[0] || !result[0].minDate || !result[0].maxDate) {
      return null;
    }
    
    const { minDate, maxDate } = result[0];
    
    // Use SQL functions to get fiscal years
    const fiscalYearResult = await prisma.$queryRawUnsafe<
      Array<{ minFiscalYear: number; maxFiscalYear: number }>
    >(
      `SELECT dbo.GetFiscalYear(@0) as minFiscalYear, dbo.GetFiscalYear(@1) as maxFiscalYear`,
      minDate,
      maxDate
    );
    
    if (!fiscalYearResult[0]) {
      return null;
    }
    
    return fiscalYearResult[0];
  } catch (error) {
    console.error(`Error getting fiscal year range for ${tableName}:`, error);
    return null;
  }
}

/**
 * Build SQL WHERE clause for raw queries using SQL fiscal functions
 * 
 * @example
 * const sql = `
 *   SELECT * FROM DrsTransactions
 *   WHERE ${buildFiscalPeriodSqlFilter({ fiscalYear: 2024 }, 'TranDate')}
 * `;
 */
export function buildFiscalPeriodSqlFilter(
  filter: FiscalPeriodFilter,
  dateField: string = 'TranDate'
): string {
  const { fiscalYear, fiscalQuarter, fiscalMonth } = filter;
  
  if (!fiscalYear) {
    return '1=1'; // No filter
  }
  
  const conditions: string[] = [];
  
  conditions.push(`dbo.GetFiscalYear(${dateField}) = ${fiscalYear}`);
  
  if (fiscalQuarter !== undefined) {
    conditions.push(`dbo.GetFiscalQuarter(${dateField}) = ${fiscalQuarter}`);
  }
  
  if (fiscalMonth !== undefined) {
    conditions.push(`dbo.GetFiscalMonth(${dateField}) = ${fiscalMonth}`);
  }
  
  return conditions.join(' AND ');
}

/**
 * Get fiscal period statistics for a table
 * Returns count of records per fiscal period
 * 
 * @example
 * const stats = await getFiscalPeriodStats('DrsTransactions', 'TranDate', { fiscalYear: 2024 });
 */
export async function getFiscalPeriodStats(
  tableName: string,
  dateField: string,
  filter: FiscalPeriodFilter = {}
): Promise<
  Array<{
    fiscalYear: number;
    fiscalQuarter: number;
    fiscalMonth: number;
    count: number;
  }>
> {
  const whereClause = buildFiscalPeriodSqlFilter(filter, dateField);
  
  const result = await prisma.$queryRawUnsafe<
    Array<{
      fiscalYear: number;
      fiscalQuarter: number;
      fiscalMonth: number;
      count: number;
    }>
  >(
    `
    SELECT 
      dbo.GetFiscalYear(${dateField}) as fiscalYear,
      dbo.GetFiscalQuarter(${dateField}) as fiscalQuarter,
      dbo.GetFiscalMonth(${dateField}) as fiscalMonth,
      COUNT(*) as count
    FROM ${tableName}
    WHERE ${whereClause}
    GROUP BY 
      dbo.GetFiscalYear(${dateField}),
      dbo.GetFiscalQuarter(${dateField}),
      dbo.GetFiscalMonth(${dateField})
    ORDER BY 
      dbo.GetFiscalYear(${dateField}),
      dbo.GetFiscalMonth(${dateField})
    `
  );
  
  return result;
}

