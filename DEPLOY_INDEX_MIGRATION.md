# Quick Deployment Guide: Remove Duplicate Indexes

**Migration:** `20260125215455_remove_duplicate_wip_indexes`  
**Risk Level:** 🟢 Low  
**Duration:** <10 seconds  
**Rollback:** Available

---

## TL;DR

Removes 2 redundant indexes from WIPTransactions table. Super covering indexes already handle all queries. No performance impact expected.

---

## Pre-Flight Checklist

- [ ] Read `MIGRATION_20260125_SUMMARY.md` (full details)
- [ ] Read `prisma/migrations/20260125215455_remove_duplicate_wip_indexes/README.md`
- [ ] Backup database (optional - can rollback via SQL)
- [ ] Schedule deployment (optional - can run anytime)

---

## Deployment: Choose Your Method

### Method 1: Prisma Migrate (Recommended)

```bash
# Development
npx prisma migrate dev --name remove_duplicate_wip_indexes

# Production
npx prisma migrate deploy
```

### Method 2: Manual SQL

1. Open SQL Server Management Studio or Azure Data Studio
2. Connect to your database
3. Open file: `prisma/migrations/20260125215455_remove_duplicate_wip_indexes/migration.sql`
4. Execute (F5)
5. Check output for success messages

---

## Immediate Verification (60 seconds)

### Step 1: Check Indexes Were Dropped

```sql
SELECT name 
FROM sys.indexes
WHERE object_id = OBJECT_ID('WIPTransactions')
AND name IN (
    'WIPTransactions_GSClientID_TranDate_TType_idx',
    'WIPTransactions_GSTaskID_TranDate_TType_idx'
);
```

**Expected:** No rows returned (indexes removed)

### Step 2: Test Application

Visit these pages and verify they load normally:
- Client details page (<1 second)
- Task details page (<500ms)
- Analytics/graphs page (<2 seconds)

---

## Monitoring: First 24 Hours

### Automated Monitoring

Watch these metrics in your APM (New Relic, DataDog, etc.):
- WIP query response times
- Client details page load time
- Task details page load time
- Error rates

**Alert if:**
- Any WIP query >2 seconds
- Error rate increases >5%
- User complaints about slow pages

### Manual Check (End of Day 1)

```sql
-- Check if SQL Server recommends missing indexes
SELECT 
    migs.avg_user_impact AS ImpactPercent,
    mid.equality_columns + 
    ISNULL(', ' + mid.inequality_columns, '') + 
    ISNULL(' INCLUDE (' + mid.included_columns + ')', '') AS RecommendedIndex
FROM sys.dm_db_missing_index_group_stats migs
JOIN sys.dm_db_missing_index_groups mig ON migs.group_handle = mig.index_group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
WHERE mid.statement LIKE '%WIPTransactions%'
AND mid.equality_columns LIKE '%GSClientID%' OR mid.equality_columns LIKE '%GSTaskID%'
AND migs.avg_user_impact > 10
ORDER BY migs.avg_user_impact DESC;
```

**Expected:** No results (SQL Server not recommending the removed indexes)

**If results found:** Review Query 5 in `verify_indexes.sql` and consider rollback

---

## Rollback (If Needed)

### When to Rollback

Only if:
- ❌ Queries consistently >10% slower
- ❌ SQL Server recommends missing indexes with >20% impact
- ❌ User reports of slow performance
- ❌ Application monitoring shows degradation

### How to Rollback (2-3 minutes)

1. Open `prisma/migrations/20260125215455_remove_duplicate_wip_indexes/rollback.sql`
2. Execute in SQL Server Management Studio
3. Wait ~2-3 minutes for indexes to rebuild
4. Run: `UPDATE STATISTICS WIPTransactions WITH FULLSCAN`
5. Monitor for 24 hours

---

## Success Criteria

✅ **Day 1:**
- Indexes successfully dropped
- All pages load normally
- No slow query alerts
- No user complaints

✅ **Week 1:**
- No missing index recommendations
- Performance metrics stable or improved
- No rollback needed

✅ **Month 1:**
- ~100-200 MB storage saved
- Faster write operations
- No performance issues reported

---

## Quick Reference

| File | Purpose |
|------|---------|
| `MIGRATION_20260125_SUMMARY.md` | Full migration details |
| `DEPLOY_INDEX_MIGRATION.md` | This file - quick deploy guide |
| `prisma/migrations/20260125215455_remove_duplicate_wip_indexes/migration.sql` | SQL to drop indexes |
| `prisma/migrations/20260125215455_remove_duplicate_wip_indexes/rollback.sql` | SQL to restore indexes |
| `prisma/migrations/20260125215455_remove_duplicate_wip_indexes/README.md` | Detailed migration docs |
| `prisma/migrations/20260125215455_remove_duplicate_wip_indexes/BEFORE_AFTER.md` | Visual comparison |

---

## Support

**Questions?** See:
- `MIGRATION_20260125_SUMMARY.md` for FAQs
- `prisma/migrations/20260125215455_remove_duplicate_wip_indexes/README.md` for technical details
- `INDEX_AUDIT_REPORT.md` for analysis

**Issues?**
1. Check monitoring queries above
2. Review `verify_indexes.sql` Query 5 (usage stats)
3. Consider rollback if performance degraded >10%
4. Document any issues for future reference

---

**Status:** ✅ Ready to Deploy  
**Next Step:** Run migration via Prisma or manual SQL  
**Timeline:** <10 seconds deployment + 24 hours monitoring
