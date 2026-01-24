# Financial Calculation Formulas - Corrected

**Last Updated:** 2026-01-24

## Correct Formulas

### Core Metrics

```
Gross Production = Time

Net Revenue = Time + Adjustments

Gross Profit = Net Revenue - Cost

Adjustment % = (Adjustments / Gross Production) × 100
            = (Adjustments / Time) × 100
```

### Important Notes

1. **Disbursements are NOT included in Net Revenue**
   - Disbursements are tracked separately
   - They are part of WIP Balance calculation
   - They are NOT part of revenue calculations

2. **Gross Production = Time only**
   - Previously incorrectly calculated as Time + Disbursements
   - Now correctly uses Time only

3. **Net Revenue components:**
   - ✅ Time (charges)
   - ✅ Adjustments (positive or negative)
   - ❌ Disbursements (tracked separately)

## WIP Transaction Types

| TType | Meaning | Used In |
|---|---|---|
| **T** | Time charges | Gross Production, Net Revenue |
| **D** | Disbursements | WIP Balance (NOT Net Revenue) |
| **ADJ** | Adjustments | Net Revenue, Writeoff % |
| **F** | Fees (invoiced) | WIP Balance (subtracted) |
| **P** | Provisions | WIP Balance, Writeoff % |

## Calculation Examples

### Example 1: Basic Calculation

```
Time (T): R1,000,000
Disbursements (D): R200,000
Adjustments (ADJ): -R50,000
Cost: R600,000

Gross Production = R1,000,000 (Time only)
Net Revenue = R1,000,000 + (-R50,000) = R950,000
Gross Profit = R950,000 - R600,000 = R350,000
Adjustment % = (-R50,000 / R1,000,000) × 100 = -5%
```

### Example 2: WIP Balance Calculation

```
Time (T): R1,000,000
Disbursements (D): R200,000
Adjustments (ADJ): -R50,000
Fees (F): R800,000
Provisions (P): R30,000

WIP Balance = Time + Disbursements + Adjustments - Fees + Provisions
            = R1,000,000 + R200,000 + (-R50,000) - R800,000 + R30,000
            = R380,000
```

### Example 3: Lockup Days Calculation

```
WIP Balance (month-end): R380,000
Trailing 12-Month Net Revenue: R12,000,000

WIP Lockup Days = (WIP Balance × 365) / Trailing 12-Month Net Revenue
                = (R380,000 × 365) / R12,000,000
                = 11.5 days
```

## Reports Affected

### My Reports Overview
- **Net Revenue Chart** ✓ Fixed
- **Gross Profit Chart** ✓ Fixed (uses Net Revenue)
- **WIP Lockup Days** ✓ Fixed (trailing 12-month revenue)

### Profitability Report
- **Net Revenue Column** ✓ Fixed
- **Gross Profit Column** ✓ Fixed
- **Adjustment %** ✓ Fixed (uses Time as denominator)

## Code Locations

### Backend APIs
- `/src/app/api/my-reports/overview/route.ts` - Overview graphs API
- `/src/app/api/my-reports/profitability/route.ts` - Task-level profitability API

### SQL Utilities
- `/src/lib/utils/sql/monthlyAggregation.ts` - Monthly WIP aggregation queries

### UI Components
- `/src/components/features/reports/MyReportsOverview.tsx` - Overview charts UI
- `/src/components/features/reports/ProfitabilityReport.tsx` - Profitability tables UI

## What Changed

### Before (Incorrect)
```typescript
const grossProduction = ltdTime + ltdDisb; // ❌ Wrong
const netRevenue = grossProduction + ltdAdj; // ❌ Wrong
```

### After (Correct)
```typescript
const grossProduction = ltdTime; // ✅ Correct
const netRevenue = ltdTime + ltdAdj; // ✅ Correct
```

## Cache Invalidation

After this fix is deployed, users will see corrected values after cache expiry:
- Current fiscal year: 30 minutes
- Past fiscal years: 60 minutes
- Custom date ranges: 30 minutes

To force immediate update:
```bash
redis-cli KEYS "user:my-reports:*" | xargs redis-cli DEL
```

## Related Documents

- `CALCULATION_FIX_GROSS_PRODUCTION.md` - Detailed fix documentation
- `Report Calculations Analysis` plan - Complete calculation breakdown
