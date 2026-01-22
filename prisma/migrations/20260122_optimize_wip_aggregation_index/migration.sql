-- ============================================================================
-- WIP Aggregation Covering Index
-- ============================================================================
-- Optimizes My Reports profitability and tasks-by-group queries
-- Covers all columns needed for WIP aggregation without table lookups
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

-- Create covering index for WIP aggregation queries
IF NOT EXISTS (
  SELECT * FROM sys.indexes 
  WHERE name = 'idx_WIPTransactions_Aggregation_COVERING' 
  AND object_id = OBJECT_ID('dbo.WIPTransactions')
)
BEGIN
  PRINT 'Creating covering index for WIP aggregation...';
  
  CREATE NONCLUSTERED INDEX [idx_WIPTransactions_Aggregation_COVERING] 
    ON [dbo].[WIPTransactions]([GSTaskID] ASC, [TType] ASC)
    INCLUDE ([Amount], [Cost], [Hour])
    WITH (
      ONLINE = ON,
      SORT_IN_TEMPDB = ON,
      MAXDOP = 0  -- Use all available processors
    );
  
  PRINT '✓ Index created successfully';
END
ELSE
BEGIN
  PRINT '⚠ Index already exists, skipping...';
END

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;

PRINT '❌ Error creating index:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- Index Details
-- ============================================================================
-- Key Columns:
--   GSTaskID - WHERE clause filter
--   TType    - CASE WHEN filters (T, ADJ, D, F, P)
--
-- INCLUDE Columns:
--   Amount   - Used in all reports (netWip calculation)
--   Cost     - Used in profitability report (ltdCost)
--   Hour     - Used in profitability report (ltdHours)
--
-- Query Optimization:
--   - Profitability: Satisfies query entirely from index
--   - Tasks-by-group: Satisfies query entirely from index
--   - Other WIP queries: Benefits from efficient GSTaskID seeks
--
-- Expected Performance:
--   - 40-60% faster query execution
--   - 99% reduction in table page reads
--   - Index-only scans (no table lookups)
-- ============================================================================
