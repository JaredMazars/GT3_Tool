-- ============================================================================
-- Migration: Add Profitability Stored Procedure (POC)
-- ============================================================================
-- Date: 2026-01-26
-- Purpose: Create stored procedure for profitability report aggregations
--          to test stored procedure approach vs. covering indexes
--
-- Success Criteria:
--   - Query performance within 10% of covering index approach
--   - Results match exactly (validation test)
--   - Execution plan shows efficient table variable join
--
-- Indexes Used:
--   - idx_wip_gstaskid (simple index for join)
--   - WIPTransactions_TranDate_idx (for date filter)
--   
-- No longer needs:
--   - idx_wip_gstaskid_super_covering (9 INCLUDE columns)
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

-- Drop existing procedure if exists (for re-running migration)
IF OBJECT_ID('dbo.sp_GetProfitabilityByTasks', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE dbo.sp_GetProfitabilityByTasks;
    PRINT 'Dropped existing sp_GetProfitabilityByTasks';
END

-- Create stored procedure
EXEC('
CREATE PROCEDURE sp_GetProfitabilityByTasks
  @TaskIds NVARCHAR(MAX),
  @StartDate DATE,
  @EndDate DATE
AS
BEGIN
  SET NOCOUNT ON;
  SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
  
  DECLARE @TaskTable TABLE (GSTaskID UNIQUEIDENTIFIER);
  INSERT INTO @TaskTable
  SELECT CAST(value AS UNIQUEIDENTIFIER) 
  FROM OPENJSON(@TaskIds);
  
  SELECT 
    w.GSTaskID,
    SUM(CASE WHEN w.TType = ''T'' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdTime,
    SUM(CASE WHEN w.TType = ''T'' THEN ISNULL(w.Hour, 0) ELSE 0 END) as ltdHours,
    SUM(CASE WHEN w.TType = ''D'' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdDisb,
    SUM(CASE WHEN w.TType = ''ADJ'' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdAdj,
    SUM(CASE WHEN w.TType = ''F'' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdFee,
    SUM(CASE WHEN w.TType = ''P'' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdProvision,
    SUM(CASE WHEN w.TType != ''P'' THEN ISNULL(w.Cost, 0) ELSE 0 END) as ltdCost
  FROM WIPTransactions w
  INNER JOIN @TaskTable t ON w.GSTaskID = t.GSTaskID
  WHERE w.TranDate >= @StartDate AND w.TranDate <= @EndDate
  GROUP BY w.GSTaskID
  OPTION (RECOMPILE);
END
');

PRINT '✓ Created sp_GetProfitabilityByTasks';

COMMIT TRAN;

PRINT '';
PRINT '============================================================================';
PRINT 'Migration completed successfully';
PRINT '============================================================================';
PRINT '';
PRINT 'Stored procedure created: sp_GetProfitabilityByTasks';
PRINT '';
PRINT 'NEXT STEPS:';
PRINT '  1. Run benchmark script: scripts/benchmark_profitability_sp.sql';
PRINT '  2. Compare performance: stored proc vs. covering index';
PRINT '  3. Validate results match existing implementation';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error creating stored procedure:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH
