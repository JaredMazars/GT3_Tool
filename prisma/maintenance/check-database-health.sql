-- ============================================================================
-- Azure SQL Database Health Check Script
-- ============================================================================
-- Run this script QUARTERLY to monitor database health
-- Checks: Index fragmentation, Statistics age, Automatic Tuning status
--
-- Database: gt3-db
-- Recommended Schedule: Every 3 months
-- ============================================================================

PRINT '========================================';
PRINT 'Azure SQL Database Health Check';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ============================================================================
-- 1. INDEX FRAGMENTATION ANALYSIS
-- ============================================================================
PRINT '========================================';
PRINT '1. INDEX FRAGMENTATION ANALYSIS';
PRINT '========================================';
PRINT '';
PRINT 'Checking fragmentation levels (this may take a few minutes)...';
PRINT '';

SELECT 
    OBJECT_SCHEMA_NAME(ips.object_id) AS SchemaName,
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.index_type_desc AS IndexType,
    ips.avg_fragmentation_in_percent AS FragmentationPercent,
    ips.page_count AS PageCount,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 THEN '⚠️ REBUILD RECOMMENDED'
        WHEN ips.avg_fragmentation_in_percent > 10 THEN '⚠️ REORGANIZE RECOMMENDED'
        ELSE '✓ OK'
    END AS Recommendation,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 
        THEN 'ALTER INDEX [' + i.name + '] ON [' + OBJECT_SCHEMA_NAME(ips.object_id) + '].[' + OBJECT_NAME(ips.object_id) + '] REBUILD;'
        WHEN ips.avg_fragmentation_in_percent > 10 
        THEN 'ALTER INDEX [' + i.name + '] ON [' + OBJECT_SCHEMA_NAME(ips.object_id) + '].[' + OBJECT_NAME(ips.object_id) + '] REORGANIZE;'
        ELSE NULL
    END AS ActionSQL
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.page_count > 1000  -- Skip small tables (< 1000 pages = ~8MB)
  AND i.name IS NOT NULL      -- Skip heaps
ORDER BY ips.avg_fragmentation_in_percent DESC;

PRINT '';
PRINT 'Fragmentation Summary:';
SELECT 
    COUNT(*) AS TotalIndexes,
    SUM(CASE WHEN ips.avg_fragmentation_in_percent > 30 THEN 1 ELSE 0 END) AS NeedRebuild,
    SUM(CASE WHEN ips.avg_fragmentation_in_percent BETWEEN 10 AND 30 THEN 1 ELSE 0 END) AS NeedReorganize,
    SUM(CASE WHEN ips.avg_fragmentation_in_percent < 10 THEN 1 ELSE 0 END) AS Healthy
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.page_count > 1000
  AND i.name IS NOT NULL;

PRINT '';

-- ============================================================================
-- 2. STATISTICS AGE ANALYSIS
-- ============================================================================
PRINT '========================================';
PRINT '2. STATISTICS AGE ANALYSIS';
PRINT '========================================';
PRINT '';
PRINT 'Checking statistics freshness...';
PRINT '';

SELECT 
    OBJECT_SCHEMA_NAME(s.object_id) AS SchemaName,
    t.name AS TableName,
    s.name AS StatName,
    STATS_DATE(s.object_id, s.stats_id) AS LastUpdated,
    DATEDIFF(day, STATS_DATE(s.object_id, s.stats_id), GETDATE()) AS DaysOld,
    CASE 
        WHEN STATS_DATE(s.object_id, s.stats_id) IS NULL THEN '⚠️ NEVER UPDATED'
        WHEN DATEDIFF(day, STATS_DATE(s.object_id, s.stats_id), GETDATE()) > 30 THEN '⚠️ STALE'
        WHEN DATEDIFF(day, STATS_DATE(s.object_id, s.stats_id), GETDATE()) > 14 THEN '⚠️ OLD'
        ELSE '✓ OK'
    END AS Status,
    CASE 
        WHEN STATS_DATE(s.object_id, s.stats_id) IS NULL OR DATEDIFF(day, STATS_DATE(s.object_id, s.stats_id), GETDATE()) > 30
        THEN 'UPDATE STATISTICS [' + OBJECT_SCHEMA_NAME(s.object_id) + '].[' + t.name + '] [' + s.name + '] WITH FULLSCAN;'
        ELSE NULL
    END AS ActionSQL
FROM sys.stats s
JOIN sys.tables t ON s.object_id = t.object_id
WHERE STATS_DATE(s.object_id, s.stats_id) IS NULL 
   OR DATEDIFF(day, STATS_DATE(s.object_id, s.stats_id), GETDATE()) > 7
ORDER BY DaysOld DESC;

PRINT '';
PRINT 'Statistics Summary:';
SELECT 
    COUNT(*) AS TotalStats,
    SUM(CASE WHEN STATS_DATE(s.object_id, s.stats_id) IS NULL THEN 1 ELSE 0 END) AS NeverUpdated,
    SUM(CASE WHEN DATEDIFF(day, STATS_DATE(s.object_id, s.stats_id), GETDATE()) > 30 THEN 1 ELSE 0 END) AS Stale,
    SUM(CASE WHEN DATEDIFF(day, STATS_DATE(s.object_id, s.stats_id), GETDATE()) BETWEEN 7 AND 30 THEN 1 ELSE 0 END) AS Old,
    SUM(CASE WHEN DATEDIFF(day, STATS_DATE(s.object_id, s.stats_id), GETDATE()) < 7 THEN 1 ELSE 0 END) AS Fresh
