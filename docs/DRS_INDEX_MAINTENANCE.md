# DrsTransactions Index Maintenance Guide

**Last Updated:** January 25, 2026  
**Table:** `DrsTransactions`  
**Super Covering Indexes:** `idx_drs_gsclientid_super_covering`, `idx_drs_biller_super_covering`

## Overview

This document provides maintenance procedures, monitoring queries, and troubleshooting steps for the DrsTransactions super covering indexes.

## Index Structure

### Total Index Count: 6-7 (down from 8)

The DrsTransactions table uses a streamlined index strategy:

1. **2 Super Covering Indexes** - Handle 100% of queries with 6-8 INCLUDE columns each
2. **4-5 Single Column Indexes** - For office, period, service line, and date filtering
3. **Optional:** `idx_drs_biller_yearmonth_covering` (monthly aggregation optimization)

### idx_drs_gsclientid_super_covering

```sql
CREATE NONCLUSTERED INDEX [idx_drs_gsclientid_super_covering] 
ON [DrsTransactions]([GSClientID], [TranDate]) 
INCLUDE ([Total], [EntryType], [InvNumber], [Reference], [Narration], [ServLineCode], [Biller], [updatedAt])
WHERE [GSClientID] IS NOT NULL;
```

**Purpose:** Covers ALL client-level debtor queries  
**Key Columns:** GSClientID, TranDate (composite for date range queries)  
**INCLUDE Columns (8):** Total, EntryType, InvNumber, Reference, Narration, ServLineCode, Biller, updatedAt  
**Filter:** Excludes NULL GSClientID values (smaller index, better performance)

### idx_drs_biller_super_covering

```sql
CREATE NONCLUSTERED INDEX [idx_drs_biller_super_covering] 
ON [DrsTransactions]([Biller], [TranDate]) 
INCLUDE ([Total], [EntryType], [ServLineCode], [TranYearMonth], [InvNumber], [Reference])
WHERE [Biller] IS NOT NULL;
```

**Purpose:** Covers ALL My Reports debtor queries  
**Key Columns:** Biller, TranDate (composite for date range queries)  
**INCLUDE Columns (6):** Total, EntryType, ServLineCode, TranYearMonth, InvNumber, Reference  
**Filter:** Excludes NULL Biller values (smaller index, better performance)

### Single Column Indexes (Kept)

| Index Name | Key Column | Purpose |
|---|---|---|
| `DrsTransactions_OfficeCode_idx` | OfficeCode | Office-level filtering |
| `DrsTransactions_PeriodKey_idx` | PeriodKey | Period-based filtering |
| `DrsTransactions_ServLineCode_idx` | ServLineCode | Service line filtering |
| `DrsTransactions_TranDate_idx` | TranDate | Fiscal period queries |

---

## Regular Maintenance Schedule

### Daily Monitoring (Automated)
- Monitor application performance logs
- Check for slow query alerts
- Review index usage statistics

### Weekly Checks
- Review index usage patterns
- Check for missing index recommendations
- Analyze top slow queries

### Monthly Maintenance
- **Check fragmentation** (see below)
- **Rebuild if needed** (>30% fragmentation)
- **Update statistics** WITH FULLSCAN
- Review query performance trends

### Quarterly Review
- Analyze index effectiveness
- Review query patterns for optimization opportunities
- Consider additional INCLUDE columns if needed

---

## Monitoring Queries

### 1. Index Usage Statistics

**Check how often indexes are being used:**

```sql
SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    s.user_seeks AS UserSeeks,
    s.user_scans AS UserScans,
    s.user_lookups AS UserLookups,
    s.user_updates AS UserUpdates,
    s.last_user_seek AS LastSeek,
    s.last_user_scan AS LastScan,
    CASE 
        WHEN s.user_seeks + s.user_scans + s.user_lookups = 0 THEN 'UNUSED'
        WHEN s.user_seeks > s.user_scans * 10 THEN 'OPTIMAL'
        WHEN s.user_scans > s.user_seeks THEN 'CHECK_QUERIES'
        ELSE 'NORMAL'
    END AS UsagePattern
FROM sys.dm_db_index_usage_stats s
JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE OBJECT_NAME(s.object_id) = 'DrsTransactions'
    AND i.name LIKE '%super_covering%'
ORDER BY s.user_seeks + s.user_scans + s.user_lookups DESC;
```

