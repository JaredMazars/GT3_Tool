-- Update database relationships to use external GUIDs (GS* fields)
-- External system tables (Client, Task, Wip, Debtors) now use GS* fields for relationships
-- Internal-only tables continue using integer id fields

BEGIN TRY
    BEGIN TRANSACTION;

    -- ========================================
    -- Task Table: Remove clientId, use GSClientID for Client relationship
    -- ========================================
    
    -- Drop existing foreign key constraint on Task.clientId
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'Task_clientId_fkey')
        ALTER TABLE [dbo].[Task] DROP CONSTRAINT [Task_clientId_fkey];
    
    -- Drop index on Task.clientId
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'Task_clientId_idx' AND object_id = OBJECT_ID('dbo.Task'))
        DROP INDEX [Task_clientId_idx] ON [dbo].[Task];
    
    -- Drop the clientId column
    IF EXISTS (SELECT * FROM sys.columns WHERE name = 'clientId' AND object_id = OBJECT_ID('dbo.Task'))
        ALTER TABLE [dbo].[Task] DROP COLUMN [clientId];
    
    -- Add foreign key constraint on Task.GSClientID -> Client.GSClientID
    ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_GSClientID_fkey] 
        FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) 
        ON DELETE NO ACTION ON UPDATE NO ACTION;

    -- ========================================
    -- Wip Table: Remove clientId and taskId, use GSClientID and GSTaskID
    -- ========================================
    
    -- Drop existing foreign key constraints
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'Wip_clientId_fkey')
        ALTER TABLE [dbo].[Wip] DROP CONSTRAINT [Wip_clientId_fkey];
    
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'Wip_taskId_fkey')
        ALTER TABLE [dbo].[Wip] DROP CONSTRAINT [Wip_taskId_fkey];
    
    -- Drop indexes
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'Wip_clientId_idx' AND object_id = OBJECT_ID('dbo.Wip'))
        DROP INDEX [Wip_clientId_idx] ON [dbo].[Wip];
    
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'Wip_taskId_idx' AND object_id = OBJECT_ID('dbo.Wip'))
        DROP INDEX [Wip_taskId_idx] ON [dbo].[Wip];
    
    -- Drop columns
    IF EXISTS (SELECT * FROM sys.columns WHERE name = 'clientId' AND object_id = OBJECT_ID('dbo.Wip'))
        ALTER TABLE [dbo].[Wip] DROP COLUMN [clientId];
    
    IF EXISTS (SELECT * FROM sys.columns WHERE name = 'taskId' AND object_id = OBJECT_ID('dbo.Wip'))
        ALTER TABLE [dbo].[Wip] DROP COLUMN [taskId];
    
    -- Add foreign key constraints on GS* fields
    ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [Wip_GSClientID_fkey] 
        FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) 
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    
    ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [Wip_GSTaskID_fkey] 
        FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) 
        ON DELETE NO ACTION ON UPDATE NO ACTION;

    -- ========================================
    -- Debtors Table: Remove clientId, use GSClientID
    -- ========================================
    
    -- Drop existing foreign key constraint
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'Debtors_clientId_fkey')
        ALTER TABLE [dbo].[Debtors] DROP CONSTRAINT [Debtors_clientId_fkey];
    
    -- Drop index
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'Debtors_clientId_idx' AND object_id = OBJECT_ID('dbo.Debtors'))
        DROP INDEX [Debtors_clientId_idx] ON [dbo].[Debtors];
    
    -- Drop column
    IF EXISTS (SELECT * FROM sys.columns WHERE name = 'clientId' AND object_id = OBJECT_ID('dbo.Debtors'))
        ALTER TABLE [dbo].[Debtors] DROP COLUMN [clientId];
    
    -- Add foreign key constraint on Debtors.GSClientID -> Client.GSClientID
    ALTER TABLE [dbo].[Debtors] ADD CONSTRAINT [Debtors_GSClientID_fkey] 
        FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) 
        ON DELETE NO ACTION ON UPDATE NO ACTION;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
