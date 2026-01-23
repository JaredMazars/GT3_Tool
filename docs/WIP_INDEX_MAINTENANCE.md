# WIPTransactions Index Maintenance Guide

**Last Updated:** January 23, 2026  
**Table:** `WIPTransactions`  
**Covering Indexes:** `idx_wip_gsclientid_covering`, `idx_wip_gstaskid_covering`

## Overview

This document provides maintenance procedures, monitoring queries, and troubleshooting steps for the WIPTransactions covering indexes.

## Index Structure

### idx_wip_gsclientid_covering
```sql
CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_covering] 
ON [WIPTransactions]([GSClientID]) 
INCLUDE ([Amount], [TType], [GSTaskID])
WHERE [GSClientID] IS NOT NULL;
```

**Purpose:** Optimizes queries filtering by `GSClientID` (client-level WIP queries)  
**Coverage:** Eliminates key lookups for Amount, TType, GSTaskID columns  
**Filter:** Excludes NULL GSClientID values (smaller index, better performance)

### idx_wip_gstaskid_covering
```sql
CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_covering] 
ON [WIPTransactions]([GSTaskID]) 
INCLUDE ([Amount], [TType], [GSClientID]);
```

**Purpose:** Optimizes queries filtering by `GSTaskID` (task-level WIP queries)  
**Coverage:** Eliminates key lookups for Amount, TType, GSClientID columns

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
- Consider new covering index candidates

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
WHERE OBJECT_NAME(s.object_id) = 'WIPTransactions'
    AND i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
ORDER BY s.user_seeks + s.user_scans + s.user_lookups DESC;
```

**Expected Results:**
- `user_seeks` should be high (hundreds to thousands daily)
- `user_scans` should be low (index seeks are better than scans)
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
        THEN 'ALTER INDEX [' + i.name + '] ON [WIPTransactions] REBUILD WITH (ONLINE = ON);'
        WHEN ips.avg_fragmentation_in_percent BETWEEN 10 AND 30
        THEN 'ALTER INDEX [' + i.name + '] ON [WIPTransactions] REORGANIZE;'
        ELSE 'No action needed'
    END AS RecommendedCommand
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('WIPTransactions'), NULL, NULL, 'SAMPLED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
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
WHERE i.object_id = OBJECT_ID('WIPTransactions')
    AND i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
GROUP BY i.name, p.rows
ORDER BY TotalSizeMB DESC;
```

**Typical Sizes:**
- Each covering index: ~500-800 MB (depending on data volume)
- Combined: ~1-1.5 GB total

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
WHERE qt.text LIKE '%WIPTransactions%'
    AND qt.text LIKE '%GSClientID%'
    AND qt.text NOT LIKE '%sys.dm_exec%'
ORDER BY qs.execution_count DESC;
```

**Performance Targets:**
- **Client details page:** < 1 second
- **Balance queries:** < 500ms
- **WIP aggregation:** < 2 seconds

---

## Maintenance Operations

### Rebuild Index (Fragmentation > 30%)

**SQL Server Standard Edition (offline):**
```sql
ALTER INDEX [idx_wip_gsclientid_covering] ON [WIPTransactions] REBUILD;
ALTER INDEX [idx_wip_gstaskid_covering] ON [WIPTransactions] REBUILD;

UPDATE STATISTICS [WIPTransactions] WITH FULLSCAN;
```

**SQL Server Enterprise Edition (online - no downtime):**
```sql
ALTER INDEX [idx_wip_gsclientid_covering] ON [WIPTransactions] 
REBUILD WITH (ONLINE = ON, MAXDOP = 4);

ALTER INDEX [idx_wip_gstaskid_covering] ON [WIPTransactions] 
REBUILD WITH (ONLINE = ON, MAXDOP = 4);

UPDATE STATISTICS [WIPTransactions] WITH FULLSCAN;
```

**Best Practice:** Schedule rebuilds during maintenance windows (low traffic)

---

### Reorganize Index (Fragmentation 10-30%)

```sql
ALTER INDEX [idx_wip_gsclientid_covering] ON [WIPTransactions] REORGANIZE;
ALTER INDEX [idx_wip_gstaskid_covering] ON [WIPTransactions] REORGANIZE;

-- Update statistics after reorganize
UPDATE STATISTICS [WIPTransactions]([idx_wip_gsclientid_covering]) WITH FULLSCAN;
UPDATE STATISTICS [WIPTransactions]([idx_wip_gstaskid_covering]) WITH FULLSCAN;
```

**Note:** REORGANIZE is always online (no downtime)

---

### Update Statistics

**Manual statistics update:**
```sql
-- Update all statistics on WIPTransactions table
UPDATE STATISTICS [WIPTransactions] WITH FULLSCAN;

