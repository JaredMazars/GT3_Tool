-- ============================================================================
-- Azure SQL Database Index Rebuild Script
-- ============================================================================
-- Run this script ONLY if check-database-health.sql shows >30% fragmentation
-- This script will:
--   - REBUILD indexes with >30% fragmentation
--   - REORGANIZE indexes with 10-30% fragmentation
--   - Skip indexes with <10% fragmentation
--
-- ⚠️ WARNING: This script can take several minutes to hours on large databases
-- ⚠️ Recommended: Run during maintenance window (off-peak hours)
--
-- Database: gt3-db
-- ============================================================================

SET NOCOUNT ON;

PRINT '========================================';
PRINT 'Index Maintenance Script';
PRINT 'Database: ' + DB_NAME();
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- Variables
DECLARE @TableSchema NVARCHAR(255);
DECLARE @TableName NVARCHAR(255);
DECLARE @IndexName NVARCHAR(255);
DECLARE @Fragmentation FLOAT;
DECLARE @PageCount BIGINT;
DECLARE @SQL NVARCHAR(MAX);
DECLARE @StartTime DATETIME;
DECLARE @EndTime DATETIME;
DECLARE @TotalIndexes INT = 0;
DECLARE @RebuiltIndexes INT = 0;
DECLARE @ReorganizedIndexes INT = 0;
DECLARE @SkippedIndexes INT = 0;

-- Create temp table for tracking
CREATE TABLE #IndexMaintenance (
    ID INT IDENTITY(1,1),
    SchemaName NVARCHAR(255),
    TableName NVARCHAR(255),
    IndexName NVARCHAR(255),
    Fragmentation FLOAT,
    PageCount BIGINT,
    Action NVARCHAR(50),
    StartTime DATETIME NULL,
    EndTime DATETIME NULL,
    Duration INT NULL,
    Status NVARCHAR(50) NULL
);

-- ============================================================================
-- 1. IDENTIFY INDEXES NEEDING MAINTENANCE
-- ============================================================================
PRINT '1. Analyzing index fragmentation...';
PRINT '';

INSERT INTO #IndexMaintenance (SchemaName, TableName, IndexName, Fragmentation, PageCount, Action)
SELECT 
    OBJECT_SCHEMA_NAME(ips.object_id),
    OBJECT_NAME(ips.object_id),
    i.name,
    ips.avg_fragmentation_in_percent,
    ips.page_count,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 THEN 'REBUILD'
        WHEN ips.avg_fragmentation_in_percent > 10 THEN 'REORGANIZE'
        ELSE 'SKIP'
    END
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.page_count > 1000  -- Skip small tables
  AND i.name IS NOT NULL      -- Skip heaps
  AND ips.avg_fragmentation_in_percent > 10  -- Only process fragmented indexes
ORDER BY ips.avg_fragmentation_in_percent DESC;

SELECT @TotalIndexes = COUNT(*) FROM #IndexMaintenance WHERE Action IN ('REBUILD', 'REORGANIZE');

PRINT 'Found ' + CAST(@TotalIndexes AS VARCHAR(10)) + ' indexes requiring maintenance:';
PRINT '  - REBUILD (>30%): ' + CAST((SELECT COUNT(*) FROM #IndexMaintenance WHERE Action = 'REBUILD') AS VARCHAR(10));
PRINT '  - REORGANIZE (10-30%): ' + CAST((SELECT COUNT(*) FROM #IndexMaintenance WHERE Action = 'REORGANIZE') AS VARCHAR(10));
PRINT '';

IF @TotalIndexes = 0
BEGIN
    PRINT '✓ No indexes require maintenance at this time.';
    PRINT '  All indexes have <10% fragmentation.';
    DROP TABLE #IndexMaintenance;
    RETURN;
END

PRINT '========================================';
PRINT '2. Processing Indexes';
PRINT '========================================';
PRINT '';

-- ============================================================================
-- 2. PROCESS EACH INDEX
-- ============================================================================
DECLARE index_cursor CURSOR LOCAL FAST_FORWARD FOR
SELECT SchemaName, TableName, IndexName, Fragmentation, PageCount, Action, ID
FROM #IndexMaintenance
WHERE Action IN ('REBUILD', 'REORGANIZE')
ORDER BY Fragmentation DESC;  -- Process most fragmented first

DECLARE @ID INT;

OPEN index_cursor;
FETCH NEXT FROM index_cursor INTO @TableSchema, @TableName, @IndexName, @Fragmentation, @PageCount, @SQL, @ID;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @StartTime = GETDATE();
    
    -- Build SQL command
    IF @SQL = 'REBUILD'
    BEGIN
        SET @SQL = 'ALTER INDEX [' + @IndexName + '] ON [' + @TableSchema + '].[' + @TableName + '] REBUILD;';
        PRINT '⚙️  REBUILDING: [' + @TableSchema + '].[' + @TableName + '].[' + @IndexName + '] (' + CAST(@Fragmentation AS VARCHAR(10)) + '% fragmentation)';
    END
    ELSE
    BEGIN
        SET @SQL = 'ALTER INDEX [' + @IndexName + '] ON [' + @TableSchema + '].[' + @TableName + '] REORGANIZE;';
        PRINT '⚙️  REORGANIZING: [' + @TableSchema + '].[' + @TableName + '].[' + @IndexName + '] (' + CAST(@Fragmentation AS VARCHAR(10)) + '% fragmentation)';
    END
    
    -- Execute maintenance
    BEGIN TRY
        EXEC sp_executesql @SQL;
        
        SET @EndTime = GETDATE();
        
        UPDATE #IndexMaintenance
        SET StartTime = @StartTime,
            EndTime = @EndTime,
            Duration = DATEDIFF(second, @StartTime, @EndTime),
            Status = 'SUCCESS'
        WHERE ID = @ID;
        
        IF @SQL LIKE '%REBUILD%'
            SET @RebuiltIndexes = @RebuiltIndexes + 1;
        ELSE
            SET @ReorganizedIndexes = @ReorganizedIndexes + 1;
        
        PRINT '   ✓ Completed in ' + CAST(DATEDIFF(second, @StartTime, @EndTime) AS VARCHAR(10)) + ' seconds';
        PRINT '';
    END TRY
    BEGIN CATCH
        SET @EndTime = GETDATE();
        
        UPDATE #IndexMaintenance
        SET StartTime = @StartTime,
            EndTime = @EndTime,
            Duration = DATEDIFF(second, @StartTime, @EndTime),
            Status = 'ERROR: ' + ERROR_MESSAGE()
        WHERE ID = @ID;
        
        PRINT '   ❌ ERROR: ' + ERROR_MESSAGE();
        PRINT '';
        
        SET @SkippedIndexes = @SkippedIndexes + 1;
    END CATCH
    
    FETCH NEXT FROM index_cursor INTO @TableSchema, @TableName, @IndexName, @Fragmentation, @PageCount, @SQL, @ID;
END

CLOSE index_cursor;
DEALLOCATE index_cursor;

-- ============================================================================
-- 3. SUMMARY REPORT
-- ============================================================================
PRINT '';
PRINT '========================================';
PRINT 'MAINTENANCE SUMMARY';
PRINT '========================================';
PRINT '';
PRINT 'Completed: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';
PRINT 'Results:';
PRINT '  Total Indexes Processed: ' + CAST(@TotalIndexes AS VARCHAR(10));
PRINT '  Rebuilt: ' + CAST(@RebuiltIndexes AS VARCHAR(10));
PRINT '  Reorganized: ' + CAST(@ReorganizedIndexes AS VARCHAR(10));
PRINT '  Errors: ' + CAST(@SkippedIndexes AS VARCHAR(10));
PRINT '';

-- Show detailed results
PRINT 'Detailed Results:';
PRINT '----------------------------------------';
SELECT 
    SchemaName + '.' + TableName AS [Table],
    IndexName,
    CAST(Fragmentation AS DECIMAL(5,2)) AS [Before%],
    Action,
    Duration AS [Seconds],
    Status
FROM #IndexMaintenance
WHERE Action IN ('REBUILD', 'REORGANIZE')
ORDER BY StartTime;

PRINT '';
PRINT '========================================';
PRINT 'RECOMMENDATIONS';
PRINT '========================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Run check-database-health.sql to verify fragmentation is reduced';
PRINT '  2. Monitor query performance in Azure Portal → Query Performance Insight';
PRINT '  3. Check for any errors in the detailed results above';
PRINT '';
PRINT 'Schedule next index maintenance: ' + CONVERT(VARCHAR, DATEADD(month, 3, GETDATE()), 107);
PRINT '';

-- Cleanup
DROP TABLE #IndexMaintenance;

PRINT '✓ Index maintenance complete.';
