-- Add composite indexes for analytics performance optimization
-- These indexes significantly improve query performance for client analytics pages

-- WIPTransactions indexes for graph data queries
-- Composite index for filtering by client and date range with transaction type
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gsclientid_trandate_ttype' AND object_id = OBJECT_ID('[dbo].[WIPTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_trandate_ttype] ON [dbo].[WIPTransactions]([GSClientID] ASC, [TranDate] ASC, [TType] ASC);
END;

-- Composite index for filtering by task and date range with transaction type
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gstaskid_trandate_ttype' AND object_id = OBJECT_ID('[dbo].[WIPTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_trandate_ttype] ON [dbo].[WIPTransactions]([GSTaskID] ASC, [TranDate] ASC, [TType] ASC);
END;

-- DRSTransactions indexes for debtor/recoverability queries
-- Composite index for filtering by client and date range with entry type
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_drs_gsclientid_trandate_entrytype' AND object_id = OBJECT_ID('[dbo].[DrsTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_drs_gsclientid_trandate_entrytype] ON [dbo].[DrsTransactions]([GSClientID] ASC, [TranDate] ASC, [EntryType] ASC);
END;

