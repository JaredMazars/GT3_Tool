# Cleanup Duplicate and Superseded DrsTransactions Indexes

**Date:** 2026-01-25  
**Type:** Performance Optimization (Cleanup)  
**Risk:** Low (only drops redundant indexes)

## Overview

This migration removes redundant and superseded indexes after the super covering indexes have been verified to work correctly. This reduces storage overhead and improves write performance.

## Prerequisites

**CRITICAL:** Only run this migration AFTER:
1. ✅ Super covering indexes migration has been applied (`20260125_add_super_covering_drs_indexes`)
2. ✅ Query performance has been tested and verified
3. ✅ Execution plans show Index Seek on super covering indexes with 0 key lookups
4. ✅ No errors or performance degradation observed

## Indexes to Drop

### Superseded Indexes (2)

**1. idx_drs_gsclientid_trandate_entrytype**
- **Reason:** Superseded by `idx_drs_gsclientid_super_covering`
- **Old:** (GSClientID, TranDate, EntryType) - no INCLUDE columns
- **New:** (GSClientID, TranDate) INCLUDE (8 columns) - much more comprehensive

**2. idx_drs_biller_trandate**
- **Reason:** Superseded by `idx_drs_biller_super_covering`
- **Old:** (Biller, TranDate) INCLUDE (Total, EntryType) - 2 INCLUDE columns
- **New:** (Biller, TranDate) INCLUDE (6 columns) - 3x more coverage

### Duplicate Indexes (0-2)

The migration automatically detects and removes duplicates:

**ServLineCode Indexes:**
- If multiple single-column `ServLineCode` indexes exist, keeps 1 and drops others
- Example: `DrsTransactions_ServLineCode_idx`, `idx_drs_servlinecode`

**TranDate Indexes:**
- If multiple single-column `TranDate` indexes exist, keeps 1 and drops others
- Example: `DrsTransactions_TranDate_idx`, `idx_drs_trandate`

## Indexes to Keep

After cleanup, the following indexes remain (6-7 total):

| Index Name | Key Columns | INCLUDE Columns | Purpose |
|---|---|---|---|
| idx_drs_gsclientid_super_covering | GSClientID, TranDate | 8 columns | **NEW** - All client queries |
| idx_drs_biller_super_covering | Biller, TranDate | 6 columns | **NEW** - All My Reports queries |
| idx_drs_biller_yearmonth_covering | Biller, TranYearMonth | Total, EntryType | Monthly aggregations |
| (Single column) | OfficeCode | None | Office filtering |
| (Single column) | PeriodKey | None | Period filtering |
| (Single column) | ServLineCode | None | Service line filtering |
| (Single column) | TranDate | None | Date filtering |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total indexes | 8 | 6-7 | 1-2 fewer indexes |
| Covering indexes | Partial (2-3 columns) | Comprehensive (6-8 columns) | 3-4x more coverage |
| Storage savings | Baseline | ~50-100 MB | Reduced footprint |
| Write performance | Baseline | Faster | Fewer indexes to maintain |
| Query performance | Baseline | Same or better | Super covering indexes |

## Safety Features

**Verification Before Cleanup:**
- Migration verifies super covering indexes exist before dropping old ones
- Fails with clear error message if super covering indexes not found
- Ensures you can't accidentally break queries

**Automatic Duplicate Detection:**
- Intelligently detects duplicate indexes by analyzing index structure
- Keeps first index found, drops others
- Handles cases where index names may differ across deployments

## Rollback

If needed, recreate the dropped indexes:

```sql
BEGIN TRANSACTION;

-- Recreate GSClientID composite index
CREATE NONCLUSTERED INDEX [idx_drs_gsclientid_trandate_entrytype] 
  ON [DrsTransactions]([GSClientID], [TranDate], [EntryType]);

-- Recreate Biller composite index
CREATE NONCLUSTERED INDEX [idx_drs_biller_trandate] 
  ON [DrsTransactions]([Biller], [TranDate])
  INCLUDE ([Total], [EntryType]);

UPDATE STATISTICS [DrsTransactions] WITH FULLSCAN;

COMMIT TRANSACTION;
```

**Note:** Rollback should rarely be needed since super covering indexes serve all queries the old indexes could.

## Estimated Runtime

- **Index drops:** 1-2 minutes (instant operations)
- **Statistics update:** 3-5 minutes
- **Total:** ~5-7 minutes

## Expected Results

After cleanup, you should see:
- ✅ Fewer indexes to maintain
- ✅ Faster INSERT/UPDATE operations (fewer indexes to update)
- ✅ Reduced storage overhead
- ✅ Same or better query performance (super covering indexes)
- ✅ Simplified index maintenance

## Verification

After cleanup, verify index structure:

```sql
-- Check remaining indexes
SELECT 
    i.name AS IndexName,
    i.type_desc,
    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS KeyColumns
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('DrsTransactions')
    AND i.type_desc = 'NONCLUSTERED'
    AND ic.is_included_column = 0
GROUP BY i.name, i.type_desc
ORDER BY i.name;

-- Should show 6-7 indexes total, including:
-- - idx_drs_gsclientid_super_covering
-- - idx_drs_biller_super_covering
-- - idx_drs_biller_yearmonth_covering
-- - Single column indexes
```

## Related Files

- `20260125_add_super_covering_drs_indexes/` - Migration that creates super covering indexes (run first)
- `scripts/verify_drs_super_covering_indexes.sql` - Verification queries
- `docs/DRS_SUPER_COVERING_INDEX_ANALYSIS.md` - Full analysis
- `docs/DRS_INDEX_MAINTENANCE.md` - Maintenance guide
