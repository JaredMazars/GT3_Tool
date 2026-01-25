-- ============================================================================
-- INDEX VERIFICATION SCRIPT
-- Run this script in SQL Server Management Studio or Azure Data Studio
-- ============================================================================
-- Purpose: Compare actual database indexes with baseline migration
-- Expected Results documented in: INDEX_AUDIT_REPORT.md
-- ============================================================================

-- Set output options for better readability
SET NOCOUNT ON;
GO

PRINT '============================================================================';
PRINT 'INDEX VERIFICATION SCRIPT - Generated 2026-01-25';
PRINT '============================================================================';
PRINT '';

-- ============================================================================
-- QUERY 1: Total Index Count by Type
-- ============================================================================
PRINT '============================================================================';
PRINT 'QUERY 1: Total Index Count by Type';
PRINT '============================================================================';
PRINT 'Expected: ~98 CLUSTERED, ~390-400 NONCLUSTERED, ~490 total';
PRINT '----------------------------------------------------------------------------';

SELECT 
    type_desc AS IndexType,
    COUNT(*) AS IndexCount,
    SUM(CASE WHEN is_unique = 1 THEN 1 ELSE 0 END) AS UniqueIndexes,
    SUM(CASE WHEN has_filter = 1 THEN 1 ELSE 0 END) AS FilteredIndexes
FROM sys.indexes
WHERE object_id IN (
    SELECT object_id 
    FROM sys.objects 
    WHERE type = 'U' -- User tables
    AND schema_id = SCHEMA_ID('dbo')
)
GROUP BY type_desc
ORDER BY IndexCount DESC;

PRINT '';
PRINT '';

-- ============================================================================
-- QUERY 2: Indexes with Special Features (INCLUDE or WHERE)
-- ============================================================================
PRINT '============================================================================';
PRINT 'QUERY 2: Indexes with INCLUDE Columns or WHERE Filters';
PRINT '============================================================================';
PRINT 'Expected: 4-5 indexes including super covering indexes on WIPTransactions and DrsTransactions';
PRINT '----------------------------------------------------------------------------';

SELECT 
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique,
    i.has_filter AS HasFilter,
    i.filter_definition AS FilterDefinition,
    (
        SELECT COUNT(*) 
        FROM sys.index_columns ic 
        WHERE ic.object_id = i.object_id 
        AND ic.index_id = i.index_id 
        AND ic.is_included_column = 1
    ) AS IncludedColumnCount
FROM sys.indexes i
WHERE i.object_id IN (
    SELECT object_id FROM sys.objects WHERE type = 'U' AND schema_id = SCHEMA_ID('dbo')
)
AND (
    i.has_filter = 1 
    OR EXISTS (
        SELECT 1 FROM sys.index_columns ic 
        WHERE ic.object_id = i.object_id 
        AND ic.index_id = i.index_id 
        AND ic.is_included_column = 1
    )
)
ORDER BY TableName, IndexName;

PRINT '';
PRINT '';

-- ============================================================================
-- QUERY 3: WIPTransactions Table - Detailed Index List
-- ============================================================================
PRINT '============================================================================';
PRINT 'QUERY 3: All Indexes on WIPTransactions Table';
PRINT '============================================================================';
PRINT 'Expected: 9-11 indexes including 2 super covering indexes';
PRINT '----------------------------------------------------------------------------';

SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique,
    i.has_filter AS HasFilter,
    i.filter_definition AS FilterDefinition,
    STUFF((
        SELECT ', ' + c.name + CASE WHEN ic.is_descending_key = 1 THEN ' DESC' ELSE '' END
        FROM sys.index_columns ic
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE ic.object_id = i.object_id 
        AND ic.index_id = i.index_id
        AND ic.is_included_column = 0
        ORDER BY ic.key_ordinal
        FOR XML PATH('')
    ), 1, 2, '') AS KeyColumns,
    STUFF((
        SELECT ', ' + c.name
        FROM sys.index_columns ic
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE ic.object_id = i.object_id 
        AND ic.index_id = i.index_id
        AND ic.is_included_column = 1
        ORDER BY ic.index_column_id
        FOR XML PATH('')
    ), 1, 2, '') AS IncludedColumns,
    (
        SELECT SUM(ps.used_page_count) * 8 / 1024
        FROM sys.dm_db_partition_stats ps
        WHERE ps.object_id = i.object_id AND ps.index_id = i.index_id
    ) AS SizeMB
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('WIPTransactions')
AND i.name IS NOT NULL
ORDER BY 
    CASE 
        WHEN i.name LIKE 'idx_wip%covering%' THEN 1
        WHEN i.name LIKE 'WIPTransactions%' THEN 2
        ELSE 3
    END,
    i.name;

PRINT '';
PRINT '';

