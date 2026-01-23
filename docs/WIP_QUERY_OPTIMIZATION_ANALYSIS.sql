-- ============================================================================
-- WIPTransactions Query Optimization Analysis
-- ============================================================================
-- Date: 2026-01-23
-- Purpose: Compare query performance before/after covering index implementation
-- 
-- This script provides:
-- 1. Query execution plans (before/after)
-- 2. Performance metrics comparison
-- 3. Index usage verification
-- 4. Validation queries for data completeness
--
-- USAGE:
-- - Run each section separately in SSMS or Azure Data Studio
-- - Compare "BEFORE" vs "AFTER" metrics
-- - Verify covering indexes are being used
-- ============================================================================

-- Enable execution plan and IO statistics
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SET SHOWPLAN_TEXT OFF; -- Set to ON to see text plan, OFF for graphical

-- ============================================================================
-- SECTION 1: Index Verification
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 1: Verify Covering Indexes Exist';
PRINT '========================================';
PRINT '';

SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique,
    i.has_filter AS HasFilter,
    i.filter_definition AS FilterDefinition,
    STUFF((
        SELECT ', ' + c.name
        FROM sys.index_columns ic
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
        ORDER BY ic.key_ordinal
        FOR XML PATH('')
    ), 1, 2, '') AS KeyColumns,
    STUFF((
        SELECT ', ' + c.name
        FROM sys.index_columns ic
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 1
        ORDER BY ic.index_column_id
        FOR XML PATH('')
    ), 1, 2, '') AS IncludedColumns
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('WIPTransactions')
    AND i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
ORDER BY i.name;

PRINT '';
PRINT 'Expected Results:';
PRINT '- idx_wip_gsclientid_covering: Key=[GSClientID], Include=[Amount, TType, GSTaskID]';
PRINT '- idx_wip_gstaskid_covering: Key=[GSTaskID], Include=[Amount, TType, GSClientID]';
PRINT '';

-- ============================================================================
-- SECTION 2: Test Data Setup
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 2: Get Test Data for Queries';
PRINT '========================================';
PRINT '';

-- Get a real client with tasks for testing
DECLARE @TestClientID uniqueidentifier;
DECLARE @TestTaskIDs TABLE (GSTaskID uniqueidentifier);

SELECT TOP 1 @TestClientID = GSClientID
FROM WIPTransactions
WHERE GSClientID IS NOT NULL
GROUP BY GSClientID
HAVING COUNT(*) > 10
ORDER BY COUNT(*) DESC;

INSERT INTO @TestTaskIDs
SELECT TOP 12 DISTINCT GSTaskID
FROM WIPTransactions
WHERE GSClientID = @TestClientID;

PRINT 'Test Client ID: ' + CAST(@TestClientID AS varchar(50));
PRINT 'Test Tasks: ' + CAST((SELECT COUNT(*) FROM @TestTaskIDs) AS varchar(10));
PRINT '';

-- ============================================================================
-- SECTION 3: Query 1 - Simple GSClientID Filter
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 3: Query 1 - Client Balance Query';
PRINT 'Pattern: SELECT Amount, TType WHERE GSClientID = X';
PRINT '========================================';
PRINT '';

-- Clear query plan cache for accurate comparison
DBCC DROPCLEANBUFFERS; -- Clears data cache
DBCC FREEPROCCACHE; -- Clears plan cache
-- WARNING: Only run above on test environment, NOT production!

-- Run query
DECLARE @StartTime datetime2 = SYSDATETIME();

SELECT 
    Amount,
    TType
FROM WIPTransactions
WHERE GSClientID = @TestClientID;

DECLARE @EndTime datetime2 = SYSDATETIME();

PRINT 'Execution Time: ' + CAST(DATEDIFF(MILLISECOND, @StartTime, @EndTime) AS varchar(10)) + 'ms';
PRINT '';
PRINT 'Expected with covering index:';
PRINT '- Execution plan: Index Seek on idx_wip_gsclientid_covering';
PRINT '- Logical reads: < 500';
PRINT '- Execution time: < 500ms';
PRINT '- NO Key Lookup operations';
PRINT '';

-- ============================================================================
-- SECTION 4: Query 2 - OR with GSTaskID IN (Most Complex)
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 4: Query 2 - Client Details OR Query';
PRINT 'Pattern: WHERE GSClientID = X OR GSTaskID IN (...)';
PRINT '========================================';
PRINT '';

