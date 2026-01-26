-- Fix WorkspaceFolder schema to use taskId instead of clientId

-- Drop the foreign key constraint for Client if it exists
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_WorkspaceFolder_Client')
BEGIN
    ALTER TABLE [dbo].[WorkspaceFolder] DROP CONSTRAINT [FK_WorkspaceFolder_Client];
END

-- Drop the Client relation index if it exists
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WorkspaceFolder_clientId' AND object_id = OBJECT_ID('dbo.WorkspaceFolder'))
BEGIN
    DROP INDEX [IX_WorkspaceFolder_clientId] ON [dbo].[WorkspaceFolder];
END

-- Add taskId column if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE name = 'taskId' AND object_id = OBJECT_ID('dbo.WorkspaceFolder'))
BEGIN
    ALTER TABLE [dbo].[WorkspaceFolder] ADD [taskId] INT NULL;
END

-- Remove clientId column if it exists
IF EXISTS (SELECT 1 FROM sys.columns WHERE name = 'clientId' AND object_id = OBJECT_ID('dbo.WorkspaceFolder'))
BEGIN
    ALTER TABLE [dbo].[WorkspaceFolder] DROP COLUMN [clientId];
END

-- Add index for taskId if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WorkspaceFolder_taskId' AND object_id = OBJECT_ID('dbo.WorkspaceFolder'))
BEGIN
    CREATE INDEX [IX_WorkspaceFolder_taskId] ON [dbo].[WorkspaceFolder]([taskId]);
END

-- Add foreign key constraint for Task relation if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_WorkspaceFolder_Task')
BEGIN
    ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [FK_WorkspaceFolder_Task] 
      FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END


































