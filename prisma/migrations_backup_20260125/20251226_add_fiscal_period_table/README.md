# Fiscal Period Table Migration

## Overview
This migration adds the `FiscalPeriod` table and SQL scalar functions to support fiscal year filtering across the application.

## Fiscal Year Definition
- **Fiscal Year Runs:** September to August
- **Naming Convention:** Named after the ending year (e.g., FY2024 = Sep 2023 to Aug 2024)
- **Quarters:**
  - Q1: September - November (fiscal months 1-3)
  - Q2: December - February (fiscal months 4-6)
  - Q3: March - May (fiscal months 7-9)
  - Q4: June - August (fiscal months 10-12)

## What's Included

### FiscalPeriod Table
A lightweight period metadata table containing:
- `periodKey`: Unique identifier in YYYYMM format (e.g., 202401 for FY2024 Month 1)
- `fiscalYear`: The fiscal year (e.g., 2024)
- `fiscalQuarter`: Quarter 1-4
- `fiscalMonth`: Fiscal month 1-12 (1=Sep, 12=Aug)
- `calendarMonth` / `calendarYear`: Corresponding calendar date info
- `startDate` / `endDate`: Exact date range for the period
- `periodName`: Display name (e.g., "Sep 2023")
- `quarterName`: Quarter display (e.g., "Q1 FY2024")

### SQL Scalar Functions
Four deterministic scalar functions for fiscal calculations:

1. **`dbo.GetFiscalYear(@date)`** - Returns fiscal year (INT)
2. **`dbo.GetFiscalMonth(@date)`** - Returns fiscal month 1-12 (INT)
3. **`dbo.GetFiscalQuarter(@date)`** - Returns fiscal quarter 1-4 (INT)
4. **`dbo.GetFiscalPeriodKey(@date)`** - Returns period key for joining (INT)

These functions enable filtering without pre-joining to the FiscalPeriod table.

## Usage Examples

### Direct Function Usage (No Join)
```sql
-- Filter by fiscal year
SELECT * FROM DrsTransactions
WHERE dbo.GetFiscalYear(TranDate) = 2024;

-- Filter by fiscal quarter
SELECT * FROM WIPTransactions
WHERE dbo.GetFiscalYear(TranDate) = 2024
  AND dbo.GetFiscalQuarter(TranDate) = 2;

-- Aggregate by fiscal period
SELECT 
  dbo.GetFiscalYear(TranDate) as FiscalYear,
  dbo.GetFiscalQuarter(TranDate) as Quarter,
  SUM(Amount) as TotalAmount
FROM DrsTransactions
GROUP BY 
  dbo.GetFiscalYear(TranDate),
  dbo.GetFiscalQuarter(TranDate)
ORDER BY FiscalYear, Quarter;
```

### Join to FiscalPeriod Table (For Display Names)
```sql
-- Get period metadata with transaction data
SELECT 
  t.*,
  fp.fiscalYear,
  fp.quarterName,
  fp.periodName
FROM WIPTransactions t
INNER JOIN FiscalPeriod fp 
  ON dbo.GetFiscalPeriodKey(t.TranDate) = fp.periodKey;

-- Or use date range join
SELECT 
  t.*,
  fp.fiscalYear,
  fp.quarterName
FROM DrsTransactions t
INNER JOIN FiscalPeriod fp
  ON t.TranDate BETWEEN fp.startDate AND fp.endDate;
```

## Post-Migration Steps

### 1. Run the Seed Script
Populate the FiscalPeriod table with data from FY1999 to FY2050:

```bash
npx tsx scripts/seed-fiscal-periods.ts
```

This will create ~612 fiscal period records (51 years × 12 months).

### 2. Verify SQL Functions
Test the functions with sample dates:

```sql
SELECT 
    '2023-09-01' as TestDate,
    dbo.GetFiscalYear('2023-09-01') as FiscalYear,      -- Should return 2024
    dbo.GetFiscalMonth('2023-09-01') as FiscalMonth,    -- Should return 1
    dbo.GetFiscalQuarter('2023-09-01') as FiscalQuarter,-- Should return 1
    dbo.GetFiscalPeriodKey('2023-09-01') as PeriodKey   -- Should return 202401
UNION ALL
SELECT 
    '2024-08-31',
    dbo.GetFiscalYear('2024-08-31'),      -- Should return 2024
    dbo.GetFiscalMonth('2024-08-31'),     -- Should return 12
    dbo.GetFiscalQuarter('2024-08-31'),   -- Should return 4
    dbo.GetFiscalPeriodKey('2024-08-31'); -- Should return 202412
```

### 3. Update Application Code
The following utilities are available for TypeScript/React code:

- `src/lib/utils/fiscalPeriod.ts` - Client-side fiscal calculations
- `src/lib/services/reports/fiscalPeriodQueries.ts` - Prisma query helpers

## Performance Considerations

### Indexes
The migration creates indexes on:
- `fiscalYear`
- `fiscalQuarter`
- `fiscalYear + fiscalQuarter`
- `fiscalYear + fiscalMonth`
- `startDate + endDate`
- `calendarYear + calendarMonth`

### Function Performance
The SQL functions are marked as `WITH SCHEMABINDING` which allows SQL Server to:
- Inline the functions for better performance
- Create computed columns based on them
- Index computed columns if needed

### Optional Optimization
If performance issues arise with frequently-filtered transaction tables, consider adding computed columns:

```sql
-- Example: Add computed fiscal year column to DrsTransactions
ALTER TABLE DrsTransactions
ADD FiscalYear AS dbo.GetFiscalYear(TranDate) PERSISTED;

CREATE INDEX IX_DrsTransactions_FiscalYear ON DrsTransactions(FiscalYear);
```

## Rollback
To rollback this migration:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS dbo.GetFiscalPeriodKey;
DROP FUNCTION IF EXISTS dbo.GetFiscalQuarter;
DROP FUNCTION IF EXISTS dbo.GetFiscalMonth;
DROP FUNCTION IF EXISTS dbo.GetFiscalYear;

-- Drop table
DROP TABLE IF EXISTS FiscalPeriod;
```

## Related Files
- `scripts/seed-fiscal-periods.ts` - Data seeding script
- `src/lib/utils/fiscalPeriod.ts` - TypeScript utilities
- `src/lib/services/reports/fiscalPeriodQueries.ts` - Query helpers

