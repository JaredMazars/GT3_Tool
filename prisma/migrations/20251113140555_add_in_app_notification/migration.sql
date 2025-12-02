BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[InAppNotification] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] NVARCHAR(1000) NOT NULL,
    [projectId] INT,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(MAX) NOT NULL,
    [actionUrl] NVARCHAR(1000),
    [isRead] BIT NOT NULL CONSTRAINT [InAppNotification_isRead_df] DEFAULT 0,
    [readAt] DATETIME2,
    [metadata] NVARCHAR(MAX),
    [fromUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InAppNotification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InAppNotification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InAppNotification_userId_idx] ON [dbo].[InAppNotification]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InAppNotification_userId_isRead_idx] ON [dbo].[InAppNotification]([userId],[isRead]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InAppNotification_fromUserId_idx] ON [dbo].[InAppNotification]([fromUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InAppNotification_projectId_idx] ON [dbo].[InAppNotification]([projectId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InAppNotification_createdAt_idx] ON [dbo].[InAppNotification]([createdAt] DESC);

-- AddForeignKey
ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_fromUserId_fkey] FOREIGN KEY ([fromUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

