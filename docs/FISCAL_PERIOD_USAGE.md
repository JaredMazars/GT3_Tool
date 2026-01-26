# Fiscal Period Usage Guide

## Overview

The fiscal period system enables filtering of transaction data by fiscal year, quarter, and month. The firm's fiscal year runs from September to August, with fiscal year naming based on the ending year (e.g., FY2024 = Sep 2023 - Aug 2024).

## Fiscal Year Structure

- **Fiscal Year:** Named after ending year (FY2024 = Sep 2023 - Aug 2024)
- **Quarters:**
  - Q1: September - November
  - Q2: December - February
  - Q3: March - May
  - Q4: June - August
- **Fiscal Months:** 1-12 (1=September, 12=August)

## Database Components

### 1. FiscalPeriod Table

Stores fiscal period metadata:
- 624 periods (FY1999 - FY2050)
- Maps fiscal periods to calendar dates
- Includes display names and labels

```sql
SELECT * FROM FiscalPeriod
WHERE fiscalYear = 2024 AND fiscalQuarter = 2;
```

### 2. SQL Scalar Functions

Four deterministic functions for fiscal calculations:

```sql
-- Get fiscal year from any date
SELECT dbo.GetFiscalYear('2024-01-15');  -- Returns 2024

-- Get fiscal month (1-12)
SELECT dbo.GetFiscalMonth('2024-01-15'); -- Returns 5

-- Get fiscal quarter (1-4)
SELECT dbo.GetFiscalQuarter('2024-01-15'); -- Returns 2

-- Get period key for joins
SELECT dbo.GetFiscalPeriodKey('2024-01-15'); -- Returns 202405
```

## TypeScript/JavaScript Usage

### Client-Side Utilities

```typescript
import {
  getFiscalYear,
  getFiscalQuarter,
  getFiscalMonth,
  getFiscalPeriodInfo,
  getCurrentFiscalPeriod,
  getFiscalYearRange,
  formatFiscalPeriod,
} from '@/lib/utils/fiscalPeriod';

// Get fiscal year from a date
const fiscalYear = getFiscalYear(new Date('2024-01-15')); // Returns 2024

// Get complete fiscal period info
const periodInfo = getFiscalPeriodInfo(new Date());
// Returns: {
//   fiscalYear: 2024,
//   fiscalQuarter: 2,
//   fiscalMonth: 5,
//   calendarMonth: 1,
//   calendarYear: 2024,
//   periodName: "Jan 2024",
//   quarterName: "Q2 FY2024"
// }

// Get current fiscal period
const current = getCurrentFiscalPeriod();

// Get date range for a fiscal year
const range = getFiscalYearRange(2024);
// Returns: { start: Date(Sep 1, 2023), end: Date(Aug 31, 2024) }

// Format for display
formatFiscalPeriod(2024); // "FY2024"
formatFiscalPeriod(2024, 2); // "Q2 FY2024"
formatFiscalPeriod(2024, 2, 5); // "Jan 2024 (Q2 FY2024)"
```

### Server-Side Query Helpers

```typescript
import {
  buildFiscalPeriodFilter,
  buildFiscalYearFilter,
  buildFiscalQuarterFilter,
  buildFiscalMonthFilter,
  getFiscalPeriods,
} from '@/lib/services/reports/fiscalPeriodQueries';

// Build Prisma where clause for fiscal year
const where = buildFiscalYearFilter(2024, 'TranDate');
const transactions = await prisma.wIPTransactions.findMany({ where });

// Build flexible fiscal period filter
const filter = buildFiscalPeriodFilter(
  { fiscalYear: 2024, fiscalQuarter: 2 },
  'TranDate'
);

// Get available fiscal periods
const years = await getFiscalPeriods({ groupBy: 'year' });
const quarters = await getFiscalPeriods({ fiscalYear: 2024, groupBy: 'quarter' });
const months = await getFiscalPeriods({ fiscalYear: 2024, fiscalQuarter: 2, groupBy: 'month' });
```

## API Integration Examples

### 1. Simple Fiscal Year Filter

```typescript
// GET /api/reports/transactions?fiscalYear=2024

export const GET = secureRoute.query({
  feature: Feature.ACCESS_REPORTS,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get('fiscalYear');
    
    const where = fiscalYear
      ? buildFiscalYearFilter(Number(fiscalYear), 'TranDate')
      : {};
    
    const data = await prisma.drsTransactions.findMany({
      where,
      orderBy: { TranDate: 'desc' },
    });
    
    return NextResponse.json(successResponse({ data }));
  },
});
```

### 2. Fiscal Quarter Aggregation

```typescript
// Group transactions by fiscal quarter

const quarterlyData = await prisma.$queryRaw`
  SELECT 
    dbo.GetFiscalYear(TranDate) as fiscalYear,
    dbo.GetFiscalQuarter(TranDate) as fiscalQuarter,
    SUM(Amount) as totalAmount,
    SUM(Hour) as totalHours,
    COUNT(*) as transactionCount
  FROM WIPTransactions
  WHERE dbo.GetFiscalYear(TranDate) = ${fiscalYear}
  GROUP BY 
    dbo.GetFiscalYear(TranDate),
    dbo.GetFiscalQuarter(TranDate)
  ORDER BY fiscalYear, fiscalQuarter
`;
```

### 3. Join to FiscalPeriod for Display Names

```typescript
const transactionsWithPeriods = await prisma.wIPTransactions.findMany({
  where: buildFiscalYearFilter(2024, 'TranDate'),
  select: {
    id: true,
    TranDate: true,
    Amount: true,
    ClientCode: true,
  },
});

// Enrich with fiscal period metadata
const enriched = await Promise.all(
  transactionsWithPeriods.map(async (t) => {
    const periodKey = getFiscalPeriodKey(t.TranDate);
    const period = await prisma.fiscalPeriod.findUnique({
      where: { periodKey },
      select: { periodName: true, quarterName: true },
    });
    
    return { ...t, period };
  })
);
```

## React Components Example

### Fiscal Period Selector

```typescript
import { useState, useEffect } from 'react';
import { getFiscalPeriods } from '@/lib/services/reports/fiscalPeriodQueries';

export function FiscalPeriodSelector({ onSelect }: { onSelect: (filter: any) => void }) {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState<number>();
  const [quarters, setQuarters] = useState([]);
  
  useEffect(() => {
    // Load available fiscal years
    getFiscalPeriods({ groupBy: 'year', orderBy: 'desc' }).then(setYears);
  }, []);
  
  useEffect(() => {
    if (selectedYear) {
      // Load quarters for selected year
      getFiscalPeriods({ 
        fiscalYear: selectedYear, 
        groupBy: 'quarter' 
      }).then(setQuarters);
    }
  }, [selectedYear]);
  
  return (
    <div className="space-y-4">
      <select
        value={selectedYear || ''}
        onChange={(e) => {
          const year = Number(e.target.value);
          setSelectedYear(year);
          onSelect({ fiscalYear: year });
        }}
      >
        <option value="">Select Fiscal Year</option>
        {years.map((y: any) => (
          <key={y.fiscalYear}>
            {y.label}
          </option>
        ))}
      </select>
      
      {selectedYear && (
        <select
          onChange={(e) => {
            const quarter = Number(e.target.value);
            onSelect({ fiscalYear: selectedYear, fiscalQuarter: quarter });
          }}
        >
          <option value="">All Quarters</option>
          {quarters.map((q: any) => (
            <option key={q.fiscalQuarter} value={q.fiscalQuarter}>
              {q.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

## SQL Query Examples

### Filter by Fiscal Year

```sql
SELECT *
FROM DrsTransactions
WHERE dbo.GetFiscalYear(TranDate) = 2024;
```

### Filter by Fiscal Quarter

```sql
SELECT *
FROM WIPTransactions
WHERE dbo.GetFiscalYear(TranDate) = 2024
  AND dbo.GetFiscalQuarter(TranDate) = 2;
```

### Aggregate by Fiscal Period

```sql
SELECT 
  fp.fiscalYear,
  fp.fiscalQuarter,
  fp.quarterName,
  SUM(t.Amount) as totalAmount,
  COUNT(*) as transactionCount
FROM DrsTransactions t
INNER JOIN FiscalPeriod fp
  ON dbo.GetFiscalPeriodKey(t.TranDate) = fp.periodKey
WHERE fp.fiscalYear = 2024
GROUP BY fp.fiscalYear, fp.fiscalQuarter, fp.quarterName
ORDER BY fp.fiscalQuarter;
```

### Year-over-Year Comparison

```sql
SELECT 
  dbo.GetFiscalYear(TranDate) as fiscalYear,
  dbo.GetFiscalQuarter(TranDate) as fiscalQuarter,
  SUM(Amount) as revenue
