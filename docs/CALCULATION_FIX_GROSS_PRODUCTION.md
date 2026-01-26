# Gross Production Calculation Fix

**Date:** 2026-01-24  
**Issue:** Incorrect Gross Production formula affecting Net Revenue calculations

## Problem

Gross Production was incorrectly calculated as:
```
Gross Production = Time + Disbursements (INCORRECT)
```

This affected all downstream calculations including Net Revenue and Adjustment Percentage.

## Correct Formula

**Gross Production should be Time only:**
```
Gross Production = Time
Net Revenue = Time + Adjustments
```

**Note:** Disbursements are tracked separately and are NOT included in Net Revenue.

## Files Changed

### 1. Overview API (`src/app/api/my-reports/overview/route.ts`)

**Changes:** 4 locations fixed

#### Location 1: `fetchMetricsForFiscalYear` helper - Net Revenue (line ~268)
```typescript
// BEFORE
const grossProduction = row.ltdTime + row.ltdDisb;
const netRevenue = grossProduction + row.ltdAdj;

// AFTER
const grossProduction = row.ltdTime; // Gross Production = Time only
const netRevenue = row.ltdTime + row.ltdAdj; // Net Revenue = Time + Adjustments
```

#### Location 2: `fetchMetricsForFiscalYear` helper - WIP Lockup Trailing Revenue (line ~305)
```typescript
// BEFORE
const grossProduction = wipRow.ltdTime + wipRow.ltdDisb;
trailing12Revenue += grossProduction + wipRow.ltdAdj;

// AFTER
// Net Revenue = Time + Adjustments
trailing12Revenue += wipRow.ltdTime + wipRow.ltdAdj;
```

#### Location 3: Main GET handler - Net Revenue (line ~726)
```typescript
// BEFORE
const grossProduction = row.ltdTime + row.ltdDisb;
const netRevenue = grossProduction + row.ltdAdj;

// AFTER
const grossProduction = row.ltdTime; // Gross Production = Time only
const netRevenue = row.ltdTime + row.ltdAdj; // Net Revenue = Time + Adjustments
```

#### Location 4: Main GET handler - WIP Lockup Trailing Revenue (line ~766)
```typescript
// BEFORE
const grossProduction = wipRow.ltdTime + wipRow.ltdDisb;
trailing12Revenue += grossProduction + wipRow.ltdAdj;

// AFTER
// Net Revenue = Time + Adjustments
trailing12Revenue += wipRow.ltdTime + wipRow.ltdAdj;
```

### 2. Profitability API (`src/app/api/my-reports/profitability/route.ts`)

**Changes:** 1 location fixed

#### Location: WIP Aggregation (line ~336)
```typescript
// BEFORE
const grossProduction = agg.ltdTime + agg.ltdDisb;
const netRevenue = grossProduction + agg.ltdAdj;

// AFTER
const grossProduction = agg.ltdTime; // Gross Production = Time only
const netRevenue = agg.ltdTime + agg.ltdAdj; // Net Revenue = Time + Adjustments
```

### 3. UI Component (`src/components/features/reports/MyReportsOverview.tsx`)

**Changes:** Updated Net Revenue chart description

```typescript
// BEFORE
description="Gross production plus adjustments"

// AFTER
description="Time + Adjustments"
```

## Impact

### Affected Metrics

1. **Net Revenue** - Now correctly calculates as Time + Adjustments + Disbursements
2. **Gross Profit** - Indirectly affected (uses Net Revenue)
3. **Adjustment %** - Now correctly uses Time only as denominator
4. **WIP Lockup Days** - Trailing 12-month revenue denominator now correct

### Reports Affected

- **My Reports Overview** - All 9 graphs
- **Profitability Report** - Task-level metrics

## Testing

After deploying this fix:

1. ✅ Clear Redis cache to invalidate old calculations
2. ✅ Verify Net Revenue = Time + Adjustments (NO Disbursements)
3. ✅ Verify Gross Production = Time only
4. ✅ Verify Adjustment % uses correct denominator (Time only)
5. ✅ Verify Disbursements are tracked separately and not included in Net Revenue

## Cache Invalidation

Users will see corrected values after:
- **Current fiscal year:** 30 minutes (cache TTL)
- **Past fiscal years:** 60 minutes (cache TTL)
- **Custom date ranges:** 30 minutes (cache TTL)

Or manually clear Redis cache for immediate effect:
```bash
# Clear all report caches
redis-cli KEYS "user:my-reports:*" | xargs redis-cli DEL
```

## Mathematical Example

### Before (Incorrect)
```
Time: R1,000,000
Disbursements: R200,000
Adjustments: -R50,000

Gross Production = R1,000,000 + R200,000 = R1,200,000 ❌
Net Revenue = R1,200,000 + (-R50,000) = R1,150,000 ❌
```

### After (Correct)
```
Time: R1,000,000
Disbursements: R200,000
Adjustments: -R50,000

Gross Production = R1,000,000 ✓
Net Revenue = R1,000,000 + (-R50,000) = R950,000 ✓
```

**Key Changes:**
- Net Revenue is now R950,000 (was incorrectly R1,150,000)
- Disbursements (R200,000) are tracked separately and NOT included in Net Revenue
- Adjustment % now correctly uses Time only as denominator

## Related Documentation

- See `docs/REPORT_CALCULATIONS_ANALYSIS.md` for complete calculation formulas
- See `.cursor/rules/database-patterns.mdc` for WIP transaction types
