-- ============================================================================
-- Migration: Optimize ApprovalStep Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 4 indexes into 2 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (4):
--   1. approvalId
--   2. approvalId, stepOrder
--   3. assignedToUserId
--   4. status
--
-- New Structure (2):
--   1. idx_approvalstep_approval_order_status_covering (approvalId, stepOrder, status) + INCLUDE
--   2. ApprovalStep_assignedToUserId_idx (user lookups - keep)
--
-- Benefits:
--   - 50% reduction in index count (4 → 2)
--   - Covering index eliminates key lookups for common queries
--   - Better write performance on step status updates
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting ApprovalStep index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Index
-- ============================================================================

PRINT '--- Creating new covering index ---';

-- Super covering index for approval workflow queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_approvalstep_approval_order_status_covering' 
    AND object_id = OBJECT_ID('dbo.ApprovalStep')
)
BEGIN
    PRINT 'Creating idx_approvalstep_approval_order_status_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_approvalstep_approval_order_status_covering] 
    ON [dbo].[ApprovalStep]([approvalId], [stepOrder], [status]) 
    INCLUDE (
        [assignedToUserId], 
        [approvedAt], 
        [approvedById],
        [isDelegated],
        [stepType],
        [isRequired],
        [comment]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_approvalstep_approval_order_status_covering';
END
ELSE
    PRINT '⚠ idx_approvalstep_approval_order_status_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop single-column approvalId (covered by compound leftmost)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApprovalStep_approvalId_idx' AND object_id = OBJECT_ID('ApprovalStep'))
BEGIN
    DROP INDEX [ApprovalStep_approvalId_idx] ON [dbo].[ApprovalStep];
    PRINT '✓ Dropped ApprovalStep_approvalId_idx';
END
ELSE
    PRINT '⚠ ApprovalStep_approvalId_idx not found';

-- Drop approvalId, stepOrder compound (covered by new compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApprovalStep_approvalId_stepOrder_idx' AND object_id = OBJECT_ID('ApprovalStep'))
BEGIN
    DROP INDEX [ApprovalStep_approvalId_stepOrder_idx] ON [dbo].[ApprovalStep];
    PRINT '✓ Dropped ApprovalStep_approvalId_stepOrder_idx';
END
ELSE
    PRINT '⚠ ApprovalStep_approvalId_stepOrder_idx not found';

-- Drop single-column status (low selectivity without approvalId)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApprovalStep_status_idx' AND object_id = OBJECT_ID('ApprovalStep'))
BEGIN
    DROP INDEX [ApprovalStep_status_idx] ON [dbo].[ApprovalStep];
    PRINT '✓ Dropped ApprovalStep_status_idx';
END
ELSE
    PRINT '⚠ ApprovalStep_status_idx not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[ApprovalStep] WITH FULLSCAN;
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
PRINT 'Indexes CREATED (1 covering index):';
PRINT '  1. idx_approvalstep_approval_order_status_covering (approvalId, stepOrder, status + 7 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (3):';
PRINT '  - ApprovalStep_approvalId_idx';
PRINT '  - ApprovalStep_approvalId_stepOrder_idx';
PRINT '  - ApprovalStep_status_idx';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - ApprovalStep_assignedToUserId_idx (user pending approvals lookup)';
PRINT '';
PRINT 'RESULT: 4 indexes → 2 indexes (50% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during ApprovalStep index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering index causes issues:
DROP INDEX IF EXISTS [idx_approvalstep_approval_order_status_covering] ON [dbo].[ApprovalStep];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [ApprovalStep_approvalId_idx] ON [dbo].[ApprovalStep]([approvalId]);
CREATE NONCLUSTERED INDEX [ApprovalStep_approvalId_stepOrder_idx] ON [dbo].[ApprovalStep]([approvalId], [stepOrder]);
CREATE NONCLUSTERED INDEX [ApprovalStep_status_idx] ON [dbo].[ApprovalStep]([status]);

UPDATE STATISTICS [dbo].[ApprovalStep] WITH FULLSCAN;
*/