FROM DrsTransactions
WHERE dbo.GetFiscalYear(TranDate) IN (2023, 2024)
GROUP BY 
  dbo.GetFiscalYear(TranDate),
  dbo.GetFiscalQuarter(TranDate)
ORDER BY fiscalQuarter, fiscalYear;
```

## Performance Considerations

### Indexed Computed Columns (Optional)

For tables with frequent fiscal period queries, consider adding computed columns:

```sql
-- Add computed fiscal year column
ALTER TABLE DrsTransactions
ADD FiscalYear AS dbo.GetFiscalYear(TranDate) PERSISTED;

CREATE INDEX IX_DrsTransactions_FiscalYear 
ON DrsTransactions(FiscalYear);

-- Now queries can use the index
SELECT * FROM DrsTransactions
WHERE FiscalYear = 2024;
```

### Query Optimization Tips

1. **Use date range filters for large datasets:**
   ```typescript
   // Instead of calling SQL function on every row
   const range = getFiscalYearRange(2024);
   const where = {
     TranDate: {
       gte: range.start,
       lte: range.end,
     },
   };
   ```

2. **Cache fiscal period lookups:**
   ```typescript
   // Cache period metadata
   const periods = await cache.getOrSet(
     `${CACHE_PREFIXES.ANALYTICS}:fiscal-periods`,
     async () => await getFiscalPeriods({ groupBy: 'month' }),
     1800 // 30 minutes
   );
   ```

3. **Use appropriate granularity:**
   - Year-level filters for dashboards
   - Quarter-level for reports
   - Month-level for detailed analysis

## Testing

Test fiscal period calculations:

```typescript
import { getFiscalYear, getFiscalQuarter, getFiscalMonth } from '@/lib/utils/fiscalPeriod';

describe('Fiscal Period Utilities', () => {
  it('calculates fiscal year correctly', () => {
    expect(getFiscalYear(new Date('2023-09-01'))).toBe(2024);
    expect(getFiscalYear(new Date('2024-08-31'))).toBe(2024);
    expect(getFiscalYear(new Date('2024-01-15'))).toBe(2024);
  });
  
  it('calculates fiscal quarter correctly', () => {
    expect(getFiscalQuarter(new Date('2023-09-01'))).toBe(1); // Q1
    expect(getFiscalQuarter(new Date('2024-01-15'))).toBe(2); // Q2
    expect(getFiscalQuarter(new Date('2024-06-30'))).toBe(4); // Q4
  });
  
  it('calculates fiscal month correctly', () => {
    expect(getFiscalMonth(new Date('2023-09-01'))).toBe(1); // September
    expect(getFiscalMonth(new Date('2024-01-15'))).toBe(5); // January
    expect(getFiscalMonth(new Date('2024-08-31'))).toBe(12); // August
  });
});
```

## Troubleshooting

### SQL Functions Not Found

If you get "Invalid object name 'dbo.GetFiscalYear'":

1. Check if functions exist:
   ```sql
   SELECT ROUTINE_NAME
   FROM INFORMATION_SCHEMA.ROUTINES
   WHERE ROUTINE_NAME LIKE 'GetFiscal%';
   ```

2. Run the function creation script:
   ```bash
   # See scripts/MANUAL_SETUP_FISCAL_FUNCTIONS.md for instructions
   ```

### Incorrect Fiscal Period Calculations

Verify function output:
```sql
SELECT 
    '2024-01-15' as TestDate,
    dbo.GetFiscalYear('2024-01-15') as FiscalYear,
    dbo.GetFiscalMonth('2024-01-15') as FiscalMonth,
    dbo.GetFiscalQuarter('2024-01-15') as FiscalQuarter;
```

Expected: FiscalYear=2024, FiscalMonth=5, FiscalQuarter=2

## Additional Resources

- **Migration:** `prisma/migrations/20251226_add_fiscal_period_table/README.md`
- **Functions Setup:** `scripts/MANUAL_SETUP_FISCAL_FUNCTIONS.md`
- **Seed Script:** `scripts/seed-fiscal-periods.ts`
- **Example API:** `src/app/api/reports/fiscal-transactions/route.ts`

