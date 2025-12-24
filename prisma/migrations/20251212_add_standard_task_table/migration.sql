-- CreateTable
CREATE TABLE [dbo].[StandardTask] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSStdTaskID] UNIQUEIDENTIFIER NOT NULL,
    [StdTaskCode] NVARCHAR(10) NOT NULL,
    [StdTaskDesc] NVARCHAR(150) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_StandardTask_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_StandardTask] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE UNIQUE INDEX [StandardTask_GSStdTaskID_key] ON [dbo].[StandardTask]([GSStdTaskID]);

-- CreateIndex
CREATE INDEX [StandardTask_StdTaskCode_idx] ON [dbo].[StandardTask]([StdTaskCode]);

-- CreateIndex
CREATE INDEX [StandardTask_ServLineCode_idx] ON [dbo].[StandardTask]([ServLineCode]);

-- CreateIndex
CREATE INDEX [StandardTask_GSStdTaskID_idx] ON [dbo].[StandardTask]([GSStdTaskID]);

















