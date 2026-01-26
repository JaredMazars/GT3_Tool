/**
 * Fiscal Period Utilities
 * 
 * Fiscal year runs from September to August
 * FY2024 = September 2023 to August 2024
 */

export interface FiscalPeriodInfo {
  fiscalYear: number;
  fiscalQuarter: number;
  fiscalMonth: number;
  calendarMonth: number;
  calendarYear: number;
  periodName: string;
  quarterName: string;
}

export interface FiscalPeriodFilter {
  fiscalYear?: number;
  fiscalQuarter?: number;
  fiscalMonth?: number;
}

export interface FiscalYearRange {
  start: Date;
  end: Date;
}

const FISCAL_YEAR_START_MONTH = 9; // September

/**
 * Get fiscal year from a date
 * If month >= September, fiscal year is calendar year + 1
 * Otherwise, fiscal year is calendar year
 * 
 * @example
 * getFiscalYear(new Date('2023-09-01')) // Returns 2024
 * getFiscalYear(new Date('2024-08-31')) // Returns 2024
 * getFiscalYear(new Date('2024-01-15')) // Returns 2024
 */
export function getFiscalYear(date: Date): number {
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  const year = date.getFullYear();
  
  return month >= FISCAL_YEAR_START_MONTH ? year + 1 : year;
}

/**
 * Get fiscal month (1-12) from a date
 * Month 1 = September
 * Month 12 = August
 * 
 * @example
 * getFiscalMonth(new Date('2023-09-01')) // Returns 1
 * getFiscalMonth(new Date('2024-01-15')) // Returns 5
 * getFiscalMonth(new Date('2024-08-31')) // Returns 12
 */
export function getFiscalMonth(date: Date): number {
  const calendarMonth = date.getMonth() + 1; // getMonth() is 0-indexed
  
  // Convert calendar month to fiscal month
  // Sep (9) -> 1, Oct (10) -> 2, ..., Aug (8) -> 12
  if (calendarMonth >= FISCAL_YEAR_START_MONTH) {
    return calendarMonth - FISCAL_YEAR_START_MONTH + 1;
  } else {
    return calendarMonth + (12 - FISCAL_YEAR_START_MONTH) + 1;
  }
}

/**
 * Get fiscal quarter (1-4) from a date
 * Q1: Sep-Nov (fiscal months 1-3)
 * Q2: Dec-Feb (fiscal months 4-6)
 * Q3: Mar-May (fiscal months 7-9)
 * Q4: Jun-Aug (fiscal months 10-12)
 * 
 * @example
 * getFiscalQuarter(new Date('2023-09-01')) // Returns 1 (Q1)
 * getFiscalQuarter(new Date('2024-01-15')) // Returns 2 (Q2)
 * getFiscalQuarter(new Date('2024-06-30')) // Returns 4 (Q4)
 */
export function getFiscalQuarter(date: Date): number {
  const fiscalMonth = getFiscalMonth(date);
  
  if (fiscalMonth >= 1 && fiscalMonth <= 3) return 1;
  if (fiscalMonth >= 4 && fiscalMonth <= 6) return 2;
  if (fiscalMonth >= 7 && fiscalMonth <= 9) return 3;
  if (fiscalMonth >= 10 && fiscalMonth <= 12) return 4;
  
  throw new Error(`Invalid fiscal month: ${fiscalMonth}`);
}

/**
 * Get fiscal period key (YYYYMM format) from a date
 * Used for joining to FiscalPeriod table
 * 
 * @example
 * getFiscalPeriodKey(new Date('2023-09-15')) // Returns 202401 (FY2024 Month 1)
 * getFiscalPeriodKey(new Date('2024-08-15')) // Returns 202412 (FY2024 Month 12)
 */
export function getFiscalPeriodKey(date: Date): number {
  const fiscalYear = getFiscalYear(date);
  const fiscalMonth = getFiscalMonth(date);
  
  return fiscalYear * 100 + fiscalMonth;
}

/**
 * Get complete fiscal period information from a date
 */
