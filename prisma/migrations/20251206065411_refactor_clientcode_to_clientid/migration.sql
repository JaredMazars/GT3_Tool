-- Refactor ClientCode to use ClientID (UNIQUEIDENTIFIER)

BEGIN TRY
    BEGIN TRANSACTION;

    -- Step 1: Ensure all clients have ClientID
    UPDATE [dbo].[Client]
    SET [ClientID] = NEWID()
    WHERE [ClientID] IS NULL;

    -- Step 2: Create unique constraint on Client.ClientID if not exists
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Client') AND name = 'Client_ClientID_key')
    BEGIN
        CREATE UNIQUE INDEX [Client_ClientID_key] ON [dbo].[Client]([ClientID]);
    END;

    -- Step 3: Add new ClientCode columns with UNIQUEIDENTIFIER type
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Task') AND name = 'ClientCode_new')
    BEGIN
        ALTER TABLE [dbo].[Task] ADD [ClientCode_new] UNIQUEIDENTIFIER NULL;
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('WipLTD') AND name = 'ClientCode_new')
    BEGIN
        ALTER TABLE [dbo].[WipLTD] ADD [ClientCode_new] UNIQUEIDENTIFIER NULL;
    END;

    -- Step 4: Populate new columns with ClientID values
    UPDATE t
    SET t.ClientCode_new = c.ClientID
    FROM [dbo].[Task] t
    INNER JOIN [dbo].[Client] c ON t.ClientCode = c.clientCode
    WHERE t.ClientCode_new IS NULL;

    UPDATE w
    SET w.ClientCode_new = c.ClientID
    FROM [dbo].[WipLTD] w
    INNER JOIN [dbo].[Client] c ON w.ClientCode = c.clientCode
    WHERE w.ClientCode_new IS NULL;

    -- Step 5: Drop foreign key constraint if exists
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'Task_ClientCode_fkey' AND parent_object_id = OBJECT_ID('Task'))
    BEGIN
        ALTER TABLE [dbo].[Task] DROP CONSTRAINT [Task_ClientCode_fkey];
    END;

    -- Step 6: Drop unique constraint if exists
    IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'Task_ClientCode_TaskCode_key' AND parent_object_id = OBJECT_ID('Task'))
    BEGIN
        ALTER TABLE [dbo].[Task] DROP CONSTRAINT [Task_ClientCode_TaskCode_key];
    END;

    -- Step 7: Drop indexes
    IF EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Task') AND name = 'Task_ClientCode_idx')
    BEGIN
        DROP INDEX [Task_ClientCode_idx] ON [dbo].[Task];
    END;

    IF EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('WipLTD') AND name = 'WipLTD_ClientCode_idx')
    BEGIN
        DROP INDEX [WipLTD_ClientCode_idx] ON [dbo].[WipLTD];
    END;

    -- Step 8: Drop old ClientCode columns
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Task') AND name = 'ClientCode')
    BEGIN
        ALTER TABLE [dbo].[Task] DROP COLUMN [ClientCode];
    END;

    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('WipLTD') AND name = 'ClientCode')
    BEGIN
        ALTER TABLE [dbo].[WipLTD] DROP COLUMN [ClientCode];
    END;

    -- Step 9: Rename new columns to ClientCode
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Task') AND name = 'ClientCode_new')
    BEGIN
        EXEC sp_rename 'dbo.Task.ClientCode_new', 'ClientCode', 'COLUMN';
    END;

    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('WipLTD') AND name = 'ClientCode_new')
    BEGIN
        EXEC sp_rename 'dbo.WipLTD.ClientCode_new', 'ClientCode', 'COLUMN';
    END;

    -- Step 10: Create new foreign key constraint
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'Task_ClientCode_fkey' AND parent_object_id = OBJECT_ID('Task'))
    BEGIN
        ALTER TABLE [dbo].[Task] 
        ADD CONSTRAINT [Task_ClientCode_fkey] 
        FOREIGN KEY ([ClientCode]) REFERENCES [dbo].[Client]([ClientID]) 
        ON UPDATE NO ACTION ON DELETE NO ACTION;
    END;

    -- Step 11: Create unique constraint on Task
    IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'Task_ClientCode_TaskCode_key' AND parent_object_id = OBJECT_ID('Task'))
    BEGIN
        ALTER TABLE [dbo].[Task] 
        ADD CONSTRAINT [Task_ClientCode_TaskCode_key] UNIQUE ([ClientCode], [TaskCode]);
    END;

    -- Step 12: Recreate indexes
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Task') AND name = 'Task_ClientCode_idx')
    BEGIN
        CREATE INDEX [Task_ClientCode_idx] ON [dbo].[Task]([ClientCode]);
    END;

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('WipLTD') AND name = 'WipLTD_ClientCode_idx')
    BEGIN
        CREATE INDEX [WipLTD_ClientCode_idx] ON [dbo].[WipLTD]([ClientCode]);
    END;

    COMMIT TRANSACTION;

    PRINT 'Migration completed successfully';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION;
    END;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;





