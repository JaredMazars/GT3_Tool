-- CreateTable: BDStage
CREATE TABLE [dbo].[BDStage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [order] INT NOT NULL,
    [probability] FLOAT(53) NOT NULL,
    [serviceLine] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [BDStage_isActive_df] DEFAULT 1,
    [isDefault] BIT NOT NULL CONSTRAINT [BDStage_isDefault_df] DEFAULT 0,
    [color] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDStage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BDStage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BDStage_serviceLine_name_key] UNIQUE NONCLUSTERED ([serviceLine], [name])
);

-- CreateTable: BDContact
CREATE TABLE [dbo].[BDContact] (
    [id] INT NOT NULL IDENTITY(1,1),
    [companyName] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000) NOT NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [mobile] NVARCHAR(1000),
    [jobTitle] NVARCHAR(1000),
    [linkedin] NVARCHAR(1000),
    [industry] NVARCHAR(1000),
    [sector] NVARCHAR(1000),
    [website] NVARCHAR(1000),
    [address] NVARCHAR(1000),
    [city] NVARCHAR(1000),
    [province] NVARCHAR(1000),
    [postalCode] NVARCHAR(1000),
    [country] NVARCHAR(1000) CONSTRAINT [BDContact_country_df] DEFAULT 'South Africa',
    [notes] NVARCHAR(MAX),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDContact_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BDContact_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: BDOpportunity
CREATE TABLE [dbo].[BDOpportunity] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX),
    [companyName] NVARCHAR(1000) NOT NULL,
    [contactId] INT,
    [serviceLine] NVARCHAR(1000) NOT NULL,
    [stageId] INT NOT NULL,
    [value] FLOAT(53),
    [probability] FLOAT(53),
    [expectedCloseDate] DATETIME2,
    [source] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [BDOpportunity_status_df] DEFAULT 'OPEN',
    [lostReason] NVARCHAR(1000),
    [assignedTo] NVARCHAR(1000) NOT NULL,
    [convertedToClientId] INT,
    [convertedAt] DATETIME2,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDOpportunity_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BDOpportunity_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: BDActivity
CREATE TABLE [dbo].[BDActivity] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opportunityId] INT NOT NULL,
    [contactId] INT,
    [activityType] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [BDActivity_status_df] DEFAULT 'SCHEDULED',
    [dueDate] DATETIME2,
    [completedAt] DATETIME2,
    [duration] INT,
    [location] NVARCHAR(1000),
    [assignedTo] NVARCHAR(1000) NOT NULL,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDActivity_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BDActivity_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: BDProposal
CREATE TABLE [dbo].[BDProposal] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opportunityId] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX),
    [fileName] NVARCHAR(1000) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [proposedValue] FLOAT(53),
    [validUntil] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [BDProposal_status_df] DEFAULT 'DRAFT',
    [sentAt] DATETIME2,
    [viewedAt] DATETIME2,
    [respondedAt] DATETIME2,
    [version] INT NOT NULL CONSTRAINT [BDProposal_version_df] DEFAULT 1,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDProposal_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BDProposal_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: BDNote
CREATE TABLE [dbo].[BDNote] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opportunityId] INT NOT NULL,
    [content] NVARCHAR(MAX) NOT NULL,
    [isPrivate] BIT NOT NULL CONSTRAINT [BDNote_isPrivate_df] DEFAULT 0,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BDNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDStage_serviceLine_idx] ON [dbo].[BDStage]([serviceLine]);