export function getFiscalPeriodInfo(date: Date): FiscalPeriodInfo {
  const fiscalYear = getFiscalYear(date);
  const fiscalMonth = getFiscalMonth(date);
  const fiscalQuarter = getFiscalQuarter(date);
  const calendarMonth = date.getMonth() + 1;
  const calendarYear = date.getFullYear();
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return {
    fiscalYear,
    fiscalQuarter,
    fiscalMonth,
    calendarMonth,
    calendarYear,
    periodName: `${monthNames[calendarMonth - 1]} ${calendarYear}`,
    quarterName: `Q${fiscalQuarter} FY${fiscalYear}`,
  };
}

/**
 * Get current fiscal period information
 */
export function getCurrentFiscalPeriod(): FiscalPeriodInfo {
  return getFiscalPeriodInfo(new Date());
}

/**
 * Get the start and end dates for a fiscal year
 * 
 * @example
 * getFiscalYearRange(2024) // Returns { start: Sep 1 2023, end: Aug 31 2024 }
 */
export function getFiscalYearRange(fiscalYear: number): FiscalYearRange {
  // Fiscal year starts September 1st of the previous calendar year
  const startDate = new Date(fiscalYear - 1, FISCAL_YEAR_START_MONTH - 1, 1);
  
  // Fiscal year ends August 31st of the fiscal year
  const endDate = new Date(fiscalYear, FISCAL_YEAR_START_MONTH - 2, 31, 23, 59, 59, 999);
  
  return { start: startDate, end: endDate };
}

/**
 * Get the start and end dates for a fiscal quarter
 * 
 * @example
 * getFiscalQuarterRange(2024, 1) // Returns { start: Sep 1 2023, end: Nov 30 2023 }
 */
export function getFiscalQuarterRange(fiscalYear: number, fiscalQuarter: number): FiscalYearRange {
  if (fiscalQuarter < 1 || fiscalQuarter > 4) {
    throw new Error(`Invalid fiscal quarter: ${fiscalQuarter}`);
  }
  
  // Calculate starting fiscal month for the quarter
  const startFiscalMonth = (fiscalQuarter - 1) * 3 + 1;
  const endFiscalMonth = startFiscalMonth + 2;
  
  // Convert fiscal months to calendar months and years
  const startCalendarMonth = ((startFiscalMonth + FISCAL_YEAR_START_MONTH - 2) % 12) + 1;
  const endCalendarMonth = ((endFiscalMonth + FISCAL_YEAR_START_MONTH - 2) % 12) + 1;
  
  // Determine calendar years
  const startCalendarYear = startFiscalMonth <= 4 ? fiscalYear - 1 : fiscalYear;
  const endCalendarYear = endFiscalMonth <= 4 ? fiscalYear - 1 : fiscalYear;
  
  const startDate = new Date(startCalendarYear, startCalendarMonth - 1, 1);
  
  // Get last day of end month
  const lastDay = new Date(endCalendarYear, endCalendarMonth, 0).getDate();
  const endDate = new Date(endCalendarYear, endCalendarMonth - 1, lastDay, 23, 59, 59, 999);
  
  return { start: startDate, end: endDate };
}

/**
 * Get the start and end dates for a fiscal month
 * 
 * @example
 * getFiscalMonthRange(2024, 1) // Returns { start: Sep 1 2023, end: Sep 30 2023 }
 */
export function getFiscalMonthRange(fiscalYear: number, fiscalMonth: number): FiscalYearRange {
  if (fiscalMonth < 1 || fiscalMonth > 12) {
    throw new Error(`Invalid fiscal month: ${fiscalMonth}`);
  }
  
  // Convert fiscal month to calendar month
  const calendarMonth = ((fiscalMonth + FISCAL_YEAR_START_MONTH - 2) % 12) + 1;
  
  // Determine calendar year (months 1-4 are in previous calendar year)
  const calendarYear = fiscalMonth <= 4 ? fiscalYear - 1 : fiscalYear;
  
  const startDate = new Date(calendarYear, calendarMonth - 1, 1);
  
  // Get last day of month
  const lastDay = new Date(calendarYear, calendarMonth, 0).getDate();
  const endDate = new Date(calendarYear, calendarMonth - 1, lastDay, 23, 59, 59, 999);
  
  return { start: startDate, end: endDate };
}