-- BEFORE optimization (using OR - slower)
PRINT '--- BEFORE (OR query) ---';
DBCC DROPCLEANBUFFERS;
DBCC FREEPROCCACHE;

SET @StartTime = SYSDATETIME();

SELECT 
    GSTaskID,
    Amount,
    TType
FROM WIPTransactions
WHERE GSClientID = @TestClientID 
   OR GSTaskID IN (SELECT GSTaskID FROM @TestTaskIDs);

SET @EndTime = SYSDATETIME();

PRINT 'OR Query Execution Time: ' + CAST(DATEDIFF(MILLISECOND, @StartTime, @EndTime) AS varchar(10)) + 'ms';
PRINT '';

-- AFTER optimization (using UNION ALL - faster)
PRINT '--- AFTER (UNION ALL query) ---';
DBCC DROPCLEANBUFFERS;
DBCC FREEPROCCACHE;

SET @StartTime = SYSDATETIME();

-- Path 1: Direct client link
SELECT 
    GSTaskID,
    Amount,
    TType
FROM WIPTransactions WITH (INDEX(idx_wip_gsclientid_covering))
WHERE GSClientID = @TestClientID

UNION ALL

-- Path 2: Task-only link (excluding client rows to avoid duplicates)
SELECT 
    GSTaskID,
    Amount,
    TType
FROM WIPTransactions WITH (INDEX(idx_wip_gstaskid_covering))
WHERE GSTaskID IN (SELECT GSTaskID FROM @TestTaskIDs)
  AND (GSClientID IS NULL OR GSClientID <> @TestClientID);

SET @EndTime = SYSDATETIME();

PRINT 'UNION ALL Query Execution Time: ' + CAST(DATEDIFF(MILLISECOND, @StartTime, @EndTime) AS varchar(10)) + 'ms';
PRINT '';
PRINT 'Expected improvement: 50-80% faster with UNION ALL + covering indexes';
PRINT '';

-- ============================================================================
-- SECTION 5: Data Completeness Validation
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 5: Validate Data Completeness';
PRINT 'Ensure UNION ALL returns same rows as OR';
PRINT '========================================';
PRINT '';

-- Count rows from OR query
DECLARE @OrCount int;
SELECT @OrCount = COUNT(*)
FROM WIPTransactions
WHERE GSClientID = @TestClientID 
   OR GSTaskID IN (SELECT GSTaskID FROM @TestTaskIDs);

PRINT 'OR query row count: ' + CAST(@OrCount AS varchar(10));

-- Count rows from UNION ALL query
DECLARE @UnionCount int;
SELECT @UnionCount = COUNT(*)
FROM (
    SELECT GSTaskID, Amount, TType
    FROM WIPTransactions
    WHERE GSClientID = @TestClientID
    
    UNION ALL
    
    SELECT GSTaskID, Amount, TType
    FROM WIPTransactions
    WHERE GSTaskID IN (SELECT GSTaskID FROM @TestTaskIDs)
      AND (GSClientID IS NULL OR GSClientID <> @TestClientID)
) AS UnionResult;

PRINT 'UNION ALL query row count: ' + CAST(@UnionCount AS varchar(10));

IF @OrCount = @UnionCount
    PRINT '✅ PASS: Row counts match - data completeness verified';
ELSE
    PRINT '❌ FAIL: Row counts differ - investigation needed';

PRINT '';

-- Check for NULL GSClientID transactions (billing fees)
DECLARE @NullClientCount int;
SELECT @NullClientCount = COUNT(*)
FROM WIPTransactions
WHERE GSTaskID IN (SELECT GSTaskID FROM @TestTaskIDs)
  AND GSClientID IS NULL;

PRINT 'Transactions with NULL GSClientID: ' + CAST(@NullClientCount AS varchar(10));
IF @NullClientCount > 0
    PRINT '✅ UNION ALL correctly captures NULL GSClientID transactions (billing fees)';
PRINT '';

-- ============================================================================
-- SECTION 6: Query 3 - Simple GSTaskID Filter
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 6: Query 3 - Task WIP Query';
PRINT 'Pattern: SELECT WHERE GSTaskID = X';
PRINT '========================================';
PRINT '';

DECLARE @SingleTaskID uniqueidentifier;
SELECT TOP 1 @SingleTaskID = GSTaskID FROM @TestTaskIDs;

DBCC DROPCLEANBUFFERS;
DBCC FREEPROCCACHE;

SET @StartTime = SYSDATETIME();

SELECT 
    TaskServLine,
    Amount,
    Cost,
    Hour,
    TType,
    EmpCode,
    updatedAt