**Expected Results:**
- `user_seeks` should be high (hundreds to thousands daily)
- `user_scans` should be low (index seeks are better than scans)
- `user_lookups` should be ZERO (covering index eliminates lookups)
- `UsagePattern` should be 'OPTIMAL' or 'NORMAL'

**Action if UNUSED:**
- Verify application is using updated code
- Check query plans to ensure index is being selected
- Review filter conditions (WHERE clauses)

---

### 2. Fragmentation Analysis

**Check index fragmentation levels:**

```sql
SELECT 
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.index_type_desc AS IndexType,
    ips.avg_fragmentation_in_percent AS FragmentationPercent,
    ips.page_count AS PageCount,
    ips.avg_page_space_used_in_percent AS AvgPageFullness,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 THEN 'REBUILD REQUIRED'
        WHEN ips.avg_fragmentation_in_percent BETWEEN 10 AND 30 THEN 'REORGANIZE RECOMMENDED'
        ELSE 'HEALTHY'
    END AS MaintenanceAction,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 
        THEN 'ALTER INDEX [' + i.name + '] ON [DrsTransactions] REBUILD WITH (ONLINE = ON);'
        WHEN ips.avg_fragmentation_in_percent BETWEEN 10 AND 30
        THEN 'ALTER INDEX [' + i.name + '] ON [DrsTransactions] REORGANIZE;'
        ELSE 'No action needed'
    END AS RecommendedCommand
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('DrsTransactions'), NULL, NULL, 'SAMPLED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE i.name LIKE '%super_covering%'
ORDER BY ips.avg_fragmentation_in_percent DESC;
```

**Fragmentation Thresholds:**
- **< 10%:** Healthy - no action needed
- **10-30%:** Moderate - REORGANIZE recommended
- **> 30%:** High - REBUILD required

---

### 3. Index Size and Space Usage

**Monitor index storage requirements:**

```sql
SELECT 
    i.name AS IndexName,
    p.rows AS RowCount,
    SUM(a.total_pages) * 8 / 1024 AS TotalSizeMB,
    SUM(a.used_pages) * 8 / 1024 AS UsedSizeMB,
    SUM(a.data_pages) * 8 / 1024 AS DataSizeMB,
    (SUM(a.total_pages) - SUM(a.used_pages)) * 8 / 1024 AS UnusedSizeMB
FROM sys.indexes i
JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE i.object_id = OBJECT_ID('DrsTransactions')
    AND i.name LIKE '%super_covering%'
GROUP BY i.name, p.rows
ORDER BY TotalSizeMB DESC;
```

**Typical Sizes (with 6-8 INCLUDE columns):**
- `idx_drs_gsclientid_super_covering`: ~150-250 MB (filtered, 8 INCLUDE)
- `idx_drs_biller_super_covering`: ~100-200 MB (filtered, 6 INCLUDE)
- Combined: ~250-450 MB total

---

### 4. Query Performance Analysis

**Find queries using these indexes:**

```sql
SELECT TOP 20
    qs.execution_count AS ExecutionCount,
    qs.total_logical_reads AS TotalLogicalReads,
    qs.total_logical_reads / qs.execution_count AS AvgLogicalReads,
    qs.total_elapsed_time / 1000000.0 AS TotalElapsedTimeSec,
    (qs.total_elapsed_time / qs.execution_count) / 1000.0 AS AvgElapsedTimeMs,
    SUBSTRING(qt.text, (qs.statement_start_offset/2)+1, 
        ((CASE qs.statement_end_offset 
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset 
        END - qs.statement_start_offset)/2) + 1) AS QueryText
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
WHERE qt.text LIKE '%DrsTransactions%'
    AND (qt.text LIKE '%GSClientID%' OR qt.text LIKE '%Biller%')
    AND qt.text NOT LIKE '%sys.dm_exec%'
ORDER BY qs.execution_count DESC;
```

