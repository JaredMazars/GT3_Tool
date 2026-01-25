# WIPTransactions Index Analysis & Optimization Plan

**Date:** January 25, 2026  
**Status:** Analysis Complete - Awaiting Database Verification  
**Table:** `WIPTransactions` (large transaction table with ~46 columns)

---

## Executive Summary

The WIPTransactions table has accumulated **14+ indexes** over multiple migrations, with clear evidence of:

1. **Duplicate indexes** on the same columns (at least 4 duplicates)
2. **Redundant simple indexes** that are superseded by covering indexes
3. **Unused covering indexes** for TranYearMonth (application not migrated yet)
4. **Potential for consolidation** without impacting query performance

**Recommendation:** Remove 4-5 duplicate/redundant indexes, verify covering indexes exist, and document remaining indexes with clear usage patterns.

---

## Current State: Indexes in Prisma Schema

Based on `prisma/schema.prisma` (lines 2280-2293), the following 14 indexes are defined:

| # | Index Name | Columns | Source | Status |
|---|---|---|---|---|
| 1 | `idx_wip_gsclientid` | `GSClientID` | Migration 20251209 | **DUPLICATE** - redundant with covering |
| 2 | `idx_wip_gstaskid` | `GSTaskID` | Migration 20251209 | **DUPLICATE** - redundant with covering |
| 3 | `idx_wip_gstaskid_covering` | `GSTaskID` + INCLUDE | Migration 20260123 | **KEEP** (covering index) |
| 4 | `idx_wiptransactions_gsclientid` | `GSClientID` | Migration (early) | **DUPLICATE** - exact copy of #1 |
| 5 | `idx_wiptransactions_gstaskid` | `GSTaskID` | Migration (early) | **DUPLICATE** - exact copy of #2 |
| 6 | `WIPTransactions_EmpCode_idx` | `EmpCode` | Migration 20251209 | **REVIEW** - check usage |
| 7 | `WIPTransactions_GSClientID_TranDate_TType_idx` | `GSClientID, TranDate, TType` | Migration 20251224 | **KEEP** - analytics queries |
| 8 | `WIPTransactions_GSTaskID_TranDate_TType_idx` | `GSTaskID, TranDate, TType` | Migration 20251224 | **KEEP** - analytics queries |
| 9 | `WIPTransactions_OfficeCode_idx` | `OfficeCode` | Migration 20251209 | **REVIEW** - check usage |
| 10 | `WIPTransactions_ServLineGroup_idx` | `ServLineGroup` | Migration 20251209 | **REVIEW** - check usage |
| 11 | `WIPTransactions_TaskManager_TranDate_idx` | `TaskManager, TranDate` | Migration 20260101 | **KEEP** - My Reports |
| 12 | `WIPTransactions_TaskPartner_TranDate_idx` | `TaskPartner, TranDate` | Migration 20260101 | **KEEP** - My Reports |
| 13 | `WIPTransactions_TranDate_idx` | `TranDate` | Migration 20251209 | **KEEP** - date range queries |
| 14 | `WIPTransactions_TType_idx` | `TType` | Migration 20251226 | **REVIEW** - may be redundant |

---

## Additional Covering Indexes (Expected in Database)

These were created via SQL migrations but **don't show in Prisma schema** (SQL Server INCLUDE clause not supported by Prisma):

| Index Name | Key Columns | INCLUDE Columns | Filter | Migration |
|---|---|---|---|---|
| `idx_wip_gsclientid_covering` | `GSClientID` | `Amount, TType, GSTaskID` | `WHERE GSClientID IS NOT NULL` | 20260123063454 |
| `idx_wip_gstaskid_covering` | `GSTaskID` | `Amount, TType, GSClientID` | None | 20260123063454 |
| `idx_WIPTransactions_Aggregation_COVERING` | `GSTaskID, TType` | `Amount, Cost, Hour` | None | 20260122 |
| `idx_wip_taskpartner_yearmonth_covering` | `TaskPartner, TranYearMonth` | `TType, Amount, Cost` | `WHERE TaskPartner IS NOT NULL` | 20260123_add_yearmonth |
| `idx_wip_taskmanager_yearmonth_covering` | `TaskManager, TranYearMonth` | `TType, Amount, Cost` | `WHERE TaskManager IS NOT NULL` | 20260123_add_yearmonth |

