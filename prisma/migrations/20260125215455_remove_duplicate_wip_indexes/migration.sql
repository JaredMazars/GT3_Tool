-- ============================================================================
-- Migration: Remove Duplicate WIPTransactions Indexes
-- Date: 2026-01-25
-- ============================================================================
-- Purpose: Remove composite indexes that are redundant with super covering indexes
--
-- Context:
-- - Super covering indexes use INCLUDE columns and are more efficient
-- - Composite indexes have TType in KEY, which might help GROUP BY queries
-- - Analysis showed both index sets serve similar query patterns
-- - Super covering indexes eliminate key lookups entirely
--
-- Indexes Being Removed:
-- 1. WIPTransactions_GSClientID_TranDate_TType_idx
--    - Key columns: (GSClientID, TranDate, TType)
--    - Redundant with: idx_wip_gsclientid_super_covering
--
-- 2. WIPTransactions_GSTaskID_TranDate_TType_idx
--    - Key columns: (GSTaskID, TranDate, TType)
--    - Redundant with: idx_wip_gstaskid_super_covering
--
-- Indexes Being Kept:
-- - idx_wip_gsclientid_super_covering: (GSClientID, TranDate) INCLUDE (9 columns) WHERE GSClientID IS NOT NULL
-- - idx_wip_gstaskid_super_covering: (GSTaskID, TranDate) INCLUDE (9 columns)
--
-- Performance Impact:
-- - Positive: Faster writes (fewer indexes to maintain)
-- - Positive: Less disk space (~100-200 MB saved)
-- - Neutral: Queries will use super covering indexes (equally or more efficient)
-- - Risk: GROUP BY TType queries might be slightly slower if optimizer preferred TType in KEY
--
-- Rollback: See rollback.sql in this folder
-- Monitoring: Run verify_indexes.sql to check index usage after deployment
-- ============================================================================

-- Drop indexes if they exist
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('WIPTransactions') AND name = 'WIPTransactions_GSClientID_TranDate_TType_idx')
    DROP INDEX [WIPTransactions_GSClientID_TranDate_TType_idx] ON [dbo].[WIPTransactions];

IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('WIPTransactions') AND name = 'WIPTransactions_GSTaskID_TranDate_TType_idx')
    DROP INDEX [WIPTransactions_GSTaskID_TranDate_TType_idx] ON [dbo].[WIPTransactions];
