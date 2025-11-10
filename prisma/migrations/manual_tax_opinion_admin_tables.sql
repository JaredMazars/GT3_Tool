-- Manual migration for Tax Opinion and Tax Administration tables

-- OpinionDraft table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OpinionDraft' and xtype='U')
BEGIN
    CREATE TABLE [dbo].[OpinionDraft] (
        [id] INT NOT NULL IDENTITY(1,1),
        [projectId] INT NOT NULL,
        [version] INT NOT NULL CONSTRAINT [OpinionDraft_version_df] DEFAULT 1,
        [title] NVARCHAR(1000) NOT NULL,
        [content] NVARCHAR(max) NOT NULL,
        [status] NVARCHAR(1000) NOT NULL CONSTRAINT [OpinionDraft_status_df] DEFAULT 'DRAFT',
        [createdBy] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionDraft_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [OpinionDraft_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [OpinionDraft_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE NONCLUSTERED INDEX [OpinionDraft_projectId_idx] ON [dbo].[OpinionDraft]([projectId]);
    CREATE NONCLUSTERED INDEX [OpinionDraft_status_idx] ON [dbo].[OpinionDraft]([status]);
    CREATE NONCLUSTERED INDEX [OpinionDraft_projectId_version_idx] ON [dbo].[OpinionDraft]([projectId], [version]);
END;

-- ResearchNote table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearchNote' and xtype='U')
BEGIN
    CREATE TABLE [dbo].[ResearchNote] (
        [id] INT NOT NULL IDENTITY(1,1),
        [projectId] INT NOT NULL,
        [title] NVARCHAR(1000) NOT NULL,
        [content] NVARCHAR(max) NOT NULL,
        [tags] NVARCHAR(1000),
        [category] NVARCHAR(1000),
        [createdBy] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [ResearchNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [ResearchNote_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [ResearchNote_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE NONCLUSTERED INDEX [ResearchNote_projectId_idx] ON [dbo].[ResearchNote]([projectId]);
    CREATE NONCLUSTERED INDEX [ResearchNote_category_idx] ON [dbo].[ResearchNote]([category]);
END;

-- LegalPrecedent table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LegalPrecedent' and xtype='U')
BEGIN
    CREATE TABLE [dbo].[LegalPrecedent] (
        [id] INT NOT NULL IDENTITY(1,1),
        [projectId] INT NOT NULL,
        [caseName] NVARCHAR(1000) NOT NULL,
        [citation] NVARCHAR(1000) NOT NULL,
        [court] NVARCHAR(1000),
        [year] INT,
        [summary] NVARCHAR(max) NOT NULL,
        [relevance] NVARCHAR(max),
        [link] NVARCHAR(1000),
        [createdBy] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [LegalPrecedent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [LegalPrecedent_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [LegalPrecedent_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE NONCLUSTERED INDEX [LegalPrecedent_projectId_idx] ON [dbo].[LegalPrecedent]([projectId]);
    CREATE NONCLUSTERED INDEX [LegalPrecedent_year_idx] ON [dbo].[LegalPrecedent]([year]);
END;

-- SarsResponse table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SarsResponse' and xtype='U')
BEGIN
    CREATE TABLE [dbo].[SarsResponse] (
        [id] INT NOT NULL IDENTITY(1,1),
        [projectId] INT NOT NULL,
        [referenceNumber] NVARCHAR(1000) NOT NULL,
        [subject] NVARCHAR(1000) NOT NULL,
        [content] NVARCHAR(max) NOT NULL,
        [status] NVARCHAR(1000) NOT NULL CONSTRAINT [SarsResponse_status_df] DEFAULT 'PENDING',
        [responseType] NVARCHAR(1000) NOT NULL,
        [deadline] DATETIME2,
        [sentDate] DATETIME2,
        [receivedDate] DATETIME2,
        [documentPath] NVARCHAR(1000),
        [createdBy] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [SarsResponse_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [SarsResponse_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [SarsResponse_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE NONCLUSTERED INDEX [SarsResponse_projectId_idx] ON [dbo].[SarsResponse]([projectId]);
    CREATE NONCLUSTERED INDEX [SarsResponse_status_idx] ON [dbo].[SarsResponse]([status]);
    CREATE NONCLUSTERED INDEX [SarsResponse_deadline_idx] ON [dbo].[SarsResponse]([deadline]);
END;

-- AdministrationDocument table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AdministrationDocument' and xtype='U')
BEGIN
    CREATE TABLE [dbo].[AdministrationDocument] (
        [id] INT NOT NULL IDENTITY(1,1),
        [projectId] INT NOT NULL,
        [fileName] NVARCHAR(1000) NOT NULL,
        [fileType] NVARCHAR(1000) NOT NULL,
        [fileSize] INT NOT NULL,
        [filePath] NVARCHAR(1000) NOT NULL,
        [category] NVARCHAR(1000) NOT NULL,
        [description] NVARCHAR(1000),
        [version] INT NOT NULL CONSTRAINT [AdministrationDocument_version_df] DEFAULT 1,
        [uploadedBy] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdministrationDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [AdministrationDocument_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [AdministrationDocument_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE NONCLUSTERED INDEX [AdministrationDocument_projectId_idx] ON [dbo].[AdministrationDocument]([projectId]);
    CREATE NONCLUSTERED INDEX [AdministrationDocument_category_idx] ON [dbo].[AdministrationDocument]([category]);
END;

-- ComplianceChecklist table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ComplianceChecklist' and xtype='U')
BEGIN
    CREATE TABLE [dbo].[ComplianceChecklist] (
        [id] INT NOT NULL IDENTITY(1,1),
        [projectId] INT NOT NULL,
        [title] NVARCHAR(1000) NOT NULL,
        [description] NVARCHAR(max),
        [dueDate] DATETIME2,
        [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [ComplianceChecklist_priority_df] DEFAULT 'MEDIUM',
        [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ComplianceChecklist_status_df] DEFAULT 'PENDING',
        [assignedTo] NVARCHAR(1000),
        [completedAt] DATETIME2,
        [completedBy] NVARCHAR(1000),
        [createdBy] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [ComplianceChecklist_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [ComplianceChecklist_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [ComplianceChecklist_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE NONCLUSTERED INDEX [ComplianceChecklist_projectId_idx] ON [dbo].[ComplianceChecklist]([projectId]);
    CREATE NONCLUSTERED INDEX [ComplianceChecklist_status_idx] ON [dbo].[ComplianceChecklist]([status]);
    CREATE NONCLUSTERED INDEX [ComplianceChecklist_dueDate_idx] ON [dbo].[ComplianceChecklist]([dueDate]);
    CREATE NONCLUSTERED INDEX [ComplianceChecklist_assignedTo_idx] ON [dbo].[ComplianceChecklist]([assignedTo]);
END;

-- FilingStatus table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FilingStatus' and xtype='U')
BEGIN
    CREATE TABLE [dbo].[FilingStatus] (
        [id] INT NOT NULL IDENTITY(1,1),
        [projectId] INT NOT NULL,
        [filingType] NVARCHAR(1000) NOT NULL,
        [description] NVARCHAR(1000),
        [status] NVARCHAR(1000) NOT NULL CONSTRAINT [FilingStatus_status_df] DEFAULT 'PENDING',
        [deadline] DATETIME2,
        [submittedDate] DATETIME2,
        [approvedDate] DATETIME2,
        [referenceNumber] NVARCHAR(1000),
        [notes] NVARCHAR(max),
        [createdBy] NVARCHAR(1000) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [FilingStatus_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [FilingStatus_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [FilingStatus_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE
    );
    
    CREATE NONCLUSTERED INDEX [FilingStatus_projectId_idx] ON [dbo].[FilingStatus]([projectId]);
    CREATE NONCLUSTERED INDEX [FilingStatus_status_idx] ON [dbo].[FilingStatus]([status]);
    CREATE NONCLUSTERED INDEX [FilingStatus_deadline_idx] ON [dbo].[FilingStatus]([deadline]);
END;

PRINT 'Migration completed successfully';

