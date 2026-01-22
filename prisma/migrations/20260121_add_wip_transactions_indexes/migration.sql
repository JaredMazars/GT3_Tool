BEGIN TRY

BEGIN TRAN;

-- DropIndex: Remove duplicate idx_wiptransactions_gstaskid_ttype
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wiptransactions_gstaskid_ttype' AND object_id = OBJECT_ID('dbo.WIPTransactions'))
BEGIN
    DROP INDEX [idx_wiptransactions_gstaskid_ttype] ON [dbo].[WIPTransactions];
END

-- DropIndex: Remove duplicate WIPTransactions_GSTaskID_TranDate_idx
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'WIPTransactions_GSTaskID_TranDate_idx' AND object_id = OBJECT_ID('dbo.WIPTransactions'))
BEGIN
    DROP INDEX [WIPTransactions_GSTaskID_TranDate_idx] ON [dbo].[WIPTransactions];
END

-- RenameIndex: idx_wip_gsclientid_trandate_ttype -> WIPTransactions_GSClientID_TranDate_TType_idx
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gsclientid_trandate_ttype' AND object_id = OBJECT_ID('dbo.WIPTransactions'))
BEGIN
    EXEC SP_RENAME N'dbo.WIPTransactions.idx_wip_gsclientid_trandate_ttype', N'WIPTransactions_GSClientID_TranDate_TType_idx', N'INDEX';
END

-- RenameIndex: idx_wip_gstaskid_trandate_ttype -> WIPTransactions_GSTaskID_TranDate_TType_idx
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gstaskid_trandate_ttype' AND object_id = OBJECT_ID('dbo.WIPTransactions'))
BEGIN
    EXEC SP_RENAME N'dbo.WIPTransactions.idx_wip_gstaskid_trandate_ttype', N'WIPTransactions_GSTaskID_TranDate_TType_idx', N'INDEX';
END

-- RenameIndex: idx_wip_taskmanager_trandate -> WIPTransactions_TaskManager_TranDate_idx
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_taskmanager_trandate' AND object_id = OBJECT_ID('dbo.WIPTransactions'))
BEGIN
    EXEC SP_RENAME N'dbo.WIPTransactions.idx_wip_taskmanager_trandate', N'WIPTransactions_TaskManager_TranDate_idx', N'INDEX';
END

-- RenameIndex: idx_wip_taskpartner_trandate -> WIPTransactions_TaskPartner_TranDate_idx
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_taskpartner_trandate' AND object_id = OBJECT_ID('dbo.WIPTransactions'))
BEGIN
    EXEC SP_RENAME N'dbo.WIPTransactions.idx_wip_taskpartner_trandate', N'WIPTransactions_TaskPartner_TranDate_idx', N'INDEX';
END

-- RenameIndex: idx_wip_ttype -> WIPTransactions_TType_idx
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_ttype' AND object_id = OBJECT_ID('dbo.WIPTransactions'))
BEGIN
    EXEC SP_RENAME N'dbo.WIPTransactions.idx_wip_ttype', N'WIPTransactions_TType_idx', N'INDEX';
END

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
