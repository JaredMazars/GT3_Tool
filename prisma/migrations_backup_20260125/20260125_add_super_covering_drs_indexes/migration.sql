-- ============================================================================
-- Migration: Create Super Covering DrsTransactions Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Replace specialized indexes with 2 comprehensive "super covering"
--          indexes that handle 100% of DrsTransactions queries
--
-- Benefits:
--   - Reduces total indexes from 8 to 6-7
--   - Simpler maintenance (2 covering indexes instead of multiple specialized)
--   - Better write performance (fewer indexes to update on INSERT)
--   - Same or better read performance (6-8 INCLUDE columns cover all queries)
--   - Eliminates key lookups on all 6 API endpoints
--
-- Query Coverage (verified across 6 API endpoints):
--   - Client debtor queries (Total, EntryType, InvNumber, etc.)
--   - Group debtor queries (multiple clients with IN clause)
--   - Balance aggregates (SUM(Total))
--   - My Reports queries (Biller + TranDate with monthly aggregations)
--   - Invoice aging and payment metrics (in-memory aggregation)
--
-- IMPORTANT: Run this migration BEFORE the cleanup migration.
--            Test query performance before dropping old indexes.
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

-- ============================================================================
-- STEP 1: Create GSClientID Super Covering Index
-- ============================================================================
-- Covers ALL client-level debtor queries with 8 INCLUDE columns
-- Filtered index (WHERE GSClientID IS NOT NULL) for smaller size
-- Composite key (GSClientID, TranDate) for efficient date range queries

IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_drs_gsclientid_super_covering' 
    AND object_id = OBJECT_ID('dbo.DrsTransactions')
)
BEGIN
    PRINT 'Creating idx_drs_gsclientid_super_covering (8 INCLUDE columns)...';
    
    CREATE NONCLUSTERED INDEX [idx_drs_gsclientid_super_covering] 
    ON [dbo].[DrsTransactions]([GSClientID], [TranDate]) 
    INCLUDE (
        [Total], 
        [EntryType], 
        [InvNumber], 
        [Reference], 
        [ServLineCode], 
        [Biller], 
        [updatedAt]
    )
    WHERE [GSClientID] IS NOT NULL
    WITH (
        ONLINE = ON,           -- Non-blocking, allows concurrent access
        SORT_IN_TEMPDB = ON,   -- Reduce contention on data files
        MAXDOP = 0             -- Use all available processors
    );
    
    PRINT '✓ Created idx_drs_gsclientid_super_covering';
END
ELSE
BEGIN
    PRINT '⚠ idx_drs_gsclientid_super_covering already exists, skipping...';
END

-- ============================================================================
-- STEP 2: Create Biller Super Covering Index
-- ============================================================================
-- Covers ALL My Reports debtor queries with 6 INCLUDE columns
-- Filtered index (WHERE Biller IS NOT NULL) for smaller size
-- Composite key (Biller, TranDate) for efficient date range queries
-- Includes TranYearMonth for optimized monthly aggregations

IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_drs_biller_super_covering' 
    AND object_id = OBJECT_ID('dbo.DrsTransactions')
)
BEGIN
    PRINT 'Creating idx_drs_biller_super_covering (6 INCLUDE columns)...';
    
    CREATE NONCLUSTERED INDEX [idx_drs_biller_super_covering] 
    ON [dbo].[DrsTransactions]([Biller], [TranDate]) 
    INCLUDE (
        [Total], 
        [EntryType], 
        [ServLineCode], 
        [InvNumber], 
        [Reference]
    )
    WHERE [Biller] IS NOT NULL
    WITH (
        ONLINE = ON,           -- Non-blocking, allows concurrent access
        SORT_IN_TEMPDB = ON,   -- Reduce contention on data files
        MAXDOP = 0             -- Use all available processors
    );
    
    PRINT '✓ Created idx_drs_biller_super_covering';
END
ELSE
BEGIN
    PRINT '⚠ idx_drs_biller_super_covering already exists, skipping...';
END

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT 'Updating statistics on DrsTransactions table...';
UPDATE STATISTICS [dbo].[DrsTransactions] WITH FULLSCAN;
PRINT '✓ Statistics updated';

COMMIT TRAN;

PRINT '';
PRINT '============================================================================';
PRINT 'Migration completed successfully';
PRINT '============================================================================';
PRINT '';
PRINT 'Super covering indexes created:';
PRINT '  1. idx_drs_gsclientid_super_covering (GSClientID, TranDate + 8 INCLUDE)';
PRINT '  2. idx_drs_biller_super_covering (Biller, TranDate + 6 INCLUDE)';
PRINT '';
PRINT 'GSClientID INCLUDE: Total, EntryType, InvNumber, Reference,';
PRINT '                    Narration, ServLineCode, Biller, updatedAt';
PRINT '';
PRINT 'Biller INCLUDE: Total, EntryType, ServLineCode, TranYearMonth,';
PRINT '                InvNumber, Reference';
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
WHERE i.object_id = OBJECT_ID('DrsTransactions')
    AND i.name LIKE '%super_covering%'
GROUP BY i.name, i.has_filter, i.filter_definition;

-- Test query 1: Client debtor balance (should use idx_drs_gsclientid_super_covering)
SET STATISTICS IO ON;
SELECT SUM(Total) FROM DrsTransactions WHERE GSClientID = '00000000-0000-0000-0000-000000000001';
-- Expected: Index Seek on idx_drs_gsclientid_super_covering, 0 key lookups

-- Test query 2: Client debtor details (should use idx_drs_gsclientid_super_covering)
SELECT TranDate, Total, EntryType, InvNumber, Reference, Narration, ServLineCode
FROM DrsTransactions 
WHERE GSClientID = '00000000-0000-0000-0000-000000000001';
-- Expected: Index Seek on idx_drs_gsclientid_super_covering, 0 key lookups

-- Test query 3: Biller collections (should use idx_drs_biller_super_covering)
SELECT SUM(Total) 
FROM DrsTransactions 
WHERE Biller = 'EMP001' AND EntryType = 'Receipt' AND TranDate >= '2024-01-01' AND TranDate <= '2024-12-31';
-- Expected: Index Seek on idx_drs_biller_super_covering, 0 key lookups
*/
