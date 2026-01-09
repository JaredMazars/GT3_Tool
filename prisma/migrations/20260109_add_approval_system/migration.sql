-- CreateTable: Approval
CREATE TABLE [dbo].[Approval] (
    [id] INT NOT NULL IDENTITY(1,1),
    [workflowType] VARCHAR(50) NOT NULL,
    [workflowId] INT NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [priority] VARCHAR(20) NOT NULL CONSTRAINT [DF_Approval_priority] DEFAULT 'MEDIUM',
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [requestedById] NVARCHAR(1000) NOT NULL,
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Approval_requestedAt] DEFAULT CURRENT_TIMESTAMP,
    [currentStepId] INT,
    [requiresAllSteps] BIT NOT NULL CONSTRAINT [DF_Approval_requiresAllSteps] DEFAULT 0,
    [completedAt] DATETIME2,
    [completedById] NVARCHAR(1000),
    [resolutionComment] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_Approval_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_Approval] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_Approval_RequestedBy] FOREIGN KEY ([requestedById]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION,
    CONSTRAINT [FK_Approval_CompletedBy] FOREIGN KEY ([completedById]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approval_workflowType_idx] ON [dbo].[Approval]([workflowType]);
CREATE NONCLUSTERED INDEX [Approval_status_idx] ON [dbo].[Approval]([status]);
CREATE NONCLUSTERED INDEX [Approval_requestedById_idx] ON [dbo].[Approval]([requestedById]);
CREATE NONCLUSTERED INDEX [Approval_workflowType_workflowId_idx] ON [dbo].[Approval]([workflowType], [workflowId]);

-- CreateTable: ApprovalStep
CREATE TABLE [dbo].[ApprovalStep] (
    [id] INT NOT NULL IDENTITY(1,1),
    [approvalId] INT NOT NULL,
    [stepOrder] INT NOT NULL,
    [stepType] VARCHAR(50) NOT NULL,
    [isRequired] BIT NOT NULL CONSTRAINT [DF_ApprovalStep_isRequired] DEFAULT 1,
    [assignedToUserId] NVARCHAR(1000),
    [assignedToRole] VARCHAR(50),
    [assignedToCondition] NVARCHAR(max),
    [status] VARCHAR(20) NOT NULL CONSTRAINT [DF_ApprovalStep_status] DEFAULT 'PENDING',
    [approvedAt] DATETIME2,
    [approvedById] NVARCHAR(1000),
    [comment] NVARCHAR(max),
    [isDelegated] BIT NOT NULL CONSTRAINT [DF_ApprovalStep_isDelegated] DEFAULT 0,
    [delegatedToUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ApprovalStep_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_ApprovalStep] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_ApprovalStep_Approval] FOREIGN KEY ([approvalId]) REFERENCES [dbo].[Approval]([id]) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT [FK_ApprovalStep_AssignedTo] FOREIGN KEY ([assignedToUserId]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT [FK_ApprovalStep_ApprovedBy] FOREIGN KEY ([approvedById]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT [FK_ApprovalStep_DelegatedTo] FOREIGN KEY ([delegatedToUserId]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalStep_approvalId_idx] ON [dbo].[ApprovalStep]([approvalId]);
CREATE NONCLUSTERED INDEX [ApprovalStep_assignedToUserId_idx] ON [dbo].[ApprovalStep]([assignedToUserId]);
CREATE NONCLUSTERED INDEX [ApprovalStep_status_idx] ON [dbo].[ApprovalStep]([status]);
CREATE NONCLUSTERED INDEX [ApprovalStep_approvalId_stepOrder_idx] ON [dbo].[ApprovalStep]([approvalId], [stepOrder]);

-- CreateTable: ApprovalRoute
CREATE TABLE [dbo].[ApprovalRoute] (
    [id] INT NOT NULL IDENTITY(1,1),
    [workflowType] VARCHAR(50) NOT NULL,
    [routeName] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [routeConfig] NVARCHAR(max) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [DF_ApprovalRoute_isActive] DEFAULT 1,
    [isDefault] BIT NOT NULL CONSTRAINT [DF_ApprovalRoute_isDefault] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ApprovalRoute_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_ApprovalRoute] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_ApprovalRoute_workflowType_routeName] UNIQUE ([workflowType], [routeName])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalRoute_workflowType_isDefault_idx] ON [dbo].[ApprovalRoute]([workflowType], [isDefault]);

-- CreateTable: ApprovalDelegation
CREATE TABLE [dbo].[ApprovalDelegation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [fromUserId] NVARCHAR(1000) NOT NULL,
    [toUserId] NVARCHAR(1000) NOT NULL,
    [workflowType] VARCHAR(50),
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2,
    [reason] NVARCHAR(500),
    [isActive] BIT NOT NULL CONSTRAINT [DF_ApprovalDelegation_isActive] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ApprovalDelegation_createdAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ApprovalDelegation] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_ApprovalDelegation_From] FOREIGN KEY ([fromUserId]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION,
    CONSTRAINT [FK_ApprovalDelegation_To] FOREIGN KEY ([toUserId]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalDelegation_fromUserId_idx] ON [dbo].[ApprovalDelegation]([fromUserId]);
CREATE NONCLUSTERED INDEX [ApprovalDelegation_isActive_endDate_idx] ON [dbo].[ApprovalDelegation]([isActive], [endDate]);
CREATE NONCLUSTERED INDEX [ApprovalDelegation_fromUserId_isActive_idx] ON [dbo].[ApprovalDelegation]([fromUserId], [isActive]);
-- Add approvalId to ClientPartnerManagerChangeRequest table
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest]
ADD [approvalId] INT NULL;

-- Add foreign key constraint
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest]
ADD CONSTRAINT [FK_ChangeRequest_Approval] 
    FOREIGN KEY ([approvalId]) REFERENCES [dbo].[Approval]([id]) 
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Add index
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_approvalId_idx] 
ON [dbo].[ClientPartnerManagerChangeRequest]([approvalId]);
