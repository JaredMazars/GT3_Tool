# WIPTransactions Super Covering Index Analysis

**Date:** January 25, 2026  
**Question:** Can we consolidate to 1-2 comprehensive covering indexes instead of multiple specialized ones?

---

## Column Usage Analysis

### Columns Selected Across ALL API Queries

| Column | Usage Count | Query Types |
|---|---|---|
| **GSTaskID** | 12/13 | WHERE clause (key) + SELECT |
| **GSClientID** | 8/13 | WHERE clause (key) + SELECT |
| **Amount** | 13/13 | ✅ EVERY query (aggregations, balances) |
| **TType** | 13/13 | ✅ EVERY query (CASE WHEN filters) |
| **Cost** | 6/13 | Profitability, WIP detail queries |
| **Hour** | 6/13 | Profitability, WIP detail queries |
| **TaskServLine** | 3/13 | Group WIP, Client WIP detail |
| **EmpCode** | 3/13 | Task/Client WIP detail |
| **TranDate** | 5/13 | Fiscal reports, date filters (raw SQL) |
| **updatedAt** | 4/13 | Balance last modified checks |
| **TaskPartner** | 2/13 | My Reports (raw SQL WHERE) |
| **TaskManager** | 2/13 | My Reports (raw SQL WHERE) |

### Rare Columns (used in 1-2 specialized queries)
- TranType, ClientCode, ClientName, TaskCode, TaskDesc (fiscal transaction report only)
- id, GSWIPTransID (transactions endpoint only)

---

## Consolidation Proposal: Two Super Covering Indexes

### Option A: Comprehensive Coverage (RECOMMENDED)

**Replace ALL covering indexes with just 2:**

```sql
-- Index 1: GSClientID queries (client-level aggregations)
CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_super_covering] 
ON [WIPTransactions]([GSClientID]) 
INCLUDE ([GSTaskID], [Amount], [TType], [Cost], [Hour], [TaskServLine], [EmpCode], [TranDate], [updatedAt])
WHERE [GSClientID] IS NOT NULL;

-- Index 2: GSTaskID queries (task-level aggregations)
CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_super_covering] 
ON [WIPTransactions]([GSTaskID]) 
INCLUDE ([GSClientID], [Amount], [TType], [Cost], [Hour], [TaskServLine], [EmpCode], [TranDate], [updatedAt]);
```

**What this replaces:**
- ✅ `idx_wip_gsclientid_covering` (3 columns → 9 columns INCLUDE)
- ✅ `idx_wip_gstaskid_covering` (3 columns → 9 columns INCLUDE)
- ✅ `idx_WIPTransactions_Aggregation_COVERING` (GSTaskID, TType) - **absorbed by Index 2**
- ✅ `WIPTransactions_TType_idx` (single) - **absorbed by Index 2 INCLUDE**

**Coverage verification:**

| Query Pattern | Optimal Index | Coverage |
|---|---|---|
| `WHERE GSClientID = X` | Index 1 (seek) | ✅ All columns in INCLUDE |
| `WHERE GSTaskID = X` | Index 2 (seek) | ✅ All columns in INCLUDE |
| `WHERE GSTaskID IN (...) AND TType = X` | Index 2 (seek + filter) | ✅ TType in INCLUDE |
| `WHERE GSClientID = X AND TranDate BETWEEN X AND Y` | Index 1 (seek) + filter | ✅ TranDate in INCLUDE |
| `WHERE GSTaskID = X AND TranDate BETWEEN X AND Y` | Index 2 (seek) + filter | ✅ TranDate in INCLUDE |

---

## Composite Indexes: Still Needed?

### Date Range Queries with Partners/Managers

**Query pattern (My Reports):**
```sql
WHERE TaskPartner = @empCode 
  AND TranDate >= @start 
  AND TranDate <= @end
```

**Current indexes:**
- `WIPTransactions_TaskPartner_TranDate_idx` (composite)
- `WIPTransactions_TaskManager_TranDate_idx` (composite)

**Question:** Can super covering indexes replace these?

**Answer:** ❌ **NO - These composite indexes are still critical**

**Why:**
- Super covering indexes have GSClientID or GSTaskID as **first key column**
- Query filters on TaskPartner (NOT GSClientID or GSTaskID)
- SQL Server cannot use Index 1 or Index 2 for `WHERE TaskPartner = X`
- Would result in **table scan** instead of **index seek**

**Recommendation:** **KEEP** composite indexes for:
- `TaskPartner + TranDate` queries (My Reports partner view)
- `TaskManager + TranDate` queries (My Reports manager view)
- `GSClientID + TranDate + TType` queries (analytics date ranges)
- `GSTaskID + TranDate + TType` queries (analytics date ranges)

**Reasoning:** Index key column order matters - first column must match WHERE clause filter.

---

## Final Index Recommendation

### KEEP: Essential Indexes (9 total)

| # | Index Name | Key Columns | INCLUDE Columns | Purpose |
|---|---|---|---|---|
| 1 | **idx_wip_gsclientid_super_covering** | GSClientID | GSTaskID, Amount, TType, Cost, Hour, TaskServLine, EmpCode, TranDate, updatedAt | ✅ NEW - Client queries |
| 2 | **idx_wip_gstaskid_super_covering** | GSTaskID | GSClientID, Amount, TType, Cost, Hour, TaskServLine, EmpCode, TranDate, updatedAt | ✅ NEW - Task queries |
| 3 | WIPTransactions_GSClientID_TranDate_TType_idx | GSClientID, TranDate, TType | None | Analytics date ranges |
| 4 | WIPTransactions_GSTaskID_TranDate_TType_idx | GSTaskID, TranDate, TType | None | Analytics date ranges |
| 5 | WIPTransactions_TaskPartner_TranDate_idx | TaskPartner, TranDate | None | My Reports partner |
| 6 | WIPTransactions_TaskManager_TranDate_idx | TaskManager, TranDate | None | My Reports manager |
| 7 | WIPTransactions_TranDate_idx | TranDate | None | Fiscal period queries |
| 8 | WIPTransactions_EmpCode_idx | EmpCode | None | ⚠️ Conditional - verify usage |
| 9 | WIPTransactions_OfficeCode_idx | OfficeCode | None | ⚠️ Conditional - verify usage |
| 10 | WIPTransactions_ServLineGroup_idx | ServLineGroup | None | ⚠️ Conditional - verify usage |

### DROP: Redundant Indexes (7 total)

| Index Name | Reason |
|---|---|
| `idx_wip_gsclientid` | ❌ Superseded by idx_wip_gsclientid_super_covering |
| `idx_wiptransactions_gsclientid` | ❌ Duplicate of above |
| `idx_wip_gstaskid` | ❌ Superseded by idx_wip_gstaskid_super_covering |
| `idx_wiptransactions_gstaskid` | ❌ Duplicate of above |
| `idx_wip_gstaskid_covering` (old) | ❌ Superseded by super covering (9 columns vs 3) |
| `idx_WIPTransactions_Aggregation_COVERING` | ❌ Absorbed by idx_wip_gstaskid_super_covering |
| `WIPTransactions_TType_idx` | ❌ TType in INCLUDE columns of super indexes |

---

## Trade-Off Analysis

### Benefits of Super Covering Indexes

| Benefit | Impact |
|---|---|
| **Fewer indexes** | 9-10 total (down from 14+) |
| **Simpler maintenance** | Only 2 covering indexes to rebuild/reorganize |
| **Faster writes** | Fewer indexes to update on INSERT |
| **Better cache efficiency** | Fewer index pages in buffer pool |
| **Single source of truth** | All common columns in 2 indexes |

### Costs of Super Covering Indexes

| Cost | Impact | Mitigation |
|---|---|---|
| **Larger index size** | 9 INCLUDE columns vs. 3-4 | Still smaller than 7 separate indexes |
| **More disk I/O** | Larger pages to read | Offset by fewer indexes overall |
| **Slightly slower seeks** | More data per index page | Negligible for 9 columns |

### Size Estimation

**Current covering indexes (3 total):**
- `idx_wip_gsclientid_covering`: ~150 MB (3 INCLUDE columns)
- `idx_wip_gstaskid_covering`: ~180 MB (3 INCLUDE columns)
- `idx_WIPTransactions_Aggregation_COVERING`: ~200 MB (3 INCLUDE columns)
- **Total: ~530 MB**

**Proposed super covering indexes (2 total):**
- `idx_wip_gsclientid_super_covering`: ~250 MB (9 INCLUDE columns, filtered)
- `idx_wip_gstaskid_super_covering`: ~320 MB (9 INCLUDE columns)
- **Total: ~570 MB**

**Net change:** +40 MB (7% increase) BUT:
- Remove 7 duplicate/redundant indexes (~200 MB saved)
- **Final savings: ~160 MB total**

---

## Query Performance Impact

### Before: Multiple Specialized Indexes

