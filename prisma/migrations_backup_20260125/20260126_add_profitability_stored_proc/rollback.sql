-- ============================================================================
-- Rollback: Drop profitability stored procedure
-- ============================================================================
-- Date: 2026-01-26
-- Purpose: Remove stored procedure if migration needs to be reversed
-- ============================================================================

IF OBJECT_ID('dbo.sp_GetProfitabilityByTasks', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE dbo.sp_GetProfitabilityByTasks;
    PRINT '✓ Dropped sp_GetProfitabilityByTasks';
END
ELSE
BEGIN
    PRINT '⚠ sp_GetProfitabilityByTasks does not exist';
END
