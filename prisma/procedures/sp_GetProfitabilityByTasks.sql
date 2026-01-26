-- ============================================================================
-- Stored Procedure: sp_GetProfitabilityByTasks
-- ============================================================================
-- Purpose: Calculate profitability metrics for multiple tasks with date filtering
-- 
-- Parameters:
--   @TaskIds    NVARCHAR(MAX) - JSON array of task GUIDs
--   @StartDate  DATE          - Start of date range
--   @EndDate    DATE          - End of date range
--
-- Returns: Aggregated profitability metrics per task
--
-- Performance: Designed to use simple indexes (no INCLUDE columns needed)
--              Pre-compiled plan cached after first execution
--
-- Used by: /api/my-reports/profitability
-- ============================================================================

CREATE OR ALTER PROCEDURE sp_GetProfitabilityByTasks
  @TaskIds NVARCHAR(MAX),
  @StartDate DATE,
  @EndDate DATE
AS
BEGIN
  SET NOCOUNT ON;
  SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED; -- Performance optimization for reporting
  
  -- Parse JSON array into table variable
  DECLARE @TaskTable TABLE (GSTaskID UNIQUEIDENTIFIER);
  INSERT INTO @TaskTable
  SELECT CAST(value AS UNIQUEIDENTIFIER) 
  FROM OPENJSON(@TaskIds);
  
  -- Single-pass aggregation with all profitability metrics
  SELECT 
    w.GSTaskID,
    
    -- Time metrics
    SUM(CASE WHEN w.TType = 'T' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdTime,
    SUM(CASE WHEN w.TType = 'T' THEN ISNULL(w.Hour, 0) ELSE 0 END) as ltdHours,
    
    -- Revenue components
    SUM(CASE WHEN w.TType = 'D' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdDisb,
    SUM(CASE WHEN w.TType = 'ADJ' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdAdj,
    SUM(CASE WHEN w.TType = 'F' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdFee,
    SUM(CASE WHEN w.TType = 'P' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdProvision,
    
    -- Cost metrics (exclude Provision from cost calculation)
    SUM(CASE WHEN w.TType != 'P' THEN ISNULL(w.Cost, 0) ELSE 0 END) as ltdCost
    
  FROM WIPTransactions w
  INNER JOIN @TaskTable t ON w.GSTaskID = t.GSTaskID
  WHERE w.TranDate >= @StartDate AND w.TranDate <= @EndDate
  GROUP BY w.GSTaskID
  OPTION (RECOMPILE); -- Generate fresh plan for variable parameter values
END
GO