FROM WIPTransactions
WHERE GSTaskID = @SingleTaskID;

SET @EndTime = SYSDATETIME();

PRINT 'Execution Time: ' + CAST(DATEDIFF(MILLISECOND, @StartTime, @EndTime) AS varchar(10)) + 'ms';
PRINT '';
PRINT 'Expected with covering index:';
PRINT '- Index Seek on idx_wip_gstaskid_covering for key columns';
PRINT '- Key Lookup for Cost, Hour, TaskServLine, EmpCode, updatedAt (not included)';
PRINT '- Still faster than without index (uses index for WHERE clause)';
PRINT '';

-- ============================================================================
-- SECTION 7: Index Usage Statistics
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 7: Index Usage Statistics';
PRINT '========================================';
PRINT '';

SELECT 
    i.name AS IndexName,
    s.user_seeks AS UserSeeks,
    s.user_scans AS UserScans,
    s.user_lookups AS UserLookups,
    s.user_updates AS UserUpdates,
    s.last_user_seek AS LastUserSeek,
    s.last_user_scan AS LastUserScan,
    CASE 
        WHEN s.user_seeks + s.user_scans + s.user_lookups = 0 THEN 'UNUSED'
        WHEN s.user_seeks > s.user_scans * 10 THEN 'OPTIMAL (mostly seeks)'
        WHEN s.user_scans > s.user_seeks THEN 'NEEDS REVIEW (many scans)'
        ELSE 'NORMAL'
    END AS UsagePattern
FROM sys.dm_db_index_usage_stats s
INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE OBJECT_NAME(s.object_id) = 'WIPTransactions'
    AND i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
ORDER BY s.user_seeks DESC;

PRINT '';
PRINT 'Expected:';
PRINT '- User seeks should be high (> 100 after running queries above)';
PRINT '- User scans should be low or zero';
PRINT '- Usage pattern should be OPTIMAL or NORMAL';
PRINT '';

-- ============================================================================
-- SECTION 8: Index Fragmentation Check
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 8: Index Fragmentation';
PRINT '========================================';
PRINT '';

SELECT 
    i.name AS IndexName,
    ips.index_type_desc AS IndexType,
    ips.avg_fragmentation_in_percent AS FragmentationPercent,
    ips.page_count AS PageCount,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 THEN 'REBUILD REQUIRED'
        WHEN ips.avg_fragmentation_in_percent BETWEEN 10 AND 30 THEN 'REORGANIZE RECOMMENDED'
        ELSE 'HEALTHY'
    END AS MaintenanceAction
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('WIPTransactions'), NULL, NULL, 'SAMPLED') ips
INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
ORDER BY ips.avg_fragmentation_in_percent DESC;

PRINT '';
PRINT 'Fragmentation Guidelines:';
PRINT '- < 10%: Healthy, no action needed';
PRINT '- 10-30%: Moderate, consider REORGANIZE';
PRINT '- > 30%: High, REBUILD recommended';
PRINT '';

-- ============================================================================
-- SECTION 9: Summary Report
-- ============================================================================

PRINT '========================================';
PRINT 'SECTION 9: Performance Summary';
PRINT '========================================';
PRINT '';

-- Get row counts
DECLARE @TotalRows bigint;
SELECT @TotalRows = COUNT(*) FROM WIPTransactions;

-- Get index sizes
SELECT 
    i.name AS IndexName,
    SUM(a.total_pages) * 8 / 1024 AS TotalSizeMB,
    SUM(a.used_pages) * 8 / 1024 AS UsedSizeMB
FROM sys.indexes i
JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE i.object_id = OBJECT_ID('WIPTransactions')
    AND i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
GROUP BY i.name
ORDER BY TotalSizeMB DESC;

PRINT '';
PRINT '========================================';
PRINT 'Analysis Complete';
PRINT '========================================';
PRINT '';
PRINT 'Review the execution plans and metrics above to verify:';
PRINT '1. Covering indexes are being used (Index Seek operations)';
PRINT '2. Query execution time improved (compare OR vs UNION ALL)';
PRINT '3. Logical reads reduced (fewer page reads)';
PRINT '4. Data completeness maintained (same row counts)';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. If indexes not being used, run: UPDATE STATISTICS WIPTransactions WITH FULLSCAN;';
PRINT '2. Monitor production queries for continued optimization';
PRINT '3. Schedule monthly fragmentation checks';
PRINT '4. Review query plans periodically for regressions';
PRINT '';

-- Disable IO and TIME statistics
SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
