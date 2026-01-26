-- Remove client workspace support and add task workspace

-- Drop the foreign key constraint for Client first
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_WorkspaceFolder_Client')
BEGIN
    ALTER TABLE [dbo].[WorkspaceFolder] DROP CONSTRAINT [FK_WorkspaceFolder_Client];
END

-- Drop the Client relation index
DROP INDEX IF EXISTS [IX_WorkspaceFolder_clientId] ON [dbo].[WorkspaceFolder];

-- Add taskId column
ALTER TABLE [dbo].[WorkspaceFolder] ADD [taskId] INT NULL;

-- Remove clientId column
ALTER TABLE [dbo].[WorkspaceFolder] DROP COLUMN [clientId];

-- Add index for taskId
CREATE INDEX [IX_WorkspaceFolder_taskId] ON [dbo].[WorkspaceFolder]([taskId]);

-- Add foreign key constraint for Task relation
ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [FK_WorkspaceFolder_Task] 
  FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