**⚠️ CRITICAL:** These covering indexes must be verified to exist in the database with INCLUDE columns before removing simple indexes.

---

## Duplicate Analysis

### Category 1: Exact Duplicates (Certain)

| Duplicates | Columns | Recommendation |
|---|---|---|
| `idx_wip_gsclientid` + `idx_wiptransactions_gsclientid` | `GSClientID` | **Drop both** - superseded by `idx_wip_gsclientid_covering` |
| `idx_wip_gstaskid` + `idx_wiptransactions_gstaskid` | `GSTaskID` | **Drop both** - superseded by `idx_wip_gstaskid_covering` |

**Reasoning:** SQL Server can use covering indexes (with INCLUDE columns) for all queries that simple indexes handle. The covering indexes provide additional query optimization without index redundancy.

### Category 2: Covering Index Redundancy (Verify First)

| Simple Index | Covering Index | Status |
|---|---|---|
| `idx_wip_gstaskid_covering` (Prisma) | `idx_wip_gstaskid_covering` (SQL) | **Verify:** Check if SQL index has INCLUDE columns |

**Reasoning:** Prisma shows this as a simple index, but migration created it as covering. If covering index exists, the Prisma index definition is redundant.

### Category 3: Potential Redundancy (Usage-Dependent)

| Index | Potentially Redundant With | Decision |
|---|---|---|
| `WIPTransactions_TType_idx` (single) | `idx_WIPTransactions_Aggregation_COVERING` (GSTaskID, TType) | Check usage stats - may be needed for TType-only queries |
| `WIPTransactions_EmpCode_idx` | None | Check usage stats - might be rarely used |
| `WIPTransactions_OfficeCode_idx` | None | Check usage stats - might be rarely used |
| `WIPTransactions_ServLineGroup_idx` | None | Check usage stats - might be rarely used |

**Reasoning:** Single-column indexes might be needed for queries that don't filter by the first column of composite indexes.

---

## TranYearMonth Migration Status

### Background

Two migrations were created to optimize monthly aggregation queries:

1. **20260123_add_tranyearmonth_computed_columns**: Added `TranYearMonth` computed column
2. **20260123_add_yearmonth_covering_indexes**: Created covering indexes on `TranYearMonth`

### Current Status: **NOT MIGRATED**

**Evidence:**
- ❌ `TranYearMonth` column **NOT in Prisma schema**
- ❌ **No application code** uses `TranYearMonth` (0 matches in `src/`)
- ✅ **All queries still use `TranDate`** (38 matches across 10 API routes)

**Affected Indexes:**
- `idx_wip_taskpartner_yearmonth_covering` - **UNUSED** (code uses TranDate)
- `idx_wip_taskmanager_yearmonth_covering` - **UNUSED** (code uses TranDate)

### Migration Path Options

**Option A: Complete TranYearMonth Migration**
1. Add `TranYearMonth` to Prisma schema as computed column
2. Update application queries to use `TranYearMonth` for monthly aggregations
3. Drop TranDate-based indexes `TaskPartner_TranDate` and `TaskManager_TranDate`
4. Benefit: 96% faster monthly aggregation queries (130s → <5s per docs)

**Option B: Rollback TranYearMonth (Not Recommended)**
1. Drop unused TranYearMonth covering indexes
2. Drop TranYearMonth computed column
3. Keep existing TranDate-based indexes
4. Lose: Potential 96% performance improvement

**Recommendation:** Complete the migration (Option A) - significant performance gains await.

---

## Query Pattern Analysis

Based on codebase analysis (`src/app/api/**/*.ts`), here are the main query patterns:

### Pattern 1: Client-Level WIP Queries
**Endpoints:** `/api/clients/[id]/route.ts`, `/api/clients/[id]/wip/route.ts`

```typescript
WHERE GSClientID = @clientId
SELECT GSTaskID, Amount, TType
```

**Optimal Index:** `idx_wip_gsclientid_covering` (GSClientID) INCLUDE (Amount, TType, GSTaskID)  
**Status:** ✅ Covering index handles this perfectly (no key lookups)

