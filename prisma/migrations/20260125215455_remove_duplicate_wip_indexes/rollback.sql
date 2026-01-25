-- ============================================================================
-- ROLLBACK: Restore Removed WIPTransactions Indexes
-- Date: 2026-01-25
-- ============================================================================
-- Purpose: Recreate the composite indexes if needed
--
-- Use this script if:
-- - Query performance degrades after migration
-- - GROUP BY TType queries become significantly slower
-- - SQL Server query optimizer shows missing index warnings
-- - Application monitoring shows increased response times
--
-- NOTE: These indexes are safe to restore - they do not conflict with
--       super covering indexes. SQL Server will use the most appropriate
--       index for each query.
-- ============================================================================

PRINT '============================================================================';
PRINT 'ROLLBACK: Restoring WIPTransactions Composite Indexes';
PRINT '============================================================================';
PRINT '';

-- Recreate WIPTransactions_GSClientID_TranDate_TType_idx
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('WIPTransactions') AND name = 'WIPTransactions_GSClientID_TranDate_TType_idx')
BEGIN
    PRINT 'Creating index: WIPTransactions_GSClientID_TranDate_TType_idx';
    
    CREATE NONCLUSTERED INDEX [WIPTransactions_GSClientID_TranDate_TType_idx]
    ON [dbo].[WIPTransactions]([GSClientID], [TranDate], [TType]);
    
    PRINT 'Successfully created: WIPTransactions_GSClientID_TranDate_TType_idx';
END
ELSE
BEGIN
    PRINT 'Index already exists: WIPTransactions_GSClientID_TranDate_TType_idx';
END
GO

-- Recreate WIPTransactions_GSTaskID_TranDate_TType_idx
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('WIPTransactions') AND name = 'WIPTransactions_GSTaskID_TranDate_TType_idx')
BEGIN
    PRINT 'Creating index: WIPTransactions_GSTaskID_TranDate_TType_idx';
    
    CREATE NONCLUSTERED INDEX [WIPTransactions_GSTaskID_TranDate_TType_idx]
    ON [dbo].[WIPTransactions]([GSTaskID], [TranDate], [TType]);
    
    PRINT 'Successfully created: WIPTransactions_GSTaskID_TranDate_TType_idx';
END
ELSE
BEGIN
    PRINT 'Index already exists: WIPTransactions_GSTaskID_TranDate_TType_idx';
END
GO

-- Update statistics after index creation
PRINT '';
PRINT 'Updating statistics...';
UPDATE STATISTICS [WIPTransactions] WITH FULLSCAN;
PRINT 'Statistics updated.';
GO

-- Verification
PRINT '';
PRINT '============================================================================';
PRINT 'Rollback Complete - Verification';
PRINT '============================================================================';

SELECT 
    name AS IndexName,
    type_desc AS IndexType,
    is_unique AS IsUnique,
    (
        SELECT SUM(ps.used_page_count) * 8 / 1024
        FROM sys.dm_db_partition_stats ps
        WHERE ps.object_id = i.object_id AND ps.index_id = i.index_id
    ) AS SizeMB
FROM sys.indexes i
WHERE object_id = OBJECT_ID('WIPTransactions')
AND (name LIKE '%GSClientID%' OR name LIKE '%GSTaskID%')
ORDER BY name;

PRINT '';
PRINT 'Expected: Both super covering AND composite indexes should exist';
PRINT '============================================================================';
GO
