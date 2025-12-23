-- Manual TaskStage Table Creation
-- Run this in SQL Server Management Studio or Azure Data Studio if the migration fails

-- First, drop the table if it exists (and has issues)
IF OBJECT_ID('dbo.TaskStage', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.TaskStage;
    PRINT 'TaskStage table dropped';
END

-- Create the TaskStage table
-- Note: Using same type as User.id for movedBy column
CREATE TABLE [dbo].[TaskStage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [stage] NVARCHAR(50) NOT NULL,
    [movedBy] NVARCHAR(MAX) NOT NULL,
    [notes] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_TaskStage_createdAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_TaskStage] PRIMARY KEY CLUSTERED ([id] ASC)
);

-- Add foreign key constraints
ALTER TABLE [dbo].[TaskStage]
ADD CONSTRAINT [FK_TaskStage_Task] 
FOREIGN KEY ([taskId]) 
REFERENCES [dbo].[Task] ([id]) 
ON DELETE CASCADE;

ALTER TABLE [dbo].[TaskStage]
ADD CONSTRAINT [FK_TaskStage_User] 
FOREIGN KEY ([movedBy]) 
REFERENCES [dbo].[User] ([id]);

-- Create indexes
CREATE NONCLUSTERED INDEX [IX_TaskStage_taskId_createdAt] 
ON [dbo].[TaskStage]([taskId] ASC, [createdAt] DESC);

CREATE NONCLUSTERED INDEX [IX_TaskStage_stage] 
ON [dbo].[TaskStage]([stage] ASC);

CREATE NONCLUSTERED INDEX [IX_TaskStage_taskId_stage] 
ON [dbo].[TaskStage]([taskId] ASC, [stage] ASC);

PRINT 'TaskStage table created successfully';