FROM sys.stats s
JOIN sys.tables t ON s.object_id = t.object_id;

PRINT '';

-- ============================================================================
-- 3. AUTOMATIC TUNING STATUS
-- ============================================================================
PRINT '========================================';
PRINT '3. AUTOMATIC TUNING STATUS';
PRINT '========================================';
PRINT '';
PRINT 'Current Automatic Tuning Configuration:';
PRINT '';

SELECT 
    name AS Feature,
    desired_state_desc AS DesiredState,
    actual_state_desc AS ActualState,
    reason_desc AS Reason,
    CASE actual_state_desc
        WHEN 'ON' THEN '✓'
        ELSE '⚠️'
    END AS Status
FROM sys.database_automatic_tuning_options;

PRINT '';
PRINT 'Active Automatic Tuning Recommendations:';
PRINT '';

IF EXISTS (SELECT 1 FROM sys.dm_db_tuning_recommendations WHERE state_desc = 'Active')
BEGIN
    SELECT 
        reason AS Reason,
        score AS ImpactScore,
        state_desc AS State,
        last_refresh AS LastRefresh,
        CONCAT('CREATE INDEX [', index_name, '] ON [', object_name, '] (', index_columns, ')') AS RecommendedIndexSQL
    FROM sys.dm_db_tuning_recommendations
    WHERE state_desc = 'Active'
    ORDER BY score DESC;
END
ELSE
BEGIN
    PRINT 'No active recommendations at this time.';
    PRINT '(Automatic Tuning will create recommendations based on workload patterns)';
END

PRINT '';

-- ============================================================================
-- 4. QUERY STORE STATUS
-- ============================================================================
PRINT '========================================';
PRINT '4. QUERY STORE STATUS';
PRINT '========================================';
PRINT '';

SELECT 
    actual_state_desc AS Status,
    readonly_reason AS ReadOnlyReason,
    current_storage_size_mb AS CurrentSizeMB,
    max_storage_size_mb AS MaxSizeMB,
    CAST((CAST(current_storage_size_mb AS FLOAT) / max_storage_size_mb * 100) AS DECIMAL(5,2)) AS PercentUsed,
    query_capture_mode_desc AS CaptureMode,
    size_based_cleanup_mode_desc AS CleanupMode,
    CASE actual_state_desc
        WHEN 'READ_WRITE' THEN '✓'
        WHEN 'READ_ONLY' THEN '⚠️'
        ELSE '❌'
    END AS HealthStatus
FROM sys.database_query_store_options;

PRINT '';

-- ============================================================================
-- 5. TOP FRAGMENTED TABLES (High Priority)
-- ============================================================================
PRINT '========================================';
PRINT '5. TOP 10 FRAGMENTED TABLES';
PRINT '========================================';
PRINT '';
PRINT 'Tables requiring immediate attention:';
PRINT '';

SELECT TOP 10
    OBJECT_SCHEMA_NAME(ips.object_id) AS SchemaName,
    OBJECT_NAME(ips.object_id) AS TableName,
    COUNT(*) AS FragmentedIndexes,
    AVG(ips.avg_fragmentation_in_percent) AS AvgFragmentation,
    SUM(ips.page_count) * 8 / 1024 AS TotalSizeMB,
    '⚠️ HIGH PRIORITY' AS Priority
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 30
  AND ips.page_count > 1000
  AND i.name IS NOT NULL
GROUP BY ips.object_id
ORDER BY AVG(ips.avg_fragmentation_in_percent) DESC;

PRINT '';

-- ============================================================================
-- 6. DATABASE SIZE AND GROWTH
-- ============================================================================
PRINT '========================================';
PRINT '6. DATABASE SIZE AND GROWTH';
PRINT '========================================';
PRINT '';

SELECT 
    type_desc AS FileType,
    name AS FileName,
    size * 8 / 1024 AS SizeMB,
    max_size * 8 / 1024 AS MaxSizeMB,
    CASE max_size
        WHEN -1 THEN 'Unlimited'
        ELSE CAST((CAST(size AS FLOAT) / max_size * 100) AS VARCHAR(10)) + '%'
    END AS PercentUsed,
    growth * 8 / 1024 AS GrowthMB
FROM sys.database_files;

PRINT '';
PRINT '========================================';
PRINT 'HEALTH CHECK COMPLETE';
PRINT '========================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Review fragmentation levels above';
PRINT '  2. If >30% fragmentation exists, run rebuild-fragmented-indexes.sql';
PRINT '  3. If statistics are stale (>30 days), run the UPDATE STATISTICS commands shown above';
PRINT '  4. Check Automatic Tuning recommendations in Azure Portal';
PRINT '';
PRINT 'Schedule next health check: ' + CONVERT(VARCHAR, DATEADD(month, 3, GETDATE()), 107);
PRINT '';