**Performance Targets:**
- **Client debtor details:** < 500ms
- **Balance aggregates:** < 200ms
- **Group debtors:** < 800ms
- **My Reports collections:** < 1s

---

## Maintenance Operations

### Rebuild Index (Fragmentation > 30%)

**SQL Server Enterprise Edition (online - no downtime):**
```sql
ALTER INDEX [idx_drs_gsclientid_super_covering] ON [DrsTransactions] 
REBUILD WITH (ONLINE = ON, MAXDOP = 4);

ALTER INDEX [idx_drs_biller_super_covering] ON [DrsTransactions] 
REBUILD WITH (ONLINE = ON, MAXDOP = 4);

UPDATE STATISTICS [DrsTransactions] WITH FULLSCAN;
```

**SQL Server Standard Edition (offline):**
```sql
ALTER INDEX [idx_drs_gsclientid_super_covering] ON [DrsTransactions] REBUILD;
ALTER INDEX [idx_drs_biller_super_covering] ON [DrsTransactions] REBUILD;

UPDATE STATISTICS [DrsTransactions] WITH FULLSCAN;
```

**Best Practice:** Schedule rebuilds during maintenance windows (low traffic)

---

### Reorganize Index (Fragmentation 10-30%)

```sql
ALTER INDEX [idx_drs_gsclientid_super_covering] ON [DrsTransactions] REORGANIZE;
ALTER INDEX [idx_drs_biller_super_covering] ON [DrsTransactions] REORGANIZE;

-- Update statistics after reorganize
UPDATE STATISTICS [DrsTransactions] WITH FULLSCAN;
```

**Note:** REORGANIZE is always online (no downtime)

---

### Update Statistics

**Manual statistics update:**
```sql
-- Update all statistics on DrsTransactions table
UPDATE STATISTICS [DrsTransactions] WITH FULLSCAN;

-- Or update specific index statistics
UPDATE STATISTICS [DrsTransactions]([idx_drs_gsclientid_super_covering]) WITH FULLSCAN;
UPDATE STATISTICS [DrsTransactions]([idx_drs_biller_super_covering]) WITH FULLSCAN;
```

**Automated statistics update:**
SQL Server automatically updates statistics, but you can force immediate update after large data loads.

---

## Troubleshooting

### Issue: Index Not Being Used

**Symptoms:**
- Queries still slow despite super covering index
- Query plan shows table scan or different index

**Diagnosis:**
```sql
-- Check if index exists
SELECT * FROM sys.indexes 
WHERE object_id = OBJECT_ID('DrsTransactions')
    AND name LIKE '%super_covering%';

-- Get execution plan for specific query
SET STATISTICS IO ON;
SET SHOWPLAN_TEXT ON;

SELECT TranDate, Total, EntryType, InvNumber
FROM DrsTransactions 
WHERE GSClientID = 'your-guid-here';

SET SHOWPLAN_TEXT OFF;
```

**Solutions:**
1. Update statistics: `UPDATE STATISTICS [DrsTransactions] WITH FULLSCAN;`
2. Check filter predicate (must use `GSClientID IS NOT NULL` for filtered index)
3. Verify query uses exact column names (case-sensitive)
4. Force index hint as test: `FROM DrsTransactions WITH (INDEX(idx_drs_gsclientid_super_covering))`

---

### Issue: High Fragmentation Immediately After Rebuild

**Symptoms:**
- Fragmentation > 10% right after rebuild
- Rapid fragmentation growth

**Possible Causes:**
- Small FILLFACTOR setting
- High INSERT/UPDATE activity
- Page splits due to GUIDs

