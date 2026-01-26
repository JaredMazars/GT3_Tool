-- Add indexes for profitability report performance optimization
-- These indexes support the My Reports profitability report queries

-- Task indexes for Partner/Manager lookups (without Active filter)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_task_partner' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_task_partner] ON [dbo].[Task]([TaskPartner] ASC) WHERE [TaskPartner] IS NOT NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_task_manager' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_task_manager] ON [dbo].[Task]([TaskManager] ASC) WHERE [TaskManager] IS NOT NULL;
END;

-- Task index for Client relationship
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_task_gsclientid' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_task_gsclientid] ON [dbo].[Task]([GSClientID] ASC);
END;

-- WIPTransactions index for task-level aggregation
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gstaskid' AND object_id = OBJECT_ID('[dbo].[WIPTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_wip_gstaskid] ON [dbo].[WIPTransactions]([GSTaskID] ASC);
END;

-- WIPTransactions index for transaction type filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_ttype' AND object_id = OBJECT_ID('[dbo].[WIPTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_wip_ttype] ON [dbo].[WIPTransactions]([TType] ASC);
END;

-- ServiceLineExternal index for service line lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_servline_code' AND object_id = OBJECT_ID('[dbo].[ServiceLineExternal]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_servline_code] ON [dbo].[ServiceLineExternal]([ServLineCode] ASC);
END;

-- ServiceLineMaster index for master service line lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_master_sl_code' AND object_id = OBJECT_ID('[dbo].[ServiceLineMaster]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_master_sl_code] ON [dbo].[ServiceLineMaster]([code] ASC);
END;

