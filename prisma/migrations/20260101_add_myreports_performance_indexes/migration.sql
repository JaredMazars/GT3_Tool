-- Performance indexes for My Reports Overview API
-- Optimizes queries that filter by Biller+TranDate (DrsTransactions) 
-- and TaskPartner/TaskManager+TranDate (WIPTransactions)

-- DrsTransactions: Composite index for Biller + TranDate with INCLUDE for common columns
-- Used by: collectionsData, netBillingsData, debtorsBalances queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_drs_biller_trandate' AND object_id = OBJECT_ID('[dbo].[DrsTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_drs_biller_trandate]
    ON [dbo].[DrsTransactions]([Biller] ASC, [TranDate] ASC)
    INCLUDE ([Total], [EntryType]);
END;

-- WIPTransactions: Composite index for TaskPartner + TranDate
-- Used by: wipMonthlyData, wipBalances queries for partner reports
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_taskpartner_trandate' AND object_id = OBJECT_ID('[dbo].[WIPTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_wip_taskpartner_trandate]
    ON [dbo].[WIPTransactions]([TaskPartner] ASC, [TranDate] ASC)
    INCLUDE ([TType], [Amount], [Cost]);
END;

-- WIPTransactions: Composite index for TaskManager + TranDate
-- Used by: wipMonthlyData, wipBalances queries for manager reports
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_taskmanager_trandate' AND object_id = OBJECT_ID('[dbo].[WIPTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_wip_taskmanager_trandate]
    ON [dbo].[WIPTransactions]([TaskManager] ASC, [TranDate] ASC)
    INCLUDE ([TType], [Amount], [Cost]);
END;


