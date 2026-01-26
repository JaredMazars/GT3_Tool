-- Add clientId column to WorkspaceFolder table
ALTER TABLE [dbo].[WorkspaceFolder] ADD [clientId] INT NULL;

-- Create index on clientId
CREATE NONCLUSTERED INDEX [IX_WorkspaceFolder_clientId] ON [dbo].[WorkspaceFolder]([clientId]);

-- Add foreign key constraint
ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [FK_WorkspaceFolder_Client] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;


































