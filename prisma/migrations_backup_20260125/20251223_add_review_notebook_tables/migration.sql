-- Review Notebook Tool Tables Migration
-- Adds ReviewNote, ReviewNoteComment, ReviewNoteAttachment, and ReviewCategory tables

-- Create ReviewCategory table first (referenced by ReviewNote)
CREATE TABLE [dbo].[ReviewCategory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [serviceLine] NVARCHAR(50),
    [active] BIT NOT NULL DEFAULT 1,
    [sortOrder] INT NOT NULL DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ReviewCategory] PRIMARY KEY CLUSTERED ([id] ASC)
);

-- Create indexes for ReviewCategory
CREATE NONCLUSTERED INDEX [ReviewCategory_serviceLine_idx] ON [dbo].[ReviewCategory]([serviceLine] ASC);
CREATE NONCLUSTERED INDEX [ReviewCategory_active_idx] ON [dbo].[ReviewCategory]([active] ASC);
CREATE NONCLUSTERED INDEX [ReviewCategory_sortOrder_idx] ON [dbo].[ReviewCategory]([sortOrder] ASC);

-- Create ReviewNote table
CREATE TABLE [dbo].[ReviewNote] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [referenceUrl] NVARCHAR(1000),
    [referenceType] NVARCHAR(20) NOT NULL DEFAULT 'EXTERNAL',
    [referenceId] NVARCHAR(100),
    [section] NVARCHAR(255),
    [status] NVARCHAR(20) NOT NULL DEFAULT 'OPEN',
    [priority] NVARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    [categoryId] INT,
    [dueDate] DATETIME2,
    [raisedBy] NVARCHAR(1000) NOT NULL,
    [assignedTo] NVARCHAR(1000),
    [addressedAt] DATETIME2,
    [addressedBy] NVARCHAR(1000),
    [addressedComment] NVARCHAR(MAX),
    [clearedAt] DATETIME2,
    [clearedBy] NVARCHAR(1000),
    [clearanceComment] NVARCHAR(MAX),
    [rejectedAt] DATETIME2,
    [rejectionReason] NVARCHAR(MAX),
    [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ReviewNote] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_ReviewNote_Task] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReviewNote_Category] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[ReviewCategory]([id]) ON DELETE SET NULL,
    CONSTRAINT [FK_ReviewNote_RaisedBy] FOREIGN KEY ([raisedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ReviewNote_AssignedTo] FOREIGN KEY ([assignedTo]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION,
    CONSTRAINT [CHK_ReviewNote_Status] CHECK ([status] IN ('OPEN', 'IN_PROGRESS', 'ADDRESSED', 'CLEARED', 'REJECTED')),
    CONSTRAINT [CHK_ReviewNote_Priority] CHECK ([priority] IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT [CHK_ReviewNote_ReferenceType] CHECK ([referenceType] IN ('FILE', 'PAGE', 'EXTERNAL'))
);

-- Create indexes for ReviewNote
CREATE NONCLUSTERED INDEX [ReviewNote_taskId_idx] ON [dbo].[ReviewNote]([taskId] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_status_idx] ON [dbo].[ReviewNote]([status] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_assignedTo_idx] ON [dbo].[ReviewNote]([assignedTo] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_raisedBy_idx] ON [dbo].[ReviewNote]([raisedBy] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_dueDate_idx] ON [dbo].[ReviewNote]([dueDate] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_priority_idx] ON [dbo].[ReviewNote]([priority] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_categoryId_idx] ON [dbo].[ReviewNote]([categoryId] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_taskId_status_idx] ON [dbo].[ReviewNote]([taskId] ASC, [status] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_assignedTo_status_idx] ON [dbo].[ReviewNote]([assignedTo] ASC, [status] ASC);
CREATE NONCLUSTERED INDEX [ReviewNote_createdAt_idx] ON [dbo].[ReviewNote]([createdAt] DESC);

-- Create ReviewNoteComment table
CREATE TABLE [dbo].[ReviewNoteComment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [reviewNoteId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [comment] NVARCHAR(MAX) NOT NULL,
    [isInternal] BIT NOT NULL DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ReviewNoteComment] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_ReviewNoteComment_ReviewNote] FOREIGN KEY ([reviewNoteId]) REFERENCES [dbo].[ReviewNote]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReviewNoteComment_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION
);

-- Create indexes for ReviewNoteComment
CREATE NONCLUSTERED INDEX [ReviewNoteComment_reviewNoteId_idx] ON [dbo].[ReviewNoteComment]([reviewNoteId] ASC);
CREATE NONCLUSTERED INDEX [ReviewNoteComment_createdAt_idx] ON [dbo].[ReviewNoteComment]([createdAt] ASC);
CREATE NONCLUSTERED INDEX [ReviewNoteComment_userId_idx] ON [dbo].[ReviewNoteComment]([userId] ASC);

-- Create ReviewNoteAttachment table
CREATE TABLE [dbo].[ReviewNoteAttachment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [reviewNoteId] INT NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [fileType] NVARCHAR(100) NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ReviewNoteAttachment] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_ReviewNoteAttachment_ReviewNote] FOREIGN KEY ([reviewNoteId]) REFERENCES [dbo].[ReviewNote]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReviewNoteAttachment_User] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION
);

-- Create indexes for ReviewNoteAttachment
CREATE NONCLUSTERED INDEX [ReviewNoteAttachment_reviewNoteId_idx] ON [dbo].[ReviewNoteAttachment]([reviewNoteId] ASC);
CREATE NONCLUSTERED INDEX [ReviewNoteAttachment_uploadedBy_idx] ON [dbo].[ReviewNoteAttachment]([uploadedBy] ASC);

-- Seed default review categories
INSERT INTO [dbo].[ReviewCategory] ([name], [description], [serviceLine], [active], [sortOrder])
VALUES 
    ('Calculation Error', 'Mathematical or computational errors in financial statements or tax calculations', NULL, 1, 1),
    ('Missing Documentation', 'Required supporting documents or evidence not provided', NULL, 1, 2),
    ('Incorrect Classification', 'Items classified in wrong accounts or categories', NULL, 1, 3),
    ('Disclosure Issue', 'Missing or inadequate disclosures in financial statements', NULL, 1, 4),
    ('Compliance Gap', 'Non-compliance with regulations, standards, or policies', NULL, 1, 5),
    ('Presentation Issue', 'Formatting, layout, or presentation problems in deliverables', NULL, 1, 6),
    ('Data Quality', 'Issues with accuracy, completeness, or consistency of data', NULL, 1, 7),
    ('Procedural Concern', 'Deviations from established procedures or best practices', NULL, 1, 8),
    ('Other', 'Other issues not covered by standard categories', NULL, 1, 9);