-- ============================================================================
-- QUERY 4: Find Duplicate/Overlapping Indexes on WIPTransactions
-- ============================================================================
PRINT '============================================================================';
PRINT 'QUERY 4: Duplicate/Overlapping Indexes on WIPTransactions';
PRINT '============================================================================';
PRINT 'Expected: Potential overlap between super covering and composite indexes';
PRINT '----------------------------------------------------------------------------';

WITH IndexDetails AS (
    SELECT 
        i.object_id,
        OBJECT_NAME(i.object_id) AS TableName,
        i.name AS IndexName,
        i.index_id,
        i.is_unique,
        i.has_filter,
        STUFF((
            SELECT ',' + c.name
            FROM sys.index_columns ic
            JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE ic.object_id = i.object_id 
            AND ic.index_id = i.index_id
            AND ic.is_included_column = 0
            ORDER BY ic.key_ordinal
            FOR XML PATH('')
        ), 1, 1, '') AS KeyColumnList,
        STUFF((
            SELECT ',' + c.name
            FROM sys.index_columns ic
            JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE ic.object_id = i.object_id 
            AND ic.index_id = i.index_id
            AND ic.is_included_column = 1
            ORDER BY ic.index_column_id
            FOR XML PATH('')
        ), 1, 1, '') AS IncludeColumnList
    FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID('WIPTransactions')
    AND i.name IS NOT NULL
)
SELECT 
    a.IndexName AS Index1,
    b.IndexName AS Index2,
    a.KeyColumnList AS Index1_KeyColumns,
    b.KeyColumnList AS Index2_KeyColumns,
    a.IncludeColumnList AS Index1_IncludeColumns,
    b.IncludeColumnList AS Index2_IncludeColumns,
    CASE 
        WHEN a.KeyColumnList = b.KeyColumnList THEN 'EXACT KEY DUPLICATE'
        WHEN a.KeyColumnList LIKE b.KeyColumnList + ',%' THEN 'Index1 extends Index2 keys'
        WHEN b.KeyColumnList LIKE a.KeyColumnList + ',%' THEN 'Index2 extends Index1 keys'
        WHEN a.KeyColumnList LIKE SUBSTRING(b.KeyColumnList, 1, CHARINDEX(',', b.KeyColumnList + ',') - 1) + '%'
             OR b.KeyColumnList LIKE SUBSTRING(a.KeyColumnList, 1, CHARINDEX(',', a.KeyColumnList + ',') - 1) + '%' 
        THEN 'OVERLAPPING KEYS'
        ELSE 'DIFFERENT KEYS'
    END AS Relationship,
    CASE
        WHEN a.has_filter = 1 AND b.has_filter = 0 THEN 'Index1 filtered, Index2 not'
        WHEN a.has_filter = 0 AND b.has_filter = 1 THEN 'Index2 filtered, Index1 not'
        WHEN a.has_filter = 1 AND b.has_filter = 1 THEN 'Both filtered'
        ELSE 'Neither filtered'
    END AS FilterStatus,
    CASE
        WHEN a.IncludeColumnList IS NOT NULL AND b.IncludeColumnList IS NOT NULL THEN 'Both have INCLUDE'
        WHEN a.IncludeColumnList IS NOT NULL THEN 'Only Index1 has INCLUDE'
        WHEN b.IncludeColumnList IS NOT NULL THEN 'Only Index2 has INCLUDE'
        ELSE 'Neither has INCLUDE'
    END AS IncludeStatus
FROM IndexDetails a
CROSS JOIN IndexDetails b
WHERE a.index_id < b.index_id
AND (
    -- Same first column
    SUBSTRING(a.KeyColumnList, 1, CHARINDEX(',', a.KeyColumnList + ',') - 1) = 
    SUBSTRING(b.KeyColumnList, 1, CHARINDEX(',', b.KeyColumnList + ',') - 1)
    -- Or exact match
    OR a.KeyColumnList = b.KeyColumnList
    -- Or one extends the other
    OR a.KeyColumnList LIKE b.KeyColumnList + ',%'
    OR b.KeyColumnList LIKE a.KeyColumnList + ',%'
)
ORDER BY 
    CASE 
        WHEN a.KeyColumnList = b.KeyColumnList THEN 1
        ELSE 2
    END,
    a.IndexName, b.IndexName;

PRINT '';
PRINT '';

-- ============================================================================
-- QUERY 5: Index Usage Statistics
-- ============================================================================
PRINT '============================================================================';
PRINT 'QUERY 5: Index Usage Statistics (Since Last SQL Server Restart)';
PRINT '============================================================================';
PRINT 'Shows how often each index is used for seeks, scans, and lookups';
PRINT '----------------------------------------------------------------------------';

SELECT 
    OBJECT_NAME(s.object_id) AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    s.user_seeks AS UserSeeks,
    s.user_scans AS UserScans,
    s.user_lookups AS UserLookups,
    s.user_updates AS UserUpdates,
    s.last_user_seek AS LastSeek,
    s.last_user_scan AS LastScan,
    CASE 
        WHEN s.user_seeks IS NULL THEN 'UNUSED SINCE RESTART'
        WHEN s.user_seeks + s.user_scans + s.user_lookups = 0 THEN 'UNUSED'
        WHEN s.user_lookups > 0 AND i.type_desc LIKE '%NONCLUSTERED%' THEN 'HAS KEY LOOKUPS (Bad for covering index)'
        WHEN s.user_seeks > s.user_scans * 10 THEN 'OPTIMAL (Seeks >> Scans)'
        WHEN s.user_scans > s.user_seeks THEN 'CHECK QUERIES (More scans than seeks)'
        ELSE 'NORMAL'
    END AS UsagePattern
FROM sys.dm_db_index_usage_stats s
JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE OBJECT_NAME(s.object_id) = 'WIPTransactions'
ORDER BY 
    CASE 
        WHEN s.user_seeks + s.user_scans + s.user_lookups = 0 THEN 1
        ELSE 0
    END,
    s.user_seeks + s.user_scans + s.user_lookups DESC;

PRINT '';
PRINT '';

-- ============================================================================
-- QUERY 6: Index Fragmentation and Size
-- ============================================================================
PRINT '============================================================================';
PRINT 'QUERY 6: Index Fragmentation and Size';
PRINT '============================================================================';
PRINT 'Shows index health and maintenance needs';
PRINT '----------------------------------------------------------------------------';

SELECT 
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.index_type_desc AS IndexType,
    ips.avg_fragmentation_in_percent AS FragmentationPercent,
    ips.page_count AS PageCount,
    ips.page_count * 8 / 1024 AS SizeMB,
    ips.avg_page_space_used_in_percent AS AvgPageFullness,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 THEN 'REBUILD REQUIRED'
        WHEN ips.avg_fragmentation_in_percent BETWEEN 10 AND 30 THEN 'REORGANIZE RECOMMENDED'
        ELSE 'HEALTHY'
    END AS MaintenanceAction
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('WIPTransactions'), NULL, NULL, 'SAMPLED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE i.name IS NOT NULL
ORDER BY ips.avg_fragmentation_in_percent DESC;

PRINT '';
PRINT '';

-- ============================================================================
-- QUERY 7: Missing Index Suggestions (Last 7 Days)
-- ============================================================================
PRINT '============================================================================';
PRINT 'QUERY 7: SQL Server Missing Index Suggestions for WIPTransactions';
PRINT '============================================================================';
PRINT 'Indexes SQL Server recommends based on recent query patterns';
PRINT '----------------------------------------------------------------------------';

SELECT 
    mid.statement AS TableName,
    migs.avg_user_impact AS AvgImpactPercent,
    migs.user_seeks AS UserSeeks,
    migs.user_scans AS UserScans,
    mid.equality_columns AS EqualityColumns,
    mid.inequality_columns AS InequalityColumns,
    mid.included_columns AS SuggestedIncludeColumns,
    'CREATE NONCLUSTERED INDEX [IX_WIPTransactions_Suggested_' + 
    CAST(NEWID() AS NVARCHAR(50)) + 
    '] ON ' + mid.statement + 
    ' (' + ISNULL(mid.equality_columns, '') + 
    CASE WHEN mid.inequality_columns IS NOT NULL 
         THEN CASE WHEN mid.equality_columns IS NOT NULL THEN ',' ELSE '' END + mid.inequality_columns 
         ELSE '' 
    END + ')' +
    CASE WHEN mid.included_columns IS NOT NULL 
         THEN ' INCLUDE (' + mid.included_columns + ')' 
         ELSE '' 
    END AS CreateIndexStatement
FROM sys.dm_db_missing_index_group_stats migs
JOIN sys.dm_db_missing_index_groups mig ON migs.group_handle = mig.index_group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
WHERE mid.statement LIKE '%WIPTransactions%'
AND migs.avg_user_impact > 10
ORDER BY migs.avg_user_impact DESC;

PRINT '';
PRINT '';

-- ============================================================================
-- SUMMARY
-- ============================================================================
PRINT '============================================================================';
PRINT 'VERIFICATION COMPLETE';
PRINT '============================================================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Compare results with INDEX_AUDIT_REPORT.md';
PRINT '2. Check for any UNUSED indexes (consider removal)';
PRINT '3. Investigate overlapping indexes (Query 4)';
PRINT '4. Review missing index suggestions (Query 7)';
PRINT '5. Address any REBUILD REQUIRED indexes (Query 6)';
PRINT '';
PRINT 'Documentation: INDEX_AUDIT_REPORT.md';
PRINT '============================================================================';
GO
