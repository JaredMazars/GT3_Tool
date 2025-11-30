BEGIN TRY

BEGIN TRAN;

-- Add createdBy column to Project table
ALTER TABLE [dbo].[Project] ADD [createdBy] NVARCHAR(450);

-- Add foreign key constraint for createdBy
ALTER TABLE [dbo].[Project] ADD CONSTRAINT [Project_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Create index on createdBy
CREATE NONCLUSTERED INDEX [Project_createdBy_idx] ON [dbo].[Project]([createdBy]);

-- Update existing foreign key constraints to add ON UPDATE NO ACTION
-- ProjectUser.userId constraint
ALTER TABLE [dbo].[ProjectUser] DROP CONSTRAINT [ProjectUser_userId_fkey];
ALTER TABLE [dbo].[ProjectUser] ADD CONSTRAINT [ProjectUser_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- NotificationPreference.userId constraint  
ALTER TABLE [dbo].[NotificationPreference] DROP CONSTRAINT [NotificationPreference_userId_fkey];
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- InAppNotification.userId constraint
ALTER TABLE [dbo].[InAppNotification] DROP CONSTRAINT [InAppNotification_userId_fkey];
ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH




