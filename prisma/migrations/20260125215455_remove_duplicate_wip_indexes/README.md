# Migration: Remove Duplicate WIPTransactions Indexes

**Date:** 2026-01-25  
**Type:** Index Optimization  
**Impact:** Low Risk - Performance Improvement

---

## Summary

Removes 2 redundant composite indexes from `WIPTransactions` table that overlap with existing super covering indexes.

## Changes

### Indexes Removed

1. **WIPTransactions_GSClientID_TranDate_TType_idx**
   - Key columns: `(GSClientID, TranDate, TType)`
   - Replaced by: `idx_wip_gsclientid_super_covering`
   - Size: ~80-120 MB

2. **WIPTransactions_GSTaskID_TranDate_TType_idx**
   - Key columns: `(GSTaskID, TranDate, TType)`
   - Replaced by: `idx_wip_gstaskid_super_covering`
   - Size: ~80-120 MB

### Indexes Kept (Super Covering)

1. **idx_wip_gsclientid_super_covering**
   ```sql
   ON (GSClientID, TranDate)
   INCLUDE (TType, TranType, Amount, Cost, Hour, MainServLineCode, TaskPartner, TaskManager, updatedAt)
   WHERE GSClientID IS NOT NULL
   ```

2. **idx_wip_gstaskid_super_covering**
   ```sql
   ON (GSTaskID, TranDate)
   INCLUDE (TType, TranType, Amount, Cost, Hour, MainServLineCode, TaskPartner, TaskManager, updatedAt)
   ```

## Rationale

### Why Remove Composite Indexes?

1. **Redundancy**: Super covering indexes already handle all query patterns:
   - `TType` is in INCLUDE clause (accessible without key lookup)
   - First two key columns match: `(GSClientID, TranDate)` vs `(GSClientID, TranDate, TType)`
   - Super covering indexes eliminate ALL key lookups

2. **Performance**: Fewer indexes = faster writes
   - Every INSERT/UPDATE/DELETE maintains both indexes
   - Removing 2 indexes speeds up all DML operations

3. **Storage**: ~100-200 MB disk space saved

4. **Query Coverage**: Super covering indexes serve ALL current query patterns:
   - Simple lookups: `WHERE GSClientID = X`
   - Date ranges: `WHERE GSClientID = X AND TranDate >= Y`
   - With TType: `WHERE GSClientID = X AND TType = 'T'`
   - GROUP BY: `GROUP BY TranDate, TType` (INCLUDE columns accessible)

### Why TType in INCLUDE is Sufficient

**Common Question:** "Doesn't GROUP BY TType prefer TType in the key?"

**Answer:** Not necessarily. The optimizer can efficiently use INCLUDE columns for:
- Filtering: `WHERE TType = 'T'`
- Aggregation: `GROUP BY TType`
- Ordering: `ORDER BY TType`

The covering index eliminates key lookups, which is more valuable than having TType in the key.

## Testing

### Before Deployment

1. **Check Index Usage** (Production):
   ```sql
   SELECT 
       i.name,
       s.user_seeks,
       s.user_scans,
       s.last_user_seek
   FROM sys.dm_db_index_usage_stats s
   JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
   WHERE OBJECT_NAME(s.object_id) = 'WIPTransactions'
   AND i.name IN (
       'WIPTransactions_GSClientID_TranDate_TType_idx',
       'WIPTransactions_GSTaskID_TranDate_TType_idx'
   );
   ```

2. **Baseline Performance** (Application):
   - Client details page load time (expect: <1s)
   - Task WIP page load time (expect: <500ms)
   - Analytics graphs (expect: <2s)

### After Deployment

1. **Monitor Query Performance** (First 24 hours):
   - Watch for slow query alerts
   - Check application logs for WIP query times
   - Monitor SQL Server Query Store

2. **Check Missing Index Suggestions**:
   ```sql
   SELECT * FROM sys.dm_db_missing_index_details
   WHERE statement LIKE '%WIPTransactions%';
   ```

3. **Verify No Performance Degradation**:
   - Client details page: Still <1s
   - Task WIP page: Still <500ms
   - Analytics graphs: Still <2s

## Rollback Plan

### If Performance Degrades

**File:** `rollback.sql` in this folder

**Execution Time:** ~2-3 minutes (creates 2 indexes)