/**
 * Format fiscal period for display
 * 
 * @example
 * formatFiscalPeriod(2024) // Returns "FY2024"
 * formatFiscalPeriod(2024, 2) // Returns "Q2 FY2024"
 * formatFiscalPeriod(2024, 2, 5) // Returns "Jan 2024 (Q2 FY2024)"
 */
export function formatFiscalPeriod(
  fiscalYear: number,
  fiscalQuarter?: number,
  fiscalMonth?: number
): string {
  if (fiscalMonth !== undefined) {
    // Show month detail
    const range = getFiscalMonthRange(fiscalYear, fiscalMonth);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const monthName = monthNames[range.start.getMonth()];
    const quarter = Math.ceil(fiscalMonth / 3);
    
    return `${monthName} ${range.start.getFullYear()} (Q${quarter} FY${fiscalYear})`;
  } else if (fiscalQuarter !== undefined) {
    return `Q${fiscalQuarter} FY${fiscalYear}`;
  } else {
    return `FY${fiscalYear}`;
  }
}

/**
 * Get all fiscal years in a range
 * 
 * @example
 * getFiscalYears(2022, 2024) // Returns [2022, 2023, 2024]
 */
export function getFiscalYears(startYear: number, endYear: number): number[] {
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  return years;
}

/**
 * Get all fiscal quarters for a year
 * 
 * @example
 * getFiscalQuarters() // Returns [1, 2, 3, 4]
 */
export function getFiscalQuarters(): number[] {
  return [1, 2, 3, 4];
}

/**
 * Get quarter labels
 * 
 * @example
 * getQuarterLabels(2024) // Returns ['Q1 FY2024', 'Q2 FY2024', 'Q3 FY2024', 'Q4 FY2024']
 */
export function getQuarterLabels(fiscalYear: number): string[] {
  return getFiscalQuarters().map(q => `Q${q} FY${fiscalYear}`);
}

/**
 * Parse fiscal period string (e.g., "Q2 FY2024", "FY2024")
 */
export function parseFiscalPeriod(periodStr: string): FiscalPeriodFilter {
  const fyMatch = periodStr.match(/FY(\d{4})/);
  const quarterMatch = periodStr.match(/Q(\d)/);
  
  if (!fyMatch || !fyMatch[1]) {
    throw new Error(`Invalid fiscal period string: ${periodStr}`);
  }
  
  return {
    fiscalYear: parseInt(fyMatch[1], 10),
    fiscalQuarter: quarterMatch && quarterMatch[1] ? parseInt(quarterMatch[1], 10) : undefined,
  };
}

/**
 * Fiscal month names in order (September to August)
 */
export const FISCAL_MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

/**
 * Get the end date for a fiscal month by month name
 * Returns the last day of the specified month (inclusive)
 * 
 * @param fiscalYear - Fiscal year (e.g., 2024)
 * @param month - Month name ('Sep', 'Oct', etc.)
 * @returns Last day of the month with time set to end of day
 * 
 * @example
 * getFiscalMonthEndDate(2024, 'Sep') // Returns Sep 30, 2023 23:59:59.999
 * getFiscalMonthEndDate(2024, 'Oct') // Returns Oct 31, 2023 23:59:59.999
 * getFiscalMonthEndDate(2024, 'Jan') // Returns Jan 31, 2024 23:59:59.999
 */
export function getFiscalMonthEndDate(fiscalYear: number, month: string): Date {
  const monthIndex = FISCAL_MONTHS.indexOf(month);
  
  if (monthIndex === -1) {
    throw new Error(`Invalid month name: ${month}. Must be one of: ${FISCAL_MONTHS.join(', ')}`);
  }
  
  // Convert to fiscal month number (1-12)
  const fiscalMonth = monthIndex + 1;
  
  // Use existing getFiscalMonthRange function to get the end date
  const { end } = getFiscalMonthRange(fiscalYear, fiscalMonth);
  
  return end;
}