### Pattern 2: Task-Level WIP Queries
**Endpoints:** `/api/tasks/[id]/wip/route.ts`, `/api/tasks/[id]/balances/route.ts`

```typescript
WHERE GSTaskID = @taskId
SELECT Amount, TType, Cost, Hour
```

**Optimal Indexes:**
- `idx_wip_gstaskid_covering` (GSTaskID) INCLUDE (Amount, TType, GSClientID)
- `idx_WIPTransactions_Aggregation_COVERING` (GSTaskID, TType) INCLUDE (Amount, Cost, Hour)

**Status:** ✅ Both covering indexes optimize different query variations

### Pattern 3: Analytics Date Range Queries
**Endpoints:** `/api/clients/[id]/analytics/graphs/route.ts`, `/api/groups/[groupCode]/analytics/graphs/route.ts`

```typescript
WHERE GSClientID = @clientId 
  AND TranDate >= @startDate 
  AND TranDate <= @endDate
  AND TType IN ('T', 'ADJ', ...)
```

**Optimal Index:** `WIPTransactions_GSClientID_TranDate_TType_idx` (composite)  
**Status:** ✅ Essential for analytics performance

### Pattern 4: My Reports - Partner/Manager Aggregations
**Endpoints:** `/api/my-reports/overview/route.ts`, `/api/my-reports/profitability/route.ts`

```typescript
WHERE TaskPartner = @empCode AND TranDate >= @start AND TranDate <= @end
WHERE TaskManager = @empCode AND TranDate >= @start AND TranDate <= @end
```

**Optimal Indexes:**
- `WIPTransactions_TaskPartner_TranDate_idx` (composite)
- `WIPTransactions_TaskManager_TranDate_idx` (composite)

**Status:** ✅ Critical for My Reports performance

### Pattern 5: Fiscal Period Reports
**Endpoints:** `/api/reports/fiscal-transactions/route.ts`

```typescript
WHERE TranDate >= @fiscalStart AND TranDate <= @fiscalEnd
  AND ServLineCode IN (...)
```

**Optimal Index:** `WIPTransactions_TranDate_idx` (single column)  
**Status:** ✅ Useful for date range scans

---

## Index Maintenance Considerations

### Covering Index Benefits
- ✅ Eliminates key lookups (no table access needed)
- ✅ Backward compatible (serves all queries simple indexes could)
- ✅ Single index replaces multiple simple indexes
- ❌ Slightly larger size (stores INCLUDE columns)
- ❌ Slightly slower writes (more columns to maintain)

### SQL Server Index Best Practices
1. **Covering indexes** are preferred for high-read, low-write tables
2. **Composite indexes** should have most selective column first
3. **Filtered indexes** (WHERE clause) are smaller and faster for subset queries
4. **Regular maintenance** required: rebuild at >30% fragmentation