**Solutions:**
```sql
-- Rebuild with higher FILLFACTOR
ALTER INDEX [idx_drs_gsclientid_super_covering] ON [DrsTransactions] 
REBUILD WITH (FILLFACTOR = 90);

-- Check current FILLFACTOR
SELECT name, fill_factor 
FROM sys.indexes 
WHERE object_id = OBJECT_ID('DrsTransactions')
    AND name LIKE '%super_covering%';
```

---

### Issue: Excessive Index Size

**Symptoms:**
- Index > 500 MB per super covering index
- Slow rebuild times
- High storage costs

**Diagnosis:**
```sql
SELECT 
    i.name,
    SUM(a.total_pages) * 8 / 1024 AS SizeMB,
    p.rows
FROM sys.indexes i
JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE i.object_id = OBJECT_ID('DrsTransactions')
    AND i.name LIKE '%super_covering%'
GROUP BY i.name, p.rows;
```

**Solutions:**
- This is expected behavior for super covering indexes (6-8 INCLUDE columns)
- The extra size is offset by eliminating key lookups
- Included columns eliminate need for multiple specialized indexes
- If truly excessive, consider archiving old transactions (> 5 years)

---

## Performance Benchmarks

### Expected Query Performance (With Super Covering Indexes)

| Query Type | Execution Time | Logical Reads | Key Lookups | Index Used |
|------------|----------------|---------------|-------------|------------|
| Client balance aggregate | < 200ms | < 500 | **0** | idx_drs_gsclientid_super_covering |
| Client debtor details | < 500ms | < 1,000 | **0** | idx_drs_gsclientid_super_covering |
| Group debtors (multiple clients) | < 800ms | < 3,000 | **0** | idx_drs_gsclientid_super_covering |
| My Reports collections | < 1s | < 2,000 | **0** | idx_drs_biller_super_covering |
| My Reports net billings | < 1s | < 2,000 | **0** | idx_drs_biller_super_covering |
| Debtors balance calculation | < 1s | < 2,500 | **0** | idx_drs_biller_super_covering |

### Index Count Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total indexes | 8 | **6-7** | 1-2 fewer |
| Covering indexes | Partial (2-3 INCLUDE) | **Comprehensive (6-8 INCLUDE)** | 3-4x more coverage |
| INCLUDE columns | 2-3 each | **6-8 each** | 2-3x more coverage |
| Storage | ~400 MB | **~450-500 MB** | Net ~100 MB increase (more comprehensive) |

---

## Alerting Recommendations

### Critical Alerts
- Index fragmentation > 50%
- Query execution time > 3 seconds
- Index not found/disabled
- Statistics out of date (> 7 days since update)
- user_lookups > 0 (should be 0 for covering indexes)

### Warning Alerts
- Index fragmentation 30-50%
- Query execution time > 1 second
- Low index usage (< 10 seeks/day)
- Statistics moderately stale (> 3 days)

### Monitoring Tools
- SQL Server Management Studio (SSMS) - Query Store
- Azure SQL Database - Query Performance Insight
- Application Performance Monitoring (APM) - New Relic, DataDog
- Custom monitoring with `sys.dm_db_index_usage_stats`

---

## Related Documentation

- **Migration: Create Super Covering:** `prisma/migrations/20260125_add_super_covering_drs_indexes/`
- **Migration: Cleanup Old Indexes:** `prisma/migrations/20260125_cleanup_drs_duplicate_indexes/`
- **Verification Script:** `scripts/verify_drs_super_covering_indexes.sql`
- **Super Covering Analysis:** `docs/DRS_SUPER_COVERING_INDEX_ANALYSIS.md`
- **WIP Index Maintenance (Reference):** `docs/WIP_INDEX_MAINTENANCE.md`

---

## Contact & Support

For questions or issues:
1. Check query execution plans (should show Index Seek, 0 key lookups)
2. Review index usage statistics
3. Verify statistics are up to date
4. Run verification script: `scripts/verify_drs_super_covering_indexes.sql`
5. Consult this maintenance guide
6. Escalate to database team if unresolved