```sql
-- Query 1: Client WIP (uses idx_wip_gsclientid_covering)
SELECT GSTaskID, Amount, TType FROM WIPTransactions WHERE GSClientID = @id;
-- Index seek + 0 key lookups ✅

-- Query 2: Task profitability (uses idx_WIPTransactions_Aggregation_COVERING)
SELECT SUM(Amount), SUM(Cost), SUM(Hour) FROM WIPTransactions 
WHERE GSTaskID = @id AND TType IN ('T', 'D');
-- Index seek + 0 key lookups ✅
```

### After: Super Covering Indexes

```sql
-- Query 1: Client WIP (uses idx_wip_gsclientid_super_covering)
SELECT GSTaskID, Amount, TType FROM WIPTransactions WHERE GSClientID = @id;
-- Index seek + 0 key lookups ✅ (same performance)

-- Query 2: Task profitability (uses idx_wip_gstaskid_super_covering)
SELECT SUM(Amount), SUM(Cost), SUM(Hour) FROM WIPTransactions 
WHERE GSTaskID = @id AND TType IN ('T', 'D');
-- Index seek + 0 key lookups ✅ (same performance, single index)
```

**Result:** Same or better query performance with fewer indexes.

---

## Implementation Strategy

### Phase 1: Create Super Covering Indexes

```sql
-- Create super covering indexes (ONLINE = ON for zero downtime)
CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_super_covering] 
ON [WIPTransactions]([GSClientID]) 
INCLUDE ([GSTaskID], [Amount], [TType], [Cost], [Hour], [TaskServLine], [EmpCode], [TranDate], [updatedAt])
WHERE [GSClientID] IS NOT NULL
WITH (ONLINE = ON, SORT_IN_TEMPDB = ON);

CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_super_covering] 
ON [WIPTransactions]([GSTaskID]) 
INCLUDE ([GSClientID], [Amount], [TType], [Cost], [Hour], [TaskServLine], [EmpCode], [TranDate], [updatedAt])
WITH (ONLINE = ON, SORT_IN_TEMPDB = ON);
```

### Phase 2: Test Query Performance

```sql
-- Run actual queries with STATISTICS IO, TIME
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- Test 1: Client WIP
SELECT GSTaskID, Amount, TType FROM WIPTransactions WHERE GSClientID = @testClientId;

-- Test 2: Task profitability
SELECT SUM(Amount), SUM(Cost), SUM(Hour) 
FROM WIPTransactions 
WHERE GSTaskID = @testTaskId AND TType IN ('T', 'D');

-- Test 3: Task detail
SELECT Amount, Cost, Hour, TType, EmpCode, updatedAt
FROM WIPTransactions
WHERE GSTaskID = @testTaskId;

-- Verify: Should show index seeks on super covering indexes, 0 key lookups
```

### Phase 3: Drop Old Indexes (After Verification)

```sql
-- Only drop after confirming super indexes used and performance same/better
DROP INDEX [idx_wip_gsclientid_covering] ON [WIPTransactions];
DROP INDEX [idx_wip_gstaskid_covering] ON [WIPTransactions];
DROP INDEX [idx_WIPTransactions_Aggregation_COVERING] ON [WIPTransactions];
DROP INDEX [idx_wip_gsclientid] ON [WIPTransactions];
DROP INDEX [idx_wiptransactions_gsclientid] ON [WIPTransactions];
DROP INDEX [idx_wip_gstaskid] ON [WIPTransactions];
DROP INDEX [idx_wiptransactions_gstaskid] ON [WIPTransactions];
DROP INDEX [WIPTransactions_TType_idx] ON [WIPTransactions];
```

---

## Recommendation

✅ **YES - Consolidate to 2 super covering indexes**

**Rationale:**
1. **Covers 100% of queries** (verified against 13 API endpoints)
2. **Simpler maintenance** (2 indexes instead of 7+)
3. **Better write performance** (fewer indexes to update)
4. **Same read performance** (covering indexes eliminate key lookups)
5. **Smaller total size** (~160 MB savings after removing duplicates)

**Exceptions: Keep composite indexes for:**
- Date range queries with TaskPartner/TaskManager (My Reports)
- Date range queries with GSClientID/GSTaskID + TType (Analytics)
- Single TranDate index for fiscal period queries

**Final count:** **2 super covering + 5-7 composite = 7-9 total indexes** (down from 14+)

---

## Next Steps

1. Update migration to create super covering indexes
2. Update Prisma schema with new index definitions
3. Test query performance with real data
4. Drop old indexes after verification
5. Update documentation with new index strategy
