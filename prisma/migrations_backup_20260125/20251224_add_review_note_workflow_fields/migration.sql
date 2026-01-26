-- Add workflow tracking fields to ReviewNote table (if not exists)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNote]') AND name = 'currentOwner')
BEGIN
    ALTER TABLE [dbo].[ReviewNote]
    ADD [currentOwner] NVARCHAR(1000) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNote]') AND name = 'lastRespondedBy')
BEGIN
    ALTER TABLE [dbo].[ReviewNote]
    ADD [lastRespondedBy] NVARCHAR(1000) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNote]') AND name = 'lastRespondedAt')
BEGIN
    ALTER TABLE [dbo].[ReviewNote]
    ADD [lastRespondedAt] DATETIME2 NULL;
END

-- Create index for currentOwner (if not exists) - using dynamic SQL
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNote]') AND name = 'ReviewNote_currentOwner_idx')
BEGIN
    EXEC('CREATE INDEX [ReviewNote_currentOwner_idx] ON [dbo].[ReviewNote]([currentOwner])');
END

-- Create ReviewNoteAssignee table (if not exists)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNoteAssignee]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ReviewNoteAssignee] (
        [id] INT NOT NULL IDENTITY(1,1),
        [reviewNoteId] INT NOT NULL,
        [userId] NVARCHAR(1000) NOT NULL,
        [assignedAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNoteAssignee_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
        [assignedBy] NVARCHAR(1000) NOT NULL,
        [isForwarded] BIT NOT NULL CONSTRAINT [ReviewNoteAssignee_isForwarded_df] DEFAULT 0,
        CONSTRAINT [PK_ReviewNoteAssignee] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [ReviewNoteAssignee_reviewNoteId_userId_key] UNIQUE NONCLUSTERED ([reviewNoteId] ASC, [userId] ASC),
        CONSTRAINT [FK_ReviewNoteAssignee_ReviewNote] FOREIGN KEY ([reviewNoteId]) REFERENCES [dbo].[ReviewNote] ([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReviewNoteAssignee_User_userId] FOREIGN KEY ([userId]) REFERENCES [dbo].[User] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [FK_ReviewNoteAssignee_User_assignedBy] FOREIGN KEY ([assignedBy]) REFERENCES [dbo].[User] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
END

-- Create indexes for ReviewNoteAssignee (if not exists)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNoteAssignee]') AND name = 'ReviewNoteAssignee_reviewNoteId_idx')
BEGIN
    CREATE INDEX [ReviewNoteAssignee_reviewNoteId_idx] ON [dbo].[ReviewNoteAssignee]([reviewNoteId]);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNoteAssignee]') AND name = 'ReviewNoteAssignee_userId_idx')
BEGIN
    CREATE INDEX [ReviewNoteAssignee_userId_idx] ON [dbo].[ReviewNoteAssignee]([userId]);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNoteAssignee]') AND name = 'ReviewNoteAssignee_assignedBy_idx')
BEGIN
    CREATE INDEX [ReviewNoteAssignee_assignedBy_idx] ON [dbo].[ReviewNoteAssignee]([assignedBy]);
END

-- Add foreign key constraints for new ReviewNote fields (if not exists) - using dynamic SQL
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_ReviewNote_User_currentOwner]') AND parent_object_id = OBJECT_ID(N'[dbo].[ReviewNote]'))
BEGIN
    EXEC('ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [FK_ReviewNote_User_currentOwner] FOREIGN KEY ([currentOwner]) REFERENCES [dbo].[User] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION');
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_ReviewNote_User_lastRespondedBy]') AND parent_object_id = OBJECT_ID(N'[dbo].[ReviewNote]'))
BEGIN
    EXEC('ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [FK_ReviewNote_User_lastRespondedBy] FOREIGN KEY ([lastRespondedBy]) REFERENCES [dbo].[User] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION');
END

-- Migrate existing assignedTo data to ReviewNoteAssignee table (if not already migrated)
IF NOT EXISTS (SELECT 1 FROM [dbo].[ReviewNoteAssignee])
BEGIN
    INSERT INTO [dbo].[ReviewNoteAssignee] ([reviewNoteId], [userId], [assignedBy], [assignedAt], [isForwarded])
    SELECT 
        [id] as reviewNoteId,
        [assignedTo] as userId,
        [raisedBy] as assignedBy,
        [createdAt] as assignedAt,
        0 as isForwarded
    FROM [dbo].[ReviewNote]
    WHERE [assignedTo] IS NOT NULL;
END

-- Set currentOwner based on existing status (only if column exists and not already set) - using dynamic SQL
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ReviewNote]') AND name = 'currentOwner')
BEGIN
    EXEC('UPDATE [dbo].[ReviewNote] SET [currentOwner] = [raisedBy] WHERE [status] = ''ADDRESSED'' AND [currentOwner] IS NULL');
END

-- For other statuses, leave currentOwner as NULL (sits with all assignees)
-- No action needed as NULL is already the default