**Steps:**
1. Run `rollback.sql` in SQL Server
2. Verify indexes created: `sp_helpindex 'WIPTransactions'`
3. Update statistics: `UPDATE STATISTICS WIPTransactions WITH FULLSCAN`
4. Monitor for 24 hours

**When to Rollback:**
- Query times increase >10%
- User reports of slow page loads
- SQL Server recommends missing indexes
- Application monitoring shows degradation

## Deployment Instructions

### Prerequisites

- [x] Index audit report reviewed (`INDEX_AUDIT_REPORT.md`)
- [x] Verification script prepared (`verify_indexes.sql`)
- [ ] Baseline performance metrics captured
- [ ] Deployment window scheduled (low-traffic time recommended)
- [ ] Rollback script tested in dev environment

### Execution

**Method 1: Via Prisma Migrate** (Recommended)
```bash
# Development
npx prisma migrate dev --name remove_duplicate_wip_indexes

# Production
npx prisma migrate deploy
```

**Method 2: Manual SQL Execution**
```bash
# In SQL Server Management Studio or Azure Data Studio
# Open: migration.sql
# Execute: F5
```

### Post-Deployment

1. **Immediate** (First 5 minutes):
   - Verify indexes dropped: Run verification query in migration.sql
   - Check application health: Visit client/task pages
   - Monitor errors: Check application logs

2. **First Hour**:
   - Monitor query performance
   - Check CPU/disk utilization (should improve)
   - Review slow query logs

3. **First 24 Hours**:
   - Compare to baseline metrics
   - Check for missing index warnings
   - Monitor user reports

4. **First Week**:
   - Analyze query performance trends
   - Review index usage statistics
   - Document any issues

## Expected Results

### Positive Impacts

✅ **Faster Writes**: All INSERT/UPDATE/DELETE operations on WIPTransactions
✅ **Reduced Storage**: ~100-200 MB freed
✅ **Simpler Index Strategy**: Fewer overlapping indexes
✅ **No Query Slowdown**: Super covering indexes handle all patterns

### Potential Risks (Low Probability)

⚠️ **GROUP BY Performance**: Some queries might be 5-10% slower
⚠️ **Query Plan Changes**: Optimizer might choose different execution plans
⚠️ **Statistics Delay**: May need to update statistics manually

### Monitoring Metrics

| Metric | Before | After (Expected) | Alert If |
|--------|--------|------------------|----------|
| Client details page | <1s | <1s | >1.2s |
| Task WIP page | <500ms | <500ms | >600ms |
| Analytics graphs | <2s | <2s | >2.5s |
| Index size | ~750 MB | ~550 MB | - |
| Index count | 9-11 | 7-9 | - |

## Documentation Updates

After successful deployment, update:

- [x] `prisma/schema.prisma` - Remove @@index directives
- [ ] `docs/WIP_INDEX_MAINTENANCE.md` - Update index list
- [ ] `INDEX_AUDIT_REPORT.md` - Mark composite indexes as removed
- [ ] Code comments in query files - Note super covering index usage

## Related Files

- **Migration**: `migration.sql` (this folder)
- **Rollback**: `rollback.sql` (this folder)
- **Verification**: `verify_indexes.sql` (workspace root)
- **Audit Report**: `INDEX_AUDIT_REPORT.md` (workspace root)
- **Maintenance Guide**: `docs/WIP_INDEX_MAINTENANCE.md`

## Questions & Answers

**Q: Will this break any queries?**  
A: No. The super covering indexes can serve all query patterns that the composite indexes could.

**Q: Why not remove the super covering indexes instead?**  
A: Super covering indexes are more efficient (eliminate key lookups) and have INCLUDE columns that composite indexes lack.

**Q: Can I run this migration during business hours?**  
A: Yes. DROP INDEX is a quick operation (seconds). No table locks or downtime.

**Q: What if I need to rollback?**  
A: Run `rollback.sql` - takes 2-3 minutes to recreate the indexes.

**Q: Will Prisma try to recreate these indexes?**  
A: No, if you remove the `@@index` directives from schema.prisma.

**Q: Should I update statistics after migration?**  
A: Not required (dropping indexes doesn't affect existing statistics), but you can run `UPDATE STATISTICS WIPTransactions WITH FULLSCAN` if desired.

---

**Migration Status:** ✅ Ready for deployment  
**Risk Level:** Low  
**Rollback:** Available (`rollback.sql`)  
**Testing:** Required (24-hour monitoring)
