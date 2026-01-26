-- Migration: Index Cleanup and WIPTransactions Super Covering Indexes
-- Date: 2026-01-25
-- Purpose: Remove redundant indexes and add missing super covering indexes

-- ============================================================================
-- PART 1: DROP REDUNDANT INDEXES
-- ============================================================================

-- DrsTransactions: Drop 4 redundant indexes
-- idx_drs_biller_trandate is superseded by idx_drs_biller_super_covering (same key columns)
DROP INDEX IF EXISTS [idx_drs_biller_trandate] ON [dbo].[DrsTransactions];

-- idx_drs_gsclientid_trandate_entrytype is superseded by idx_drs_gsclientid_super_covering
DROP INDEX IF EXISTS [idx_drs_gsclientid_trandate_entrytype] ON [dbo].[DrsTransactions];

-- idx_drs_servlinecode duplicates DrsTransactions_ServLineCode_idx
DROP INDEX IF EXISTS [idx_drs_servlinecode] ON [dbo].[DrsTransactions];

-- idx_drs_trandate duplicates DrsTransactions_TranDate_idx
DROP INDEX IF EXISTS [idx_drs_trandate] ON [dbo].[DrsTransactions];

-- Task: Drop 2 redundant indexes
-- idx_task_gsclientid duplicates Task_GSClientID_idx
DROP INDEX IF EXISTS [idx_task_gsclientid] ON [dbo].[Task];

-- idx_task_servlinecode_active duplicates Task_ServLineCode_Active_idx
DROP INDEX IF EXISTS [idx_task_servlinecode_active] ON [dbo].[Task];

-- ============================================================================
-- PART 2: CREATE WIPTRANSACTIONS SUPER COVERING INDEXES
-- ============================================================================

-- Super covering index for GSClientID queries
-- Covers: client details page, client WIP summary, balance calculations
CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_super_covering]
ON [dbo].[WIPTransactions]([GSClientID], [TranDate])
INCLUDE (
    [TType],
    [TranType],
    [Amount],
    [Cost],
    [Hour],
    [MainServLineCode],
    [TaskPartner],
    [TaskManager],
    [updatedAt]
)
WHERE [GSClientID] IS NOT NULL;

-- Super covering index for GSTaskID queries
-- Covers: task details page, task WIP summary, profitability calculations
CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_super_covering]
ON [dbo].[WIPTransactions]([GSTaskID], [TranDate])
INCLUDE (
    [TType],
    [TranType],
    [Amount],
    [Cost],
    [Hour],
    [MainServLineCode],
    [TaskPartner],
    [TaskManager],
    [updatedAt]
)
WHERE [GSTaskID] IS NOT NULL;
