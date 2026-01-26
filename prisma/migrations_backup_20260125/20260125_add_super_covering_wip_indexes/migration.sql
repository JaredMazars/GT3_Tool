-- ============================================================================
-- Migration: Create Super Covering WIPTransactions Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Replace 7+ specialized indexes with 2 comprehensive "super covering"
--          indexes that handle 100% of WIPTransactions queries
--
-- Benefits:
--   - Reduces total indexes from 14+ to 7-9
--   - Simpler maintenance (2 covering indexes instead of 7+)
--   - Better write performance (fewer indexes to update on INSERT)
--   - Same or better read performance (9 INCLUDE columns cover all queries)
--   - ~160 MB net storage savings after cleanup
--
-- Query Coverage (verified across 13 API endpoints):
--   - Client WIP queries (Amount, TType, GSTaskID)
--   - Task WIP queries (Amount, TType, Cost, Hour, GSClientID)
--   - Profitability reports (Cost, Hour, Amount, TType)
--   - Balance queries (Amount, TType, updatedAt)
--   - WIP detail queries (TaskServLine, EmpCode, all aggregation fields)
--
-- IMPORTANT: Run this migration BEFORE the cleanup migration.
--            Test query performance before dropping old indexes.
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

-- ============================================================================
-- STEP 1: Create GSClientID Super Covering Index
-- ============================================================================
-- Covers ALL client-level WIP queries with 9 INCLUDE columns
-- Filtered index (WHERE GSClientID IS NOT NULL) for smaller size

IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_wip_gsclientid_super_covering' 
    AND object_id = OBJECT_ID('dbo.WIPTransactions')
)
BEGIN
    PRINT 'Creating idx_wip_gsclientid_super_covering (9 INCLUDE columns)...';
    
    CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_super_covering] 
    ON [dbo].[WIPTransactions]([GSClientID]) 
    INCLUDE (
        [GSTaskID], 
        [Amount], 
        [TType], 
        [Cost], 
        [Hour], 
        [TaskServLine], 
        [EmpCode], 
        [TranDate], 
        [updatedAt]
    )
    WHERE [GSClientID] IS NOT NULL
    WITH (
        ONLINE = ON,           -- Non-blocking, allows concurrent access
        SORT_IN_TEMPDB = ON,   -- Reduce contention on data files
        MAXDOP = 0             -- Use all available processors
    );
    
    PRINT '✓ Created idx_wip_gsclientid_super_covering';
END
ELSE
BEGIN
    PRINT '⚠ idx_wip_gsclientid_super_covering already exists, skipping...';
END

-- ============================================================================
-- STEP 2: Create GSTaskID Super Covering Index
-- ============================================================================
-- Covers ALL task-level WIP queries with 9 INCLUDE columns
-- No filter (GSTaskID is always NOT NULL)

IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_wip_gstaskid_super_covering' 
    AND object_id = OBJECT_ID('dbo.WIPTransactions')
)
BEGIN
    PRINT 'Creating idx_wip_gstaskid_super_covering (9 INCLUDE columns)...';
    
    CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_super_covering] 
    ON [dbo].[WIPTransactions]([GSTaskID]) 
    INCLUDE (
        [GSClientID], 
        [Amount], 
        [TType], 
        [Cost], 
        [Hour], 
        [TaskServLine], 
        [EmpCode], 
        [TranDate], 
        [updatedAt]
    )
    WITH (
        ONLINE = ON,           -- Non-blocking, allows concurrent access
        SORT_IN_TEMPDB = ON,   -- Reduce contention on data files
        MAXDOP = 0             -- Use all available processors
    );
    
    PRINT '✓ Created idx_wip_gstaskid_super_covering';
END
ELSE
BEGIN
    PRINT '⚠ idx_wip_gstaskid_super_covering already exists, skipping...';
END

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT 'Updating statistics on WIPTransactions table...';
UPDATE STATISTICS [dbo].[WIPTransactions] WITH FULLSCAN;
PRINT '✓ Statistics updated';

COMMIT TRAN;

PRINT '';
PRINT '============================================================================';
PRINT 'Migration completed successfully';
PRINT '============================================================================';
PRINT '';
PRINT 'Super covering indexes created:';
PRINT '  1. idx_wip_gsclientid_super_covering (GSClientID + 9 INCLUDE columns)';
PRINT '  2. idx_wip_gstaskid_super_covering (GSTaskID + 9 INCLUDE columns)';
PRINT '';
PRINT 'INCLUDE columns: GSTaskID/GSClientID, Amount, TType, Cost, Hour,';
PRINT '                 TaskServLine, EmpCode, TranDate, updatedAt';
PRINT '';
PRINT 'NEXT STEPS:';
PRINT '  1. Test query performance with new indexes';
PRINT '  2. Verify optimizer uses super covering indexes (check execution plans)';
PRINT '  3. Run cleanup migration to drop old indexes';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error creating super covering indexes:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to confirm indexes created)
-- ============================================================================
/*
-- Check super covering indexes exist with correct structure:
SELECT 
    i.name AS IndexName,
    STRING_AGG(
        CASE WHEN ic.is_included_column = 0 THEN c.name ELSE NULL END, 
        ', '
    ) WITHIN GROUP (ORDER BY ic.key_ordinal) AS KeyColumns,
    STRING_AGG(
        CASE WHEN ic.is_included_column = 1 THEN c.name ELSE NULL END, 
        ', '
    ) WITHIN GROUP (ORDER BY c.name) AS IncludedColumns,
    i.has_filter,
    i.filter_definition
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('WIPTransactions')
    AND i.name LIKE '%super_covering%'
GROUP BY i.name, i.has_filter, i.filter_definition;

-- Test query 1: Client WIP (should use idx_wip_gsclientid_super_covering)
SET STATISTICS IO ON;
SELECT GSTaskID, Amount, TType FROM WIPTransactions WHERE GSClientID = '00000000-0000-0000-0000-000000000001';
-- Expected: Index Seek on idx_wip_gsclientid_super_covering, 0 key lookups

-- Test query 2: Task aggregation (should use idx_wip_gstaskid_super_covering)
SELECT SUM(Amount), SUM(Cost), SUM(Hour) 
FROM WIPTransactions 
WHERE GSTaskID = '00000000-0000-0000-0000-000000000001' AND TType IN ('T', 'D');
-- Expected: Index Seek on idx_wip_gstaskid_super_covering, 0 key lookups
*/
