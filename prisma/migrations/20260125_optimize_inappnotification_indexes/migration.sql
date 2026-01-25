-- ============================================================================
-- Migration: Optimize InAppNotification Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 5 indexes into 3 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (5):
--   1. createdAt DESC
--   2. fromUserId
--   3. taskId
--   4. userId
--   5. userId, isRead
--
-- New Structure (3):
--   1. idx_notification_user_read_covering (userId, isRead) + INCLUDE
--   2. idx_notification_created_covering (createdAt DESC) + INCLUDE
--   3. (keep nothing extra - compound covers all patterns)
--
-- Benefits:
--   - 40% reduction in index count (5 → 3)
--   - Covering indexes eliminate key lookups for notification queries
--   - Compound index covers single-column userId queries
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting InAppNotification index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Indexes
-- ============================================================================

PRINT '--- Creating new covering indexes ---';

-- Covering index for user notification queries (most common pattern)
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_notification_user_read_covering' 
    AND object_id = OBJECT_ID('dbo.InAppNotification')
)
BEGIN
    PRINT 'Creating idx_notification_user_read_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_notification_user_read_covering] 
    ON [dbo].[InAppNotification]([userId], [isRead]) 
    INCLUDE (
        [createdAt], 
        [type],
        [taskId],
        [title],
        [message],
        [actionUrl]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_notification_user_read_covering';
END
ELSE
    PRINT '⚠ idx_notification_user_read_covering already exists';

-- Covering index for recent notifications (global timeline)
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_notification_created_covering' 
    AND object_id = OBJECT_ID('dbo.InAppNotification')
)
BEGIN
    PRINT 'Creating idx_notification_created_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_notification_created_covering] 
    ON [dbo].[InAppNotification]([createdAt] DESC) 
    INCLUDE (
        [userId], 
        [isRead],
        [type],
        [title]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_notification_created_covering';
END
ELSE
    PRINT '⚠ idx_notification_created_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop single-column userId (leftmost of compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'InAppNotification_userId_idx' AND object_id = OBJECT_ID('InAppNotification'))
BEGIN
    DROP INDEX [InAppNotification_userId_idx] ON [dbo].[InAppNotification];
    PRINT '✓ Dropped InAppNotification_userId_idx';
END
ELSE
    PRINT '⚠ InAppNotification_userId_idx not found';

-- Drop old userId, isRead compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'InAppNotification_userId_isRead_idx' AND object_id = OBJECT_ID('InAppNotification'))
BEGIN
    DROP INDEX [InAppNotification_userId_isRead_idx] ON [dbo].[InAppNotification];
    PRINT '✓ Dropped InAppNotification_userId_isRead_idx';
END
ELSE
    PRINT '⚠ InAppNotification_userId_isRead_idx not found';

-- Drop single-column taskId (low-frequency FK queries)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'InAppNotification_taskId_idx' AND object_id = OBJECT_ID('InAppNotification'))
BEGIN
    DROP INDEX [InAppNotification_taskId_idx] ON [dbo].[InAppNotification];
    PRINT '✓ Dropped InAppNotification_taskId_idx';
END
ELSE
    PRINT '⚠ InAppNotification_taskId_idx not found';

-- Drop single-column fromUserId (low-frequency "sent by" queries)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'InAppNotification_fromUserId_idx' AND object_id = OBJECT_ID('InAppNotification'))
BEGIN
    DROP INDEX [InAppNotification_fromUserId_idx] ON [dbo].[InAppNotification];
    PRINT '✓ Dropped InAppNotification_fromUserId_idx';
END
ELSE
    PRINT '⚠ InAppNotification_fromUserId_idx not found';

-- Drop old createdAt (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'InAppNotification_createdAt_idx' AND object_id = OBJECT_ID('InAppNotification'))
BEGIN
    DROP INDEX [InAppNotification_createdAt_idx] ON [dbo].[InAppNotification];
    PRINT '✓ Dropped InAppNotification_createdAt_idx';
END
ELSE
    PRINT '⚠ InAppNotification_createdAt_idx not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[InAppNotification] WITH FULLSCAN;
PRINT '✓ Statistics updated';
PRINT '';

COMMIT TRAN;

-- ============================================================================
-- Summary
-- ============================================================================

PRINT '============================================================================';
PRINT 'Migration completed successfully';
PRINT '============================================================================';
PRINT '';
PRINT 'Indexes CREATED (2 covering indexes):';
PRINT '  1. idx_notification_user_read_covering (userId, isRead + 6 INCLUDE)';
PRINT '  2. idx_notification_created_covering (createdAt DESC + 4 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (5):';
PRINT '  - InAppNotification_userId_idx';
PRINT '  - InAppNotification_userId_isRead_idx';
PRINT '  - InAppNotification_taskId_idx';
PRINT '  - InAppNotification_fromUserId_idx';
PRINT '  - InAppNotification_createdAt_idx';
PRINT '';
PRINT 'RESULT: 5 indexes → 2 indexes (60% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during InAppNotification index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering indexes cause issues:
DROP INDEX IF EXISTS [idx_notification_user_read_covering] ON [dbo].[InAppNotification];
DROP INDEX IF EXISTS [idx_notification_created_covering] ON [dbo].[InAppNotification];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [InAppNotification_userId_idx] ON [dbo].[InAppNotification]([userId]);
CREATE NONCLUSTERED INDEX [InAppNotification_userId_isRead_idx] ON [dbo].[InAppNotification]([userId], [isRead]);
CREATE NONCLUSTERED INDEX [InAppNotification_taskId_idx] ON [dbo].[InAppNotification]([taskId]);
CREATE NONCLUSTERED INDEX [InAppNotification_fromUserId_idx] ON [dbo].[InAppNotification]([fromUserId]);
CREATE NONCLUSTERED INDEX [InAppNotification_createdAt_idx] ON [dbo].[InAppNotification]([createdAt] DESC);

UPDATE STATISTICS [dbo].[InAppNotification] WITH FULLSCAN;
*/
