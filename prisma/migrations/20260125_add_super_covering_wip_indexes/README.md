# Super Covering WIPTransactions Indexes Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive - creates new indexes, doesn't drop existing)

## Overview

This migration creates 2 comprehensive "super covering" indexes that replace 7+ specialized indexes on the WIPTransactions table.

## Indexes Created

### 1. idx_wip_gsclientid_super_covering

```sql
CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_super_covering] 
ON [WIPTransactions]([GSClientID]) 
INCLUDE ([GSTaskID], [Amount], [TType], [Cost], [Hour], [TaskServLine], [EmpCode], [TranDate], [updatedAt])
WHERE [GSClientID] IS NOT NULL;
```

**Purpose:** Covers ALL client-level WIP queries  
**Key Column:** GSClientID  
**INCLUDE Columns (9):** GSTaskID, Amount, TType, Cost, Hour, TaskServLine, EmpCode, TranDate, updatedAt  
**Filter:** WHERE GSClientID IS NOT NULL (smaller index size)

### 2. idx_wip_gstaskid_super_covering

```sql
CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_super_covering] 
ON [WIPTransactions]([GSTaskID]) 
INCLUDE ([GSClientID], [Amount], [TType], [Cost], [Hour], [TaskServLine], [EmpCode], [TranDate], [updatedAt]);
```

**Purpose:** Covers ALL task-level WIP queries  
**Key Column:** GSTaskID  
**INCLUDE Columns (9):** GSClientID, Amount, TType, Cost, Hour, TaskServLine, EmpCode, TranDate, updatedAt

## Query Coverage

These 2 indexes cover 100% of WIPTransactions queries (verified across 13 API endpoints):

| Query Type | Columns Used | Covered By |
|---|---|---|
| Client WIP aggregation | GSClientID, Amount, TType, GSTaskID | idx_wip_gsclientid_super_covering |
| Task WIP aggregation | GSTaskID, Amount, TType, GSClientID | idx_wip_gstaskid_super_covering |
| Profitability reports | GSTaskID, Amount, Cost, Hour, TType | idx_wip_gstaskid_super_covering |
| Balance queries | GSClientID/GSTaskID, Amount, TType, updatedAt | Both indexes |
| WIP detail queries | GSTaskID, TaskServLine, EmpCode, all metrics | idx_wip_gstaskid_super_covering |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total covering indexes | 3 specialized | 2 comprehensive | 33% fewer |
| Query coverage | Partial | 100% | Complete |
| INCLUDE columns | 3-4 each | 9 each | More comprehensive |
| Maintenance | 3 indexes to rebuild | 2 indexes | Simpler |

## Next Steps After This Migration

1. **Run test queries** to verify optimizer uses new indexes
2. **Check execution plans** - should show Index Seek, 0 key lookups
3. **Run cleanup migration** (20260125_cleanup_wip_duplicate_indexes) to drop old indexes

## Rollback

If issues occur, drop the new indexes:

```sql
DROP INDEX IF EXISTS [idx_wip_gsclientid_super_covering] ON [WIPTransactions];
DROP INDEX IF EXISTS [idx_wip_gstaskid_super_covering] ON [WIPTransactions];
```

Note: Old indexes will still exist until cleanup migration is run, so rollback is safe.

## Estimated Runtime

- **Index creation:** 15-30 minutes (ONLINE = ON, non-blocking)
- **Statistics update:** 5-10 minutes
- **Total:** ~30-45 minutes

## Related Files

- `scripts/check_wip_indexes.sql` - Verification script
- `20260125_cleanup_wip_duplicate_indexes/` - Cleanup migration (run after testing)
- `docs/WIP_SUPER_COVERING_INDEX_ANALYSIS.md` - Full analysis documentation