-- Or update specific index statistics
UPDATE STATISTICS [WIPTransactions]([idx_wip_gsclientid_covering]) WITH FULLSCAN;
UPDATE STATISTICS [WIPTransactions]([idx_wip_gstaskid_covering]) WITH FULLSCAN;
```

**Automated statistics update:**
SQL Server automatically updates statistics, but you can force immediate update after large data loads.

---

## Troubleshooting

### Issue: Index Not Being Used

**Symptoms:**
- Queries still slow despite covering index
- Query plan shows table scan or different index

**Diagnosis:**
```sql
-- Check if index exists
SELECT * FROM sys.indexes 
WHERE object_id = OBJECT_ID('WIPTransactions')
    AND name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering');

-- Get execution plan for specific query
SET STATISTICS IO ON;
SET SHOWPLAN_TEXT ON;

SELECT GSTaskID, Amount, TType 
FROM WIPTransactions 
WHERE GSClientID = 'your-guid-here';

SET SHOWPLAN_TEXT OFF;
```

**Solutions:**
1. Update statistics: `UPDATE STATISTICS [WIPTransactions] WITH FULLSCAN;`
2. Check filter predicate (must use `GSClientID IS NOT NULL` for filtered index)
3. Verify query uses exact column names (case-sensitive)
4. Force index hint as test: `FROM WIPTransactions WITH (INDEX(idx_wip_gsclientid_covering))`

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
ALTER INDEX [idx_wip_gsclientid_covering] ON [WIPTransactions] 
REBUILD WITH (FILLFACTOR = 90);

-- Check current FILLFACTOR
SELECT name, fill_factor 
FROM sys.indexes 
WHERE object_id = OBJECT_ID('WIPTransactions')
    AND name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering');
```

---

### Issue: Excessive Index Size

**Symptoms:**
- Index > 1 GB per covering index
- Slow rebuild times
- High storage costs

**Diagnosis:**
```sql
-- Check included column usage
SELECT 
    i.name,
    SUM(a.total_pages) * 8 / 1024 AS SizeMB,
    p.rows
FROM sys.indexes i
JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE i.object_id = OBJECT_ID('WIPTransactions')
    AND i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
GROUP BY i.name, p.rows;
```

**Solutions:**
- This is expected behavior for covering indexes (trade space for speed)
- Included columns eliminate key lookups (worth the space)
- If truly excessive, consider archiving old WIPTransactions data

---

## Performance Benchmarks

### Expected Query Performance (Post-Optimization)

| Query Type | Execution Time | Logical Reads | Index Used |
|------------|----------------|---------------|------------|
| Client details (OR query) | < 1s | < 1,000 | Both covering indexes |
| Balance query (Amount/TType) | < 500ms | < 500 | idx_wip_gsclientid_covering |
| Task WIP | < 300ms | < 200 | idx_wip_gstaskid_covering |
| Group WIP (multiple clients) | < 2s | < 5,000 | idx_wip_gsclientid_covering |

### Baseline Metrics (Before Optimization)

| Query Type | Was | Now | Improvement |
|------------|-----|-----|-------------|
| Client details page | 5-10s | <1s | **80-90% faster** |
| Balance queries | 2-3s | <500ms | **75-83% faster** |
| Task WIP | 1-2s | <300ms | **70-85% faster** |

---

## Alerting Recommendations

### Critical Alerts
- Index fragmentation > 50%
- Query execution time > 5 seconds
- Index not found/disabled
- Statistics out of date (> 7 days since update)

### Warning Alerts
- Index fragmentation 30-50%
- Query execution time > 2 seconds
- Low index usage (< 10 seeks/day)
- Statistics moderately stale (> 3 days)

### Monitoring Tools
- SQL Server Management Studio (SSMS) - Query Store
- Azure SQL Database - Query Performance Insight
- Application Performance Monitoring (APM) - New Relic, DataDog
- Custom monitoring with `sys.dm_db_index_usage_stats`

---

## Related Documentation

- **Migration README:** `/prisma/migrations/20260123063454_replace_simple_with_covering_wip_indexes/README.md`
- **Query Optimization Plan:** `/.cursor/plans/wip_query_optimization_b682bf6c.plan.md`
- **Performance Analysis:** `/docs/WIP_QUERY_OPTIMIZATION_ANALYSIS.sql`

---

## Contact & Support

For questions or issues:
1. Check query execution plans
2. Review index usage statistics  
3. Verify statistics are up to date
4. Consult this maintenance guide
5. Escalate to database team if unresolved
