-- CreateEnum: NonClientEventType
-- Note: SQL Server doesn't have native enums, Prisma handles this as nvarchar

-- CreateTable: NonClientAllocation
CREATE TABLE [dbo].[NonClientAllocation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] NVARCHAR(450) NOT NULL,
    [eventType] NVARCHAR(50) NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [allocatedHours] DECIMAL(10,2) NOT NULL,
    [allocatedPercentage] INT NOT NULL CONSTRAINT [DF_NonClientAllocation_allocatedPercentage] DEFAULT 100,
    [notes] NVARCHAR(MAX),
    [createdBy] NVARCHAR(450) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_NonClientAllocation_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_NonClientAllocation] PRIMARY KEY CLUSTERED ([id] ASC)
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NonClientAllocation_userId_idx] ON [dbo].[NonClientAllocation]([userId] ASC);

CREATE NONCLUSTERED INDEX [NonClientAllocation_userId_startDate_endDate_idx] ON [dbo].[NonClientAllocation]([userId] ASC, [startDate] ASC, [endDate] ASC);

CREATE NONCLUSTERED INDEX [NonClientAllocation_eventType_idx] ON [dbo].[NonClientAllocation]([eventType] ASC);

-- AddForeignKey
ALTER TABLE [dbo].[NonClientAllocation] ADD CONSTRAINT [FK_NonClientAllocation_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add check constraint for valid event types
ALTER TABLE [dbo].[NonClientAllocation] ADD CONSTRAINT [CHK_NonClientAllocation_eventType] 
    CHECK ([eventType] IN ('TRAINING', 'ANNUAL_LEAVE', 'SICK_LEAVE', 'PUBLIC_HOLIDAY', 'PERSONAL', 'ADMINISTRATIVE'));