CREATE NONCLUSTERED INDEX [BDStage_order_idx] ON [dbo].[BDStage]([order]);
CREATE NONCLUSTERED INDEX [BDStage_isActive_idx] ON [dbo].[BDStage]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDContact_companyName_idx] ON [dbo].[BDContact]([companyName]);
CREATE NONCLUSTERED INDEX [BDContact_email_idx] ON [dbo].[BDContact]([email]);
CREATE NONCLUSTERED INDEX [BDContact_createdAt_idx] ON [dbo].[BDContact]([createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDOpportunity_serviceLine_idx] ON [dbo].[BDOpportunity]([serviceLine]);
CREATE NONCLUSTERED INDEX [BDOpportunity_stageId_idx] ON [dbo].[BDOpportunity]([stageId]);
CREATE NONCLUSTERED INDEX [BDOpportunity_status_idx] ON [dbo].[BDOpportunity]([status]);
CREATE NONCLUSTERED INDEX [BDOpportunity_assignedTo_idx] ON [dbo].[BDOpportunity]([assignedTo]);
CREATE NONCLUSTERED INDEX [BDOpportunity_convertedToClientId_idx] ON [dbo].[BDOpportunity]([convertedToClientId]);
CREATE NONCLUSTERED INDEX [BDOpportunity_expectedCloseDate_idx] ON [dbo].[BDOpportunity]([expectedCloseDate]);
CREATE NONCLUSTERED INDEX [BDOpportunity_serviceLine_status_idx] ON [dbo].[BDOpportunity]([serviceLine], [status]);
CREATE NONCLUSTERED INDEX [BDOpportunity_assignedTo_status_idx] ON [dbo].[BDOpportunity]([assignedTo], [status]);
CREATE NONCLUSTERED INDEX [BDOpportunity_createdAt_idx] ON [dbo].[BDOpportunity]([createdAt] DESC);
CREATE NONCLUSTERED INDEX [BDOpportunity_updatedAt_idx] ON [dbo].[BDOpportunity]([updatedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDActivity_opportunityId_idx] ON [dbo].[BDActivity]([opportunityId]);
CREATE NONCLUSTERED INDEX [BDActivity_contactId_idx] ON [dbo].[BDActivity]([contactId]);
CREATE NONCLUSTERED INDEX [BDActivity_activityType_idx] ON [dbo].[BDActivity]([activityType]);
CREATE NONCLUSTERED INDEX [BDActivity_status_idx] ON [dbo].[BDActivity]([status]);
CREATE NONCLUSTERED INDEX [BDActivity_assignedTo_idx] ON [dbo].[BDActivity]([assignedTo]);
CREATE NONCLUSTERED INDEX [BDActivity_dueDate_idx] ON [dbo].[BDActivity]([dueDate]);
CREATE NONCLUSTERED INDEX [BDActivity_assignedTo_status_dueDate_idx] ON [dbo].[BDActivity]([assignedTo], [status], [dueDate]);
CREATE NONCLUSTERED INDEX [BDActivity_opportunityId_createdAt_idx] ON [dbo].[BDActivity]([opportunityId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDProposal_opportunityId_idx] ON [dbo].[BDProposal]([opportunityId]);
CREATE NONCLUSTERED INDEX [BDProposal_status_idx] ON [dbo].[BDProposal]([status]);
CREATE NONCLUSTERED INDEX [BDProposal_sentAt_idx] ON [dbo].[BDProposal]([sentAt]);
CREATE NONCLUSTERED INDEX [BDProposal_opportunityId_version_idx] ON [dbo].[BDProposal]([opportunityId], [version]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDNote_opportunityId_idx] ON [dbo].[BDNote]([opportunityId]);
CREATE NONCLUSTERED INDEX [BDNote_createdAt_idx] ON [dbo].[BDNote]([createdAt] DESC);

-- AddForeignKey
ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[BDContact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_stageId_fkey] FOREIGN KEY ([stageId]) REFERENCES [dbo].[BDStage]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BDActivity] ADD CONSTRAINT [BDActivity_opportunityId_fkey] FOREIGN KEY ([opportunityId]) REFERENCES [dbo].[BDOpportunity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[BDActivity] ADD CONSTRAINT [BDActivity_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[BDContact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BDProposal] ADD CONSTRAINT [BDProposal_opportunityId_fkey] FOREIGN KEY ([opportunityId]) REFERENCES [dbo].[BDOpportunity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BDNote] ADD CONSTRAINT [BDNote_opportunityId_fkey] FOREIGN KEY ([opportunityId]) REFERENCES [dbo].[BDOpportunity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