### WIPTransactions Characteristics
- **Read-heavy table** (analytics, reports, dashboards)
- **Append-only writes** (transactions don't update, only insert)
- **Large dataset** (millions of rows)
- **Perfect candidate** for aggressive covering index optimization

---

## Recommended Actions

### Phase 1: Database Verification (Required First)

**Run:** `scripts/check_wip_indexes.sql`

This script will verify:
1. ✅ All indexes actually exist in database
2. ✅ Covering indexes have expected INCLUDE columns
3. ✅ Index usage statistics (seeks, scans, lookups)
4. ✅ Duplicate detection with coverage analysis
5. ✅ TranYearMonth column and indexes exist
6. ✅ Index fragmentation levels

**Critical Checks:**
- Confirm `idx_wip_gsclientid_covering` has INCLUDE (Amount, TType, GSTaskID)
- Confirm `idx_wip_gstaskid_covering` has INCLUDE (Amount, TType, GSClientID)
- Identify truly unused indexes (0 seeks + 0 scans)

### Phase 2: Remove Duplicates (After Verification)

**Certain Removals:**

```sql
-- Drop exact duplicates (4 indexes total)
DROP INDEX [idx_wip_gsclientid] ON [WIPTransactions];
DROP INDEX [idx_wip_gstaskid] ON [WIPTransactions];
DROP INDEX [idx_wiptransactions_gsclientid] ON [WIPTransactions];
DROP INDEX [idx_wiptransactions_gstaskid] ON [WIPTransactions];
```

**Conditional Removals (if usage stats show 0 reads):**

```sql
-- Only drop if verification shows UNUSED
DROP INDEX [WIPTransactions_EmpCode_idx] ON [WIPTransactions];
DROP INDEX [WIPTransactions_OfficeCode_idx] ON [WIPTransactions];
DROP INDEX [WIPTransactions_ServLineGroup_idx] ON [WIPTransactions];
```

### Phase 3: Update Prisma Schema

Remove duplicate index definitions from `prisma/schema.prisma`:

```prisma
// REMOVE these lines (redundant with covering indexes):
@@index([GSClientID], map: "idx_wip_gsclientid")
@@index([GSTaskID], map: "idx_wip_gstaskid")
@@index([GSClientID], map: "idx_wiptransactions_gsclientid")
@@index([GSTaskID], map: "idx_wiptransactions_gstaskid")

// KEEP covering index reference (even though INCLUDE not shown):
@@index([GSTaskID], map: "idx_wip_gstaskid_covering")

// CONDITIONALLY REMOVE (if unused):
@@index([EmpCode])
@@index([OfficeCode])
@@index([ServLineGroup])
```

### Phase 4: Document Remaining Indexes

Create maintenance documentation for each retained index:
- Query patterns it optimizes
- Expected usage statistics
- Fragmentation monitoring schedule

### Phase 5: Consider TranYearMonth Migration (Future)

**Benefits:**
- 96% performance improvement for monthly aggregations
- More efficient index seeks vs. date range scans
- Cleaner query patterns

**Requirements:**
1. Add `TranYearMonth` to Prisma schema
2. Update 10 API routes using TranDate for monthly aggregations
3. Drop TranDate-based partner/manager indexes
4. Test all affected endpoints

**Estimated Effort:** 4-6 hours (low risk, high reward)

---

## Expected Outcomes

### Immediate Benefits (Phase 2 Completion)

| Metric | Current | After Cleanup | Improvement |
|---|---|---|---|
| Total Indexes | 14+ | 9-11 | 21-36% reduction |
| Duplicate Indexes | 4 | 0 | 100% eliminated |
| Index Maintenance Time | Higher | Lower | Write performance improvement |
| Query Performance | Good | Same or better | Covering indexes retained |

### Future Benefits (TranYearMonth Migration)

| Metric | Current | After Migration | Improvement |
|---|---|---|---|
| Monthly aggregation queries | 5-130s | <5s | 96% faster |
| Index count | 9-11 | 8-10 | Slight reduction |
| Query optimizer efficiency | Good | Better | Eliminates function calls |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Drop index still in use | Low | High | Verification script checks usage stats |
| Covering index missing | Low | High | Verification script confirms existence |
| Performance regression | Very Low | Medium | Covering indexes handle all queries |
| Rollback needed | Very Low | Low | Keep DROP scripts as rollback CREATE |

**Rollback Strategy:** All DROP INDEX statements can be reversed by re-running original CREATE INDEX commands from migrations.

---

## Next Steps

1. ✅ **Run verification script:** `scripts/check_wip_indexes.sql`
2. ⏳ **Review results:** Confirm covering indexes exist, identify unused indexes
3. ⏳ **Execute Phase 2:** Drop duplicate indexes via migration
4. ⏳ **Update Prisma schema:** Remove duplicate index definitions
5. ⏳ **Monitor performance:** Verify no query regressions
6. ⏳ **Consider Phase 5:** Plan TranYearMonth migration for future sprint

---

## References

- [WIP Query Optimization Summary](./WIP_QUERY_OPTIMIZATION_SUMMARY.md)
- [WIP Index Maintenance Guide](./WIP_INDEX_MAINTENANCE.md)
- [Group Billing Investigation](./GROUP_BILLING_INVESTIGATION.md)
- Migration: `20260123063454_replace_simple_with_covering_wip_indexes`
- Migration: `20260123_add_yearmonth_covering_indexes`
- Migration: `20260123_add_tranyearmonth_computed_columns`
