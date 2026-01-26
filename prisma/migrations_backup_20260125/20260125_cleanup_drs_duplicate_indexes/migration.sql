-- ============================================================================
-- Migration: Cleanup Duplicate and Superseded DrsTransactions Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Drop redundant indexes after super covering indexes are verified
--
-- CRITICAL: Only run this AFTER verifying super covering indexes work correctly
--          - Test query performance
--          - Check execution plans show Index Seek, 0 key lookups
--          - Confirm super covering indexes are being used by optimizer
--
-- Benefits:
--   - Reduces total indexes from 8 to 6-7
--   - Faster INSERT/UPDATE operations (fewer indexes to maintain)
--   - Reduced storage overhead (~50-100 MB savings)
--   - Simpler index maintenance
--
-- Indexes to Drop:
--   1. idx_drs_gsclientid_trandate_entrytype - Superseded by super covering
--   2. idx_drs_biller_trandate - Superseded by super covering (with more columns)
--   3. Duplicate ServLineCode indexes (keep 1)
--   4. Duplicate TranDate indexes (keep 1)
--
-- IMPORTANT: Keep these indexes:
--   - idx_drs_gsclientid_super_covering (NEW - created in previous migration)
--   - idx_drs_biller_super_covering (NEW - created in previous migration)
--   - idx_drs_biller_yearmonth_covering (monthly aggregation optimization)
--   - Single column indexes: OfficeCode, PeriodKey, ServLineCode, TranDate
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

-- ============================================================================
-- STEP 1: Verify Super Covering Indexes Exist
-- ============================================================================

IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_drs_gsclientid_super_covering' 
    AND object_id = OBJECT_ID('dbo.DrsTransactions')
)
BEGIN
    PRINT '❌ ERROR: idx_drs_gsclientid_super_covering does not exist!';
    PRINT 'Run 20260125_add_super_covering_drs_indexes migration first.';
    THROW 50000, 'Super covering index not found', 1;
END

IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_drs_biller_super_covering' 
    AND object_id = OBJECT_ID('dbo.DrsTransactions')
)
BEGIN
    PRINT '❌ ERROR: idx_drs_biller_super_covering does not exist!';
    PRINT 'Run 20260125_add_super_covering_drs_indexes migration first.';
    THROW 50000, 'Super covering index not found', 1;
END

PRINT '✓ Super covering indexes verified';
PRINT '';

-- ============================================================================
-- STEP 2: Drop Superseded Composite Indexes
-- ============================================================================

-- Drop old GSClientID composite index (superseded by super covering)
IF EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_drs_gsclientid_trandate_entrytype' 
    AND object_id = OBJECT_ID('dbo.DrsTransactions')
)
BEGIN
    PRINT 'Dropping idx_drs_gsclientid_trandate_entrytype (superseded by super covering)...';
    DROP INDEX [idx_drs_gsclientid_trandate_entrytype] ON [dbo].[DrsTransactions];
    PRINT '✓ Dropped idx_drs_gsclientid_trandate_entrytype';
END
ELSE
BEGIN
    PRINT '⚠ idx_drs_gsclientid_trandate_entrytype does not exist, skipping...';
END

-- Drop old Biller composite index (superseded by super covering with more columns)
IF EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_drs_biller_trandate' 
    AND object_id = OBJECT_ID('dbo.DrsTransactions')
)
BEGIN
    PRINT 'Dropping idx_drs_biller_trandate (superseded by super covering)...';
    DROP INDEX [idx_drs_biller_trandate] ON [dbo].[DrsTransactions];
    PRINT '✓ Dropped idx_drs_biller_trandate';
END
ELSE
BEGIN
    PRINT '⚠ idx_drs_biller_trandate does not exist, skipping...';
END

-- ============================================================================
-- STEP 3: Identify and Drop Duplicate Indexes
-- ============================================================================

PRINT '';
PRINT 'Checking for duplicate indexes...';

-- Find duplicate ServLineCode indexes
DECLARE @ServLineIndexes TABLE (name NVARCHAR(128));
INSERT INTO @ServLineIndexes
SELECT i.name
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('DrsTransactions')
    AND i.type_desc = 'NONCLUSTERED'
    AND i.is_unique = 0
    AND c.name = 'ServLineCode'
    AND NOT EXISTS (
        SELECT 1 FROM sys.index_columns ic2
        INNER JOIN sys.columns c2 ON ic2.object_id = c2.object_id AND ic2.column_id = c2.column_id
        WHERE ic2.object_id = i.object_id 
            AND ic2.index_id = i.index_id
            AND ic2.key_ordinal > 0
            AND c2.name != 'ServLineCode'
    );

