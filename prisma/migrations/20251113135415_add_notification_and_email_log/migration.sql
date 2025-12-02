BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[NotificationPreference] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] NVARCHAR(1000) NOT NULL,
    [projectId] INT,
    [notificationType] NVARCHAR(1000) NOT NULL,
    [emailEnabled] BIT NOT NULL CONSTRAINT [NotificationPreference_emailEnabled_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NotificationPreference_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [NotificationPreference_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NotificationPreference_userId_projectId_notificationType_key] UNIQUE NONCLUSTERED ([userId],[projectId],[notificationType])
);

-- CreateTable
CREATE TABLE [dbo].[EmailLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [recipientEmail] NVARCHAR(1000) NOT NULL,
    [recipientUserId] NVARCHAR(1000),
    [emailType] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [errorMessage] NVARCHAR(1000),
    [metadata] NVARCHAR(MAX),
    [sentAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EmailLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationPreference_userId_idx] ON [dbo].[NotificationPreference]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationPreference_projectId_idx] ON [dbo].[NotificationPreference]([projectId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailLog_recipientUserId_idx] ON [dbo].[EmailLog]([recipientUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailLog_emailType_idx] ON [dbo].[EmailLog]([emailType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailLog_status_idx] ON [dbo].[EmailLog]([status]);

-- AddForeignKey
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[EmailLog] ADD CONSTRAINT [EmailLog_recipientUserId_fkey] FOREIGN KEY ([recipientUserId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

