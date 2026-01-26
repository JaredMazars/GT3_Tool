-- CreateTable
CREATE TABLE [dbo].[TaskStage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [stage] NVARCHAR(50) NOT NULL,
    [movedBy] NVARCHAR(MAX) NOT NULL,
    [notes] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_TaskStage_createdAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_TaskStage] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_TaskStage_Task] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_TaskStage_User] FOREIGN KEY ([movedBy]) REFERENCES [dbo].[User] ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_TaskStage_taskId_createdAt] ON [dbo].[TaskStage]([taskId] ASC, [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_TaskStage_stage] ON [dbo].[TaskStage]([stage] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_TaskStage_taskId_stage] ON [dbo].[TaskStage]([taskId] ASC, [stage] ASC);



