-- Keep the first ServLineCode index, drop others
DECLARE @ServLineIndexCount INT = (SELECT COUNT(*) FROM @ServLineIndexes);
IF @ServLineIndexCount > 1
BEGIN
    PRINT CONCAT('Found ', @ServLineIndexCount, ' ServLineCode indexes, keeping 1...');
    
    DECLARE @ServLineIndexName NVARCHAR(128);
    DECLARE @KeepFirst BIT = 1;
    
    DECLARE ServLineCursor CURSOR FOR SELECT name FROM @ServLineIndexes;
    OPEN ServLineCursor;
    FETCH NEXT FROM ServLineCursor INTO @ServLineIndexName;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @KeepFirst = 1
        BEGIN
            PRINT CONCAT('  Keeping: ', @ServLineIndexName);
            SET @KeepFirst = 0;
        END
        ELSE
        BEGIN
            PRINT CONCAT('  Dropping duplicate: ', @ServLineIndexName);
            DECLARE @DropServLineSQL NVARCHAR(MAX) = CONCAT('DROP INDEX [', @ServLineIndexName, '] ON [dbo].[DrsTransactions];');
            EXEC sp_executesql @DropServLineSQL;
        END
        FETCH NEXT FROM ServLineCursor INTO @ServLineIndexName;
    END
    
    CLOSE ServLineCursor;
    DEALLOCATE ServLineCursor;
END
ELSE
BEGIN
    PRINT '  No duplicate ServLineCode indexes found';
END

-- Find duplicate TranDate indexes
DECLARE @TranDateIndexes TABLE (name NVARCHAR(128));
INSERT INTO @TranDateIndexes
SELECT i.name
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('DrsTransactions')
    AND i.type_desc = 'NONCLUSTERED'
    AND i.is_unique = 0
    AND c.name = 'TranDate'
    AND NOT EXISTS (
        SELECT 1 FROM sys.index_columns ic2
        INNER JOIN sys.columns c2 ON ic2.object_id = c2.object_id AND ic2.column_id = c2.column_id
        WHERE ic2.object_id = i.object_id 
            AND ic2.index_id = i.index_id
            AND ic2.key_ordinal > 0
            AND c2.name != 'TranDate'
    );

-- Keep the first TranDate index, drop others
DECLARE @TranDateIndexCount INT = (SELECT COUNT(*) FROM @TranDateIndexes);
IF @TranDateIndexCount > 1
BEGIN
    PRINT CONCAT('Found ', @TranDateIndexCount, ' TranDate indexes, keeping 1...');
    
    DECLARE @TranDateIndexName NVARCHAR(128);
    SET @KeepFirst = 1;
    
    DECLARE TranDateCursor CURSOR FOR SELECT name FROM @TranDateIndexes;
    OPEN TranDateCursor;
    FETCH NEXT FROM TranDateCursor INTO @TranDateIndexName;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @KeepFirst = 1
        BEGIN
            PRINT CONCAT('  Keeping: ', @TranDateIndexName);
            SET @KeepFirst = 0;
        END
        ELSE
        BEGIN
            PRINT CONCAT('  Dropping duplicate: ', @TranDateIndexName);
            DECLARE @DropTranDateSQL NVARCHAR(MAX) = CONCAT('DROP INDEX [', @TranDateIndexName, '] ON [dbo].[DrsTransactions];');
            EXEC sp_executesql @DropTranDateSQL;
        END
        FETCH NEXT FROM TranDateCursor INTO @TranDateIndexName;
    END
    
    CLOSE TranDateCursor;
    DEALLOCATE TranDateCursor;
END
ELSE
BEGIN
    PRINT '  No duplicate TranDate indexes found';
END

-- ============================================================================
-- STEP 4: Update Statistics
-- ============================================================================

PRINT '';
PRINT 'Updating statistics on DrsTransactions table...';
UPDATE STATISTICS [dbo].[DrsTransactions] WITH FULLSCAN;
PRINT '✓ Statistics updated';

COMMIT TRAN;

PRINT '';
PRINT '============================================================================';
PRINT 'Cleanup completed successfully';
PRINT '============================================================================';
PRINT '';
PRINT 'Indexes dropped:';
PRINT '  - idx_drs_gsclientid_trandate_entrytype (superseded)';
PRINT '  - idx_drs_biller_trandate (superseded)';
PRINT '  - Duplicate ServLineCode/TranDate indexes (if found)';
PRINT '';
PRINT 'Remaining indexes (6-7 total):';
PRINT '  - idx_drs_gsclientid_super_covering (NEW - comprehensive)';
PRINT '  - idx_drs_biller_super_covering (NEW - comprehensive)';
PRINT '  - idx_drs_biller_yearmonth_covering (monthly aggregations)';
PRINT '  - OfficeCode, PeriodKey, ServLineCode, TranDate (single columns)';
PRINT '';
PRINT 'Expected storage savings: ~50-100 MB';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during cleanup:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH
