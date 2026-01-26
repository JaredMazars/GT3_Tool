BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[AcceptanceAnswer] (
    [id] INT NOT NULL IDENTITY(1,1),
    [responseId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [answer] NVARCHAR(max),
    [comment] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceAnswer_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceAnswer_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Acceptan__3213E83F4AB0FF4B] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AcceptanceAnswer_responseId_questionId_key] UNIQUE NONCLUSTERED ([responseId],[questionId])
);

-- CreateTable
CREATE TABLE [dbo].[AcceptanceDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [responseId] INT NOT NULL,
    [documentType] NVARCHAR(50) NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(200) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceDocument_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Acceptan__3213E83FEBEE39E6] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AcceptanceQuestion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [questionnaireType] NVARCHAR(50) NOT NULL,
    [sectionKey] NVARCHAR(100) NOT NULL,
    [questionKey] NVARCHAR(100) NOT NULL,
    [questionText] NVARCHAR(max) NOT NULL,
    [description] NVARCHAR(max),
    [fieldType] NVARCHAR(50) NOT NULL,
    [options] NVARCHAR(max),
    [required] BIT NOT NULL CONSTRAINT [AcceptanceQuestion_required_df] DEFAULT 1,
    [order] INT NOT NULL,
    [riskWeight] FLOAT(53) NOT NULL CONSTRAINT [AcceptanceQuestion_riskWeight_df] DEFAULT 1.0,
    [highRiskAnswers] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceQuestion_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceQuestion_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Acceptan__3213E83FB3075BED] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AcceptanceQuestion_questionnaireType_questionKey_key] UNIQUE NONCLUSTERED ([questionnaireType],[questionKey])
);

-- CreateTable
CREATE TABLE [dbo].[Account] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [providerAccountId] NVARCHAR(1000) NOT NULL,
    [refresh_token] NVARCHAR(1000),
    [access_token] NVARCHAR(1000),
    [expires_at] INT,
    [token_type] NVARCHAR(1000),
    [scope] NVARCHAR(1000),
    [id_token] NVARCHAR(1000),
    [session_state] NVARCHAR(1000),
    CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Account_provider_providerAccountId_key] UNIQUE NONCLUSTERED ([provider],[providerAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[Accounts] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSAccountID] UNIQUEIDENTIFIER NOT NULL,
    [Account] NVARCHAR(30) NOT NULL,
    [AccDesc] NVARCHAR(255) NOT NULL,
    [DescriptionSub] NVARCHAR(255),
    [Category] NVARCHAR(30) NOT NULL,
    [CatDesc] NVARCHAR(128),
    [BS] BIT NOT NULL,
    [AccStatus] NVARCHAR(50),
    [AccLevel] NVARCHAR(1),
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [OfficeDesc] NVARCHAR(100) NOT NULL,
    CONSTRAINT [Accounts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Accounts_GSAccountID_key] UNIQUE NONCLUSTERED ([GSAccountID])
);

-- CreateTable
CREATE TABLE [dbo].[AdjustmentDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [taxAdjustmentId] INT,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileType] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [uploadedBy] NVARCHAR(1000),
    [extractionStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [AdjustmentDocument_extractionStatus_df] DEFAULT 'PENDING',
    [extractedData] NVARCHAR(1000),
    [extractionError] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdjustmentDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AdjustmentDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AITaxReport] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [executiveSummary] NVARCHAR(max) NOT NULL,
    [risks] NVARCHAR(max) NOT NULL,
    [taxSensitiveItems] NVARCHAR(max) NOT NULL,
    [detailedFindings] NVARCHAR(max) NOT NULL,
    [recommendations] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AITaxReport_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AITaxReport_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
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
    CONSTRAINT [PK_Approval] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
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
    CONSTRAINT [PK_ApprovalDelegation] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
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
    CONSTRAINT [PK_ApprovalRoute] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_ApprovalRoute_workflowType_routeName] UNIQUE NONCLUSTERED ([workflowType],[routeName])
);

-- CreateTable
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
    CONSTRAINT [PK_ApprovalStep] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BDActivity] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opportunityId] INT NOT NULL,
    [contactId] INT,
    [activityType] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
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

-- CreateTable
CREATE TABLE [dbo].[BDContact] (
    [id] INT NOT NULL IDENTITY(1,1),
    [companyName] NVARCHAR(1000),
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
    [notes] NVARCHAR(max),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDContact_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BDContact_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BDNote] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opportunityId] INT NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [isPrivate] BIT NOT NULL CONSTRAINT [BDNote_isPrivate_df] DEFAULT 0,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BDNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BDOpportunity] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [companyName] NVARCHAR(1000),
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
    [clientId] INT,
    CONSTRAINT [BDOpportunity_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BDProposal] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opportunityId] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
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

-- CreateTable
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
    CONSTRAINT [BDStage_serviceLine_name_key] UNIQUE NONCLUSTERED ([serviceLine],[name])
);

-- CreateTable
CREATE TABLE [dbo].[BugReport] (
    [id] INT NOT NULL IDENTITY(1,1),
    [reportedBy] NVARCHAR(1000) NOT NULL,
    [reportedAt] DATETIME2 NOT NULL CONSTRAINT [BugReport_reportedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [url] NVARCHAR(500) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [screenshotPath] NVARCHAR(500),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [BugReport_status_df] DEFAULT 'OPEN',
    [testedAt] DATETIME2,
    [testedBy] NVARCHAR(1000),
    [resolvedAt] DATETIME2,
    [resolvedBy] NVARCHAR(1000),
    [resolutionNotes] NVARCHAR(max),
    [priority] NVARCHAR(20) NOT NULL CONSTRAINT [BugReport_priority_df] DEFAULT 'MEDIUM',
    CONSTRAINT [BugReport_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CategoryApprover] (
    [id] INT NOT NULL IDENTITY(1,1),
    [categoryId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [stepOrder] INT NOT NULL CONSTRAINT [DF__CategoryA__stepO__01] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__CategoryA__creat__02] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [PK_CategoryApprover] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_CategoryApprover_CategoryId_UserId] UNIQUE NONCLUSTERED ([categoryId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[Client] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientCode] NVARCHAR(10) NOT NULL,
    [clientNameFull] NVARCHAR(255),
    [groupCode] NVARCHAR(10) NOT NULL,
    [groupDesc] NVARCHAR(150) NOT NULL,
    [clientPartner] NVARCHAR(10) NOT NULL,
    [clientManager] NVARCHAR(10) NOT NULL,
    [clientIncharge] NVARCHAR(10) NOT NULL,
    [active] VARCHAR(3) NOT NULL,
    [clientDateOpen] DATETIME2,
    [clientDateTerminate] DATETIME2,
    [industry] NVARCHAR(255),
    [sector] NVARCHAR(255),
    [forvisMazarsIndustry] NVARCHAR(255),
    [forvisMazarsSector] NVARCHAR(255),
    [forvisMazarsSubsector] NVARCHAR(255),
    [clientOCFlag] BIT NOT NULL,
    [clientTaxFlag] BIT,
    [clientSecFlag] BIT,
    [creditor] BIT,
    [rolePlayer] BIT NOT NULL,
    [typeCode] NVARCHAR(10) NOT NULL,
    [typeDesc] NVARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Client_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [Client_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Client_clientCode_key] UNIQUE NONCLUSTERED ([clientCode]),
    CONSTRAINT [Client_GSClientID_key] UNIQUE NONCLUSTERED ([GSClientID])
);

-- CreateTable
CREATE TABLE [dbo].[ClientAcceptance] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientId] INT NOT NULL,
    [riskRating] NVARCHAR(20),
    [overallRiskScore] FLOAT(53),
    [riskSummary] NVARCHAR(max),
    [completedAt] DATETIME2,
    [completedBy] NVARCHAR(200),
    [approvedAt] DATETIME2,
    [approvedBy] NVARCHAR(200),
    [approvalId] INT,
    [validUntil] DATETIME2,
    [lastReviewedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptance_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptance_updatedAt] DEFAULT CURRENT_TIMESTAMP,
    [userId] NVARCHAR(1000),
    [researchData] NVARCHAR(max),
    [researchedAt] DATETIME2,
    [researchCompleted] BIT NOT NULL CONSTRAINT [ClientAcceptance_researchCompleted_df] DEFAULT 0,
    [researchSkipped] BIT NOT NULL CONSTRAINT [ClientAcceptance_researchSkipped_df] DEFAULT 0,
    [pendingInchargeCode] NVARCHAR(10),
    [pendingManagerCode] NVARCHAR(10),
    [pendingPartnerCode] NVARCHAR(10),
    [teamChangesApplied] BIT NOT NULL CONSTRAINT [ClientAcceptance_teamChangesApplied_df] DEFAULT 0,
    [teamChangesAppliedAt] DATETIME2,
    CONSTRAINT [PK__ClientAc__3213E83F94B62F26] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClientAcceptance_clientId_key] UNIQUE NONCLUSTERED ([clientId])
);

-- CreateTable
CREATE TABLE [dbo].[ClientAcceptanceAnswer] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientAcceptanceId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [answer] NVARCHAR(max),
    [comment] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptanceAnswer_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptanceAnswer_updatedAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__ClientAc__3213E83F4AB0FF4C] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClientAcceptanceAnswer_clientAcceptanceId_questionId_key] UNIQUE NONCLUSTERED ([clientAcceptanceId],[questionId])
);

-- CreateTable
CREATE TABLE [dbo].[ClientAcceptanceResponse] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [clientId] INT NOT NULL,
    [questionnaireType] NVARCHAR(50) NOT NULL,
    [overallRiskScore] FLOAT(53),
    [riskRating] NVARCHAR(20),
    [riskSummary] NVARCHAR(max),
    [completedAt] DATETIME2,
    [completedBy] NVARCHAR(200),
    [reviewedBy] NVARCHAR(200),
    [reviewedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientAcceptanceResponse_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ClientAcceptanceResponse_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__ClientAc__3213E83F94B62F25] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientAnalyticsDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientId] INT NOT NULL,
    [documentType] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [ClientAnalyticsDocument_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [extractedData] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientAnalyticsDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClientAnalyticsDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientCreditRating] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientId] INT NOT NULL,
    [ratingScore] FLOAT(53) NOT NULL,
    [ratingGrade] NVARCHAR(1000) NOT NULL,
    [ratingDate] DATETIME2 NOT NULL CONSTRAINT [ClientCreditRating_ratingDate_df] DEFAULT CURRENT_TIMESTAMP,
    [analysisReport] NVARCHAR(max) NOT NULL,
    [financialRatios] NVARCHAR(max) NOT NULL,
    [confidence] FLOAT(53) NOT NULL,
    [analyzedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientCreditRating_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClientCreditRating_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClientPartnerManagerChangeRequest] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientId] INT NOT NULL,
    [changeType] VARCHAR(20) NOT NULL,
    [currentEmployeeCode] NVARCHAR(10) NOT NULL,
    [currentEmployeeName] NVARCHAR(100),
    [proposedEmployeeCode] NVARCHAR(10) NOT NULL,
    [proposedEmployeeName] NVARCHAR(100),
    [reason] NVARCHAR(500),
    [status] VARCHAR(20) NOT NULL,
    [requestedById] NVARCHAR(1000) NOT NULL,
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientPartnerManagerChangeRequest_requestedAt] DEFAULT CURRENT_TIMESTAMP,
    [resolvedById] NVARCHAR(1000),
    [resolvedAt] DATETIME2,
    [resolutionComment] NVARCHAR(500),
    [requiresDualApproval] BIT NOT NULL CONSTRAINT [DF_ClientPartnerManagerChangeRequest_requiresDualApproval] DEFAULT 0,
    [currentEmployeeApprovedAt] DATETIME2,
    [currentEmployeeApprovedById] NVARCHAR(1000),
    [proposedEmployeeApprovedAt] DATETIME2,
    [proposedEmployeeApprovedById] NVARCHAR(1000),
    [approvalId] INT,
    CONSTRAINT [PK_ClientPartnerManagerChangeRequest] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ComplianceChecklist] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
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
    CONSTRAINT [ComplianceChecklist_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Creditors] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSTranID] UNIQUEIDENTIFIER NOT NULL,
    [GSTaskID] UNIQUEIDENTIFIER,
    [GSDisbID] UNIQUEIDENTIFIER,
    [GSMatchID] UNIQUEIDENTIFIER,
    [TranType] VARCHAR(3) NOT NULL,
    [BatchNumber] NVARCHAR(20),
    [InvNumber] NVARCHAR(20) NOT NULL,
    [TranDate] DATETIME2 NOT NULL,
    [MatchDate] DATETIME2 NOT NULL,
    [CreditorCode] NVARCHAR(10) NOT NULL,
    [CreditorControl] NVARCHAR(30),
    [OfficeCode] NVARCHAR(10),
    [ClntDisb] INT NOT NULL,
    [Account] NVARCHAR(30),
    [AccDesc] NVARCHAR(255),
    [InvAmount] MONEY,
    [InvVatAmount] MONEY,
    [InvTotal] MONEY,
    [InvNarr] TEXT,
    [MatchNr] NVARCHAR(20) NOT NULL,
    CONSTRAINT [Creditors_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Creditors_GSTranID_key] UNIQUE NONCLUSTERED ([GSTranID])
);

-- CreateTable
CREATE TABLE [dbo].[CreditRatingDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [creditRatingId] INT NOT NULL,
    [analyticsDocumentId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CreditRatingDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CreditRatingDocument_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CreditRatingDocument_creditRatingId_analyticsDocumentId_key] UNIQUE NONCLUSTERED ([creditRatingId],[analyticsDocumentId])
);

-- CreateTable
CREATE TABLE [dbo].[Debtors] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    [PeriodRef] INT,
    [PeriodStart] DATETIME2,
    [PeriodEnd] DATETIME2,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [Biller] NVARCHAR(10) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [LTDInv] MONEY,
    [LTDFee] MONEY,
    [LTDVat] MONEY,
    [LTDCn] MONEY,
    [LTDRec] MONEY,
    [LTDInt] MONEY,
    [LTDPLFC] MONEY,
    [YTDInv] MONEY,
    [YTDFee] MONEY,
    [YTDVat] MONEY,
    [YTDCn] MONEY,
    [YTDRec] MONEY,
    [YTDInt] MONEY,
    [YTDPLFC] MONEY,
    [PTDInv] MONEY,
    [PTDFee] MONEY,
    [PTDVat] MONEY,
    [PTDCn] MONEY,
    [PTDRec] MONEY,
    [PTDInt] MONEY,
    [PTDPLFC] MONEY,
    [CBal] MONEY,
    [BalCurr] MONEY,
    [Bal30] MONEY,
    [Bal60] MONEY,
    [Bal90] MONEY,
    [Bal120] MONEY,
    [Bal150] MONEY,
    [Bal180] MONEY,
    [DebtorProvision] MONEY,
    [PTDDebtorProvision] MONEY,
    [YTDDebtorProvision] MONEY,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_Debtors_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Debtors_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DrsTransactions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSDebtorsTranID] UNIQUEIDENTIFIER NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [ClientNameFull] NVARCHAR(222),
    [GroupCode] NVARCHAR(10) NOT NULL,
    [GroupDesc] NVARCHAR(150) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [OfficeDesc] NVARCHAR(100) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [ServLineDesc] NVARCHAR(150) NOT NULL,
    [Biller] NVARCHAR(10) NOT NULL,
    [BillerName] NVARCHAR(50) NOT NULL,
    [TranDate] DATETIME2 NOT NULL,
    [EntryType] VARCHAR(19),
    [Ordinal] INT,
    [Reference] NVARCHAR(20),
    [InvNumber] NVARCHAR(20),
    [Amount] MONEY,
    [Vat] MONEY,
    [Total] MONEY,
    [Batch] NVARCHAR(10),
    [Allocation] NVARCHAR(20) NOT NULL,
    [Narration] TEXT,
    [VatCode] NVARCHAR(2),
    [PeriodKey] INT NOT NULL,
    [EntryGroupCode] NVARCHAR(10),
    [EntryGroup] NVARCHAR(50),
    [DRAccount] NVARCHAR(30),
    [CRAccount] NVARCHAR(30),
    [ClientPartner] NVARCHAR(10) NOT NULL,
    [ClientPartnerName] NVARCHAR(50) NOT NULL,
    [ClientManager] NVARCHAR(10) NOT NULL,
    [ClientManagerName] NVARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DrsTransactions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DrsTransactions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DrsTransactions_GSDebtorsTranID_key] UNIQUE NONCLUSTERED ([GSDebtorsTranID])
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
    [metadata] NVARCHAR(max),
    [sentAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EmailLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Employee] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSEmployeeID] UNIQUEIDENTIFIER NOT NULL,
    [EmpCode] NVARCHAR(10) NOT NULL,
    [EmpName] NVARCHAR(50) NOT NULL,
    [EmpNameFull] NVARCHAR(63) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [SLGroup] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [ServLineDesc] NVARCHAR(150) NOT NULL,
    [SubServLineCode] NVARCHAR(10) NOT NULL,
    [SubServLineDesc] NVARCHAR(50) NOT NULL,
    [EmpCatCode] NVARCHAR(5) NOT NULL,
    [EmpCatDesc] NVARCHAR(50) NOT NULL,
    [EmpCatType] NVARCHAR(1),
    [RateValue] MONEY NOT NULL,
    [EmpDateLeft] DATETIME2,
    [Active] VARCHAR(3) NOT NULL,
    [EmpDateStarted] DATETIME2,
    [Team] NVARCHAR(100),
    [WinLogon] NVARCHAR(100),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__Employee__create__15C52FC4] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Employee_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Employee_GSEmployeeID_key] UNIQUE NONCLUSTERED ([GSEmployeeID])
);

-- CreateTable
CREATE TABLE [dbo].[ExternalLink] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [url] NVARCHAR(500) NOT NULL,
    [icon] NVARCHAR(50) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [ExternalLink_active_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [ExternalLink_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExternalLink_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExternalLink_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FilingStatus] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
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
    CONSTRAINT [FilingStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FiscalPeriod] (
    [id] INT NOT NULL IDENTITY(1,1),
    [periodKey] INT NOT NULL,
    [fiscalYear] INT NOT NULL,
    [fiscalQuarter] INT NOT NULL,
    [fiscalMonth] INT NOT NULL,
    [calendarMonth] INT NOT NULL,
    [calendarYear] INT NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [periodName] NVARCHAR(50) NOT NULL,
    [quarterName] NVARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_FiscalPeriod_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_FiscalPeriod] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_FiscalPeriod_periodKey] UNIQUE NONCLUSTERED ([periodKey])
);

-- CreateTable
CREATE TABLE [dbo].[GL] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSEntryID] UNIQUEIDENTIFIER NOT NULL,
    [GSAccountID] UNIQUEIDENTIFIER NOT NULL,
    [Account] NVARCHAR(30) NOT NULL,
    [AccDesc] NVARCHAR(255) NOT NULL,
    [DescriptionSub] NVARCHAR(255),
    [SourceBatch] NVARCHAR(50),
    [EntryDate] DATETIME2,
    [DatePosted] DATETIME2,
    [Reference] NVARCHAR(20),
    [Amount] MONEY,
    [Debit] MONEY,
    [Credit] MONEY,
    [Category] NVARCHAR(30) NOT NULL,
    [CatDesc] NVARCHAR(128),
    [BS] BIT NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [OfficeDesc] NVARCHAR(100) NOT NULL,
    [Narration] NVARCHAR(255),
    [EntryGroup] UNIQUEIDENTIFIER,
    [EntryTypeCode] NVARCHAR(3) NOT NULL,
    [EntryGroupCode] NVARCHAR(10) NOT NULL,
    [EntryGroupDesc] NVARCHAR(50),
    [AccStatus] NVARCHAR(50),
    CONSTRAINT [GL_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [GL_GSEntryID_key] UNIQUE NONCLUSTERED ([GSEntryID])
);

-- CreateTable
CREATE TABLE [dbo].[GLBudgets] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSBudgetID] UNIQUEIDENTIFIER NOT NULL,
    [GSBudgetTypeID] UNIQUEIDENTIFIER NOT NULL,
    [GSAccountID] UNIQUEIDENTIFIER NOT NULL,
    [BudgetCode] NVARCHAR(10) NOT NULL,
    [PeriodYear] INT NOT NULL,
    [PeriodNumber] INT NOT NULL,
    [BudgetAmount] FLOAT(53),
    CONSTRAINT [GLBudgets_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [GLBudgets_GSBudgetID_key] UNIQUE NONCLUSTERED ([GSBudgetID])
);

-- CreateTable
CREATE TABLE [dbo].[GS_Stg_TSChargeable] (
    [TSID] UNIQUEIDENTIFIER NOT NULL,
    [TSDate] DATETIME NOT NULL,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [TaskCode] NVARCHAR(10) NOT NULL,
    [TaskID] UNIQUEIDENTIFIER NOT NULL,
    [EmpCode] NVARCHAR(10) NOT NULL,
    [EmpID] UNIQUEIDENTIFIER NOT NULL,
    [ActCode] NVARCHAR(10) NOT NULL,
    [ActID] UNIQUEIDENTIFIER NOT NULL,
    [RateCode] NVARCHAR(2) NOT NULL,
    [RateValue] MONEY NOT NULL,
    [TSHour] MONEY NOT NULL,
    [TSValue] MONEY NOT NULL,
    [TSCost] MONEY NOT NULL,
    [TSNarr] NVARCHAR(4000),
    [LastUpdated] DATETIME CONSTRAINT [DF_GS_Stg_TSChargeable_LastUpdated] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_GS_Stg_TSChargeable] PRIMARY KEY CLUSTERED ([TSID])
);

-- CreateTable
CREATE TABLE [dbo].[GS_TSChargeable] (
    [TSID] UNIQUEIDENTIFIER NOT NULL,
    [TSDate] DATETIME NOT NULL,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [TaskCode] NVARCHAR(10) NOT NULL,
    [TaskID] UNIQUEIDENTIFIER NOT NULL,
    [EmpCode] NVARCHAR(10) NOT NULL,
    [EmpID] UNIQUEIDENTIFIER NOT NULL,
    [ActCode] NVARCHAR(10) NOT NULL,
    [ActID] UNIQUEIDENTIFIER NOT NULL,
    [RateCode] NVARCHAR(2) NOT NULL,
    [RateValue] MONEY NOT NULL,
    [TSHour] MONEY NOT NULL,
    [TSValue] MONEY NOT NULL,
    [TSCost] MONEY NOT NULL,
    [TSNarr] NVARCHAR(4000),
    [LastUpdated] DATETIME CONSTRAINT [DF_GS_TSChargeable_LastUpdated] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_GS_TSChargeable] PRIMARY KEY CLUSTERED ([TSID])
);

-- CreateTable
CREATE TABLE [dbo].[InAppNotification] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] NVARCHAR(1000) NOT NULL,
    [taskId] INT,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(max) NOT NULL,
    [actionUrl] NVARCHAR(1000),
    [isRead] BIT NOT NULL CONSTRAINT [InAppNotification_isRead_df] DEFAULT 0,
    [readAt] DATETIME2,
    [metadata] NVARCHAR(max),
    [fromUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InAppNotification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InAppNotification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LeaderGroup] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [createdById] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LeaderGroup_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [type] NVARCHAR(20) NOT NULL CONSTRAINT [LeaderGroup_type_df] DEFAULT 'GROUP',
    CONSTRAINT [LeaderGroup_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [LeaderGroup_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[LeaderGroupMember] (
    [id] INT NOT NULL IDENTITY(1,1),
    [leaderGroupId] INT NOT NULL,
    [employeeId] INT NOT NULL,
    [addedById] NVARCHAR(1000) NOT NULL,
    [addedAt] DATETIME2 NOT NULL CONSTRAINT [LeaderGroupMember_addedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LeaderGroupMember_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [LeaderGroupMember_leaderGroupId_employeeId_key] UNIQUE NONCLUSTERED ([leaderGroupId],[employeeId])
);

-- CreateTable
CREATE TABLE [dbo].[LegalPrecedent] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
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
    CONSTRAINT [LegalPrecedent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MappedAccount] (
    [id] INT NOT NULL IDENTITY(1,1),
    [accountCode] NVARCHAR(1000) NOT NULL,
    [accountName] NVARCHAR(1000) NOT NULL,
    [section] NVARCHAR(1000) NOT NULL,
    [subsection] NVARCHAR(1000) NOT NULL,
    [balance] FLOAT(53) NOT NULL,
    [priorYearBalance] FLOAT(53) NOT NULL CONSTRAINT [MappedAccount_priorYearBalance_df] DEFAULT 0,
    [sarsItem] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MappedAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [taskId] INT NOT NULL,
    CONSTRAINT [MappedAccount_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NewsBulletin] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(255) NOT NULL,
    [summary] NVARCHAR(500) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [category] NVARCHAR(50) NOT NULL,
    [serviceLine] NVARCHAR(50),
    [effectiveDate] DATETIME2 NOT NULL,
    [expiresAt] DATETIME2,
    [contactPerson] NVARCHAR(255),
    [actionRequired] BIT NOT NULL CONSTRAINT [NewsBulletin_actionRequired_df] DEFAULT 0,
    [callToActionUrl] NVARCHAR(500),
    [callToActionText] NVARCHAR(100),
    [isPinned] BIT NOT NULL CONSTRAINT [NewsBulletin_isPinned_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [NewsBulletin_isActive_df] DEFAULT 1,
    [createdById] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NewsBulletin_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [documentFileName] NVARCHAR(255),
    [documentFilePath] NVARCHAR(500),
    [documentFileSize] INT,
    [documentUploadedAt] DATETIME2,
    [showDocumentLink] BIT NOT NULL CONSTRAINT [NewsBulletin_showDocumentLink_df] DEFAULT 0,
    CONSTRAINT [NewsBulletin_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NonClientAllocation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [eventType] NVARCHAR(50) NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [allocatedHours] DECIMAL(10,2) NOT NULL,
    [allocatedPercentage] INT NOT NULL CONSTRAINT [NonClientAllocation_allocatedPercentage_df] DEFAULT 100,
    [notes] NVARCHAR(max),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NonClientAllocation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [employeeId] INT NOT NULL,
    CONSTRAINT [NonClientAllocation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NotificationPreference] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] NVARCHAR(1000) NOT NULL,
    [taskId] INT,
    [notificationType] NVARCHAR(1000) NOT NULL,
    [emailEnabled] BIT NOT NULL CONSTRAINT [NotificationPreference_emailEnabled_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NotificationPreference_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [NotificationPreference_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NotificationPreference_userId_taskId_notificationType_key] UNIQUE NONCLUSTERED ([userId],[taskId],[notificationType])
);

-- CreateTable
CREATE TABLE [dbo].[OpinionChatMessage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opinionDraftId] INT NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [metadata] NVARCHAR(max),
    [sectionGenerationId] NVARCHAR(1000),
    [sectionType] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionChatMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OpinionChatMessage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OpinionDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opinionDraftId] INT NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileType] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [extractedText] NVARCHAR(max),
    [vectorized] BIT NOT NULL CONSTRAINT [OpinionDocument_vectorized_df] DEFAULT 0,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OpinionDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OpinionDraft] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [version] INT NOT NULL CONSTRAINT [OpinionDraft_version_df] DEFAULT 1,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [OpinionDraft_status_df] DEFAULT 'DRAFT',
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionDraft_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [OpinionDraft_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OpinionSection] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opinionDraftId] INT NOT NULL,
    [sectionType] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [aiGenerated] BIT NOT NULL CONSTRAINT [OpinionSection_aiGenerated_df] DEFAULT 0,
    [reviewed] BIT NOT NULL CONSTRAINT [OpinionSection_reviewed_df] DEFAULT 0,
    [reviewedBy] NVARCHAR(1000),
    [reviewedAt] DATETIME2,
    [order] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionSection_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [OpinionSection_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PagePermission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [pathname] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [accessLevel] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [active] BIT NOT NULL CONSTRAINT [PagePermission_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PagePermission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [createdBy] NVARCHAR(1000),
    CONSTRAINT [PagePermission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PagePermission_pathname_role_key] UNIQUE NONCLUSTERED ([pathname],[role])
);

-- CreateTable
CREATE TABLE [dbo].[PageRegistry] (
    [id] INT NOT NULL IDENTITY(1,1),
    [pathname] NVARCHAR(1000) NOT NULL,
    [pageTitle] NVARCHAR(1000),
    [category] NVARCHAR(1000),
    [discovered] BIT NOT NULL CONSTRAINT [PageRegistry_discovered_df] DEFAULT 1,
    [active] BIT NOT NULL CONSTRAINT [PageRegistry_active_df] DEFAULT 1,
    [lastSeen] DATETIME2 NOT NULL CONSTRAINT [PageRegistry_lastSeen_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PageRegistry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PageRegistry_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PageRegistry_pathname_key] UNIQUE NONCLUSTERED ([pathname])
);

-- CreateTable
CREATE TABLE [dbo].[ResearchNote] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [tags] NVARCHAR(1000),
    [category] NVARCHAR(1000),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ResearchNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ResearchNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ReviewCategory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [serviceLine] NVARCHAR(50),
    [active] BIT NOT NULL CONSTRAINT [ReviewCategory_active_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [ReviewCategory_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReviewCategory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ReviewCategory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ReviewNote] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [referenceUrl] NVARCHAR(1000),
    [referenceType] NVARCHAR(20) NOT NULL CONSTRAINT [ReviewNote_referenceType_df] DEFAULT 'EXTERNAL',
    [referenceId] NVARCHAR(100),
    [section] NVARCHAR(255),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [ReviewNote_status_df] DEFAULT 'OPEN',
    [priority] NVARCHAR(20) NOT NULL CONSTRAINT [ReviewNote_priority_df] DEFAULT 'MEDIUM',
    [categoryId] INT,
    [dueDate] DATETIME2,
    [raisedBy] NVARCHAR(1000) NOT NULL,
    [assignedTo] NVARCHAR(1000),
    [addressedAt] DATETIME2,
    [addressedBy] NVARCHAR(1000),
    [addressedComment] NVARCHAR(max),
    [clearedAt] DATETIME2,
    [clearedBy] NVARCHAR(1000),
    [clearanceComment] NVARCHAR(max),
    [rejectedAt] DATETIME2,
    [rejectionReason] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [currentOwner] NVARCHAR(1000),
    [lastRespondedBy] NVARCHAR(1000),
    [lastRespondedAt] DATETIME2,
    CONSTRAINT [ReviewNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ReviewNoteAssignee] (
    [id] INT NOT NULL IDENTITY(1,1),
    [reviewNoteId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [assignedAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNoteAssignee_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [assignedBy] NVARCHAR(1000) NOT NULL,
    [isForwarded] BIT NOT NULL CONSTRAINT [ReviewNoteAssignee_isForwarded_df] DEFAULT 0,
    CONSTRAINT [PK_ReviewNoteAssignee] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ReviewNoteAssignee_reviewNoteId_userId_key] UNIQUE NONCLUSTERED ([reviewNoteId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[ReviewNoteAttachment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [reviewNoteId] INT NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [fileType] NVARCHAR(100) NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNoteAttachment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [commentId] INT,
    CONSTRAINT [ReviewNoteAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ReviewNoteComment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [reviewNoteId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [comment] NVARCHAR(max) NOT NULL,
    [isInternal] BIT NOT NULL CONSTRAINT [ReviewNoteComment_isInternal_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNoteComment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ReviewNoteComment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SarsResponse] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
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
    CONSTRAINT [SarsResponse_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLineExternal] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ServLineCode] NVARCHAR(10),
    [ServLineDesc] NVARCHAR(150),
    [GLPrefix] NVARCHAR(10),
    [SLGroup] NVARCHAR(10),
    [masterCode] NVARCHAR(50),
    [SubServlineGroupCode] NVARCHAR(10),
    [SubServlineGroupDesc] NVARCHAR(150),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ServiceLineExternal_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [Active] BIT,
    CONSTRAINT [ServiceLineExternal_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLineMaster] (
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(500),
    [active] BIT NOT NULL CONSTRAINT [ServiceLineMaster_active_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [ServiceLineMaster_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ServiceLineMaster_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ServiceLineMaster_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLineTool] (
    [id] INT NOT NULL IDENTITY(1,1),
    [subServiceLineGroup] NVARCHAR(50) NOT NULL,
    [toolId] INT NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [ServiceLineTool_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__ServiceLi__creat__08362A7C] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ServiceLineTool_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ServiceLineTool_subServiceLineGroup_toolId_key] UNIQUE NONCLUSTERED ([subServiceLineGroup],[toolId])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLineUser] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] NVARCHAR(1000) NOT NULL,
    [subServiceLineGroup] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [ServiceLineUser_role_df] DEFAULT 'USER',
    [assignmentType] NVARCHAR(1000) NOT NULL CONSTRAINT [ServiceLineUser_assignmentType_df] DEFAULT 'SPECIFIC_SUBGROUP',
    [parentAssignmentId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ServiceLineUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [masterCode] NVARCHAR(50),
    CONSTRAINT [ServiceLineUser_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionToken] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_sessionToken_key] UNIQUE NONCLUSTERED ([sessionToken])
);

-- CreateTable
CREATE TABLE [dbo].[StandardTask] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSStdTaskID] UNIQUEIDENTIFIER NOT NULL,
    [StdTaskCode] NVARCHAR(10) NOT NULL,
    [StdTaskDesc] NVARCHAR(150) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_StandardTask_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [StandardTask_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [StandardTask_GSStdTaskID_key] UNIQUE NONCLUSTERED ([GSStdTaskID])
);

-- CreateTable
CREATE TABLE [dbo].[Task] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSTaskID] UNIQUEIDENTIFIER NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER,
    [TaskCode] NVARCHAR(10) NOT NULL,
    [TaskDesc] NVARCHAR(150) NOT NULL,
    [TaskPartner] NVARCHAR(10) NOT NULL,
    [TaskPartnerName] NVARCHAR(50) NOT NULL,
    [TaskManager] NVARCHAR(10) NOT NULL,
    [TaskManagerName] NVARCHAR(50) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [SLGroup] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [ServLineDesc] NVARCHAR(150) NOT NULL,
    [Active] VARCHAR(3) NOT NULL,
    [TaskDateOpen] DATETIME2 NOT NULL,
    [TaskDateTerminate] DATETIME2,
    [createdBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Task_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [taskYear] INT NOT NULL,
    CONSTRAINT [Task_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Task_GSTaskID_key] UNIQUE NONCLUSTERED ([GSTaskID])
);

-- CreateTable
CREATE TABLE [dbo].[TaskAcceptance] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [acceptanceApproved] BIT NOT NULL CONSTRAINT [TaskAcceptance_acceptanceApproved_df] DEFAULT 0,
    [approvedBy] NVARCHAR(1000),
    [approvedAt] DATETIME2,
    [questionnaireType] NVARCHAR(1000),
    [overallRiskScore] FLOAT(53),
    [riskRating] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskAcceptance_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TaskAcceptance_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TaskAcceptance_taskId_key] UNIQUE NONCLUSTERED ([taskId])
);

-- CreateTable
CREATE TABLE [dbo].[TaskBudget] (
    [id] INT NOT NULL IDENTITY(1,1),
    [TaskBudgetID] UNIQUEIDENTIFIER NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER,
    [GSTaskID] UNIQUEIDENTIFIER,
    [ClientCode] NVARCHAR(10),
    [TaskCode] NVARCHAR(10),
    [EstFeeTime] MONEY,
    [EstFeeDisb] MONEY,
    [EstChgTime] MONEY,
    [EstChgDisb] MONEY,
    [EstChgHours] MONEY,
    [EstAdjTime] MONEY,
    [EstAdjDisb] MONEY,
    [EstRecoveryPerc] INT,
    [BudDetails] NVARCHAR(255),
    [LastUser] NVARCHAR(50),
    [LastUpdated] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskBudget_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [BudApproveDate] DATETIME2,
    [BudDueDate] DATETIME2,
    [BudStartDate] DATETIME2,
    CONSTRAINT [TaskBudget_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TaskBudget_TaskBudgetID_key] UNIQUE NONCLUSTERED ([TaskBudgetID])
);

-- CreateTable
CREATE TABLE [dbo].[TaskBudgetDisbursement] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [description] NVARCHAR(255) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskBudgetDisbursement_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [expectedDate] DATETIME2 NOT NULL,
    CONSTRAINT [TaskBudgetDisbursement_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskBudgetFee] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [description] NVARCHAR(255) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskBudgetFee_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [expectedDate] DATETIME2 NOT NULL,
    CONSTRAINT [TaskBudgetFee_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileType] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [version] INT NOT NULL CONSTRAINT [TaskDocument_version_df] DEFAULT 1,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TaskDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskEngagementLetter] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [generated] BIT NOT NULL CONSTRAINT [TaskEngagementLetter_generated_df] DEFAULT 0,
    [uploaded] BIT NOT NULL CONSTRAINT [TaskEngagementLetter_uploaded_df] DEFAULT 0,
    [filePath] NVARCHAR(1000),
    [content] NVARCHAR(max),
    [templateId] INT,
    [generatedAt] DATETIME2,
    [generatedBy] NVARCHAR(1000),
    [uploadedAt] DATETIME2,
    [uploadedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskEngagementLetter_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [dpaUploaded] BIT NOT NULL CONSTRAINT [DF_TaskEngagementLetter_dpaUploaded] DEFAULT 0,
    [dpaFilePath] NVARCHAR(max),
    [dpaUploadedAt] DATETIME2,
    [dpaUploadedBy] NVARCHAR(max),
    [elExtractionStatus] NVARCHAR(20),
    [elExtractionError] NVARCHAR(max),
    [elLetterDate] DATETIME2,
    [elLetterAge] INT,
    [elSigningPartner] NVARCHAR(100),
    [elSigningPartnerCode] NVARCHAR(10),
    [elServicesCovered] NVARCHAR(max),
    [elHasPartnerSignature] BIT,
    [elHasClientSignature] BIT,
    [elHasTermsConditions] BIT,
    [elHasTcPartnerSignature] BIT,
    [elHasTcClientSignature] BIT,
    [elExtractedText] NVARCHAR(max),
    [dpaExtractionStatus] NVARCHAR(20),
    [dpaExtractionError] NVARCHAR(max),
    [dpaLetterDate] DATETIME2,
    [dpaLetterAge] INT,
    [dpaSigningPartner] NVARCHAR(100),
    [dpaSigningPartnerCode] NVARCHAR(10),
    [dpaHasPartnerSignature] BIT,
    [dpaHasClientSignature] BIT,
    [dpaExtractedText] NVARCHAR(max),
    [templateVersionId] INT,
    CONSTRAINT [TaskEngagementLetter_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TaskEngagementLetter_taskId_key] UNIQUE NONCLUSTERED ([taskId])
);

-- CreateTable
CREATE TABLE [dbo].[TaskIndependenceConfirmation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskTeamId] INT NOT NULL,
    [confirmed] BIT NOT NULL CONSTRAINT [TaskIndependenceConfirmation_confirmed_df] DEFAULT 0,
    [confirmedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskIndependenceConfirmation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TaskIndependenceConfirmation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TaskIndependenceConfirmation_taskTeamId_key] UNIQUE NONCLUSTERED ([taskTeamId])
);

-- CreateTable
CREATE TABLE [dbo].[TaskStage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [stage] NVARCHAR(50) NOT NULL,
    [movedBy] NVARCHAR(max) NOT NULL,
    [notes] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_TaskStage_createdAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_TaskStage] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskTeam] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [TaskTeam_role_df] DEFAULT 'VIEWER',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskTeam_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [allocatedHours] DECIMAL(10,2),
    [allocatedPercentage] INT,
    [actualHours] DECIMAL(10,2),
    CONSTRAINT [TaskTeam_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TaskTeam_taskId_userId_key] UNIQUE NONCLUSTERED ([taskId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[TaskTool] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [toolId] INT NOT NULL,
    [addedBy] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [TaskTool_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__TaskTool__create__0EE3280B] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TaskTool_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TaskTool_taskId_toolId_key] UNIQUE NONCLUSTERED ([taskId],[toolId])
);

-- CreateTable
CREATE TABLE [dbo].[TaxAdjustment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [TaxAdjustment_status_df] DEFAULT 'SUGGESTED',
    [sourceDocuments] NVARCHAR(1000),
    [extractedData] NVARCHAR(1000),
    [calculationDetails] NVARCHAR(1000),
    [notes] NVARCHAR(1000),
    [sarsSection] NVARCHAR(1000),
    [confidenceScore] FLOAT(53),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaxAdjustment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TaxAdjustment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Template] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [serviceLine] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [Template_active_df] DEFAULT 1,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Template_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [currentVersion] INT NOT NULL CONSTRAINT [Template_currentVersion_df] DEFAULT 1,
    CONSTRAINT [Template_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TemplateSection] (
    [id] INT NOT NULL IDENTITY(1,1),
    [templateId] INT NOT NULL,
    [sectionKey] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [isRequired] BIT NOT NULL CONSTRAINT [TemplateSection_isRequired_df] DEFAULT 1,
    [isAiAdaptable] BIT NOT NULL CONSTRAINT [TemplateSection_isAiAdaptable_df] DEFAULT 0,
    [order] INT NOT NULL,
    [applicableServiceLines] NVARCHAR(max),
    [applicableProjectTypes] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TemplateSection_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TemplateSection_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TemplateSectionVersion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [templateVersionId] INT NOT NULL,
    [sectionKey] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [isRequired] BIT NOT NULL CONSTRAINT [TemplateSectionVersion_isRequired_df] DEFAULT 1,
    [isAiAdaptable] BIT NOT NULL CONSTRAINT [TemplateSectionVersion_isAiAdaptable_df] DEFAULT 0,
    [order] INT NOT NULL,
    [applicableServiceLines] NVARCHAR(max),
    [applicableProjectTypes] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__TemplateS__creat__6359AB88] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TemplateSectionVersion_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TemplateVersion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [templateId] INT NOT NULL,
    [version] INT NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [serviceLine] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [TemplateVersion_isActive_df] DEFAULT 0,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__TemplateV__creat__5DA0D232] DEFAULT CURRENT_TIMESTAMP,
    [changeNotes] NVARCHAR(max),
    CONSTRAINT [TemplateVersion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_TemplateVersion_Number] UNIQUE NONCLUSTERED ([templateId],[version])
);

-- CreateTable
CREATE TABLE [dbo].[Tool] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(200) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(max),
    [icon] NVARCHAR(50),
    [componentPath] NVARCHAR(500) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Tool_active_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [Tool_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__Tool__createdAt__7ADC2F5E] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Tool_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Tool_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[ToolSubTab] (
    [id] INT NOT NULL IDENTITY(1,1),
    [toolId] INT NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [componentPath] NVARCHAR(500) NOT NULL,
    [icon] NVARCHAR(50),
    [sortOrder] INT NOT NULL CONSTRAINT [ToolSubTab_sortOrder_df] DEFAULT 0,
    [active] BIT NOT NULL CONSTRAINT [ToolSubTab_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__ToolSubTa__creat__01892CED] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ToolSubTab_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ToolSubTab_toolId_code_key] UNIQUE NONCLUSTERED ([toolId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [emailVerified] DATETIME2,
    [image] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'USER',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[VaultDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(max),
    [documentType] NVARCHAR(50) NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [mimeType] NVARCHAR(100) NOT NULL,
    [categoryId] INT NOT NULL,
    [scope] NVARCHAR(50) NOT NULL,
    [serviceLine] NVARCHAR(50),
    [version] INT NOT NULL CONSTRAINT [DF__VaultDocu__versi__72D0F942] DEFAULT 1,
    [status] NVARCHAR(50) NOT NULL,
    [approvalId] INT,
    [aiExtractionStatus] NVARCHAR(50) NOT NULL CONSTRAINT [DF__VaultDocu__aiExt__73C51D7B] DEFAULT 'PENDING',
    [aiSummary] NVARCHAR(max),
    [aiKeyPoints] NVARCHAR(max),
    [aiExtractedText] NVARCHAR(max),
    [effectiveDate] DATE,
    [expiryDate] DATE,
    [tags] NVARCHAR(max),
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [publishedAt] DATETIME2,
    [archivedAt] DATETIME2,
    [archivedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__creat__74B941B4] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__updat__75AD65ED] DEFAULT CURRENT_TIMESTAMP,
    [documentVersion] NVARCHAR(50),
    CONSTRAINT [PK_VaultDocument] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VaultDocumentCategory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(500),
    [icon] NVARCHAR(50),
    [color] NVARCHAR(20),
    [documentType] NVARCHAR(50),
    [active] BIT NOT NULL CONSTRAINT [DF__VaultDocu__activ__6D181FEC] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [DF__VaultDocu__sortO__6E0C4425] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__creat__6F00685E] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__updat__6FF48C97] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_VaultDocumentCategory] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VaultDocumentType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [icon] NVARCHAR(50),
    [color] NVARCHAR(20),
    [active] BIT NOT NULL CONSTRAINT [DF__VaultDocu__activ__06D7F1EF] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [DF__VaultDocu__sortO__07CC1628] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__creat__08C03A61] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__updat__09B45E9A] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_VaultDocumentType] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_VaultDocumentType_Code] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[VaultDocumentVersion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [documentId] INT NOT NULL,
    [version] INT NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__uploa__011F1899] DEFAULT CURRENT_TIMESTAMP,
    [supersededAt] DATETIME2,
    [changeNotes] NVARCHAR(max),
    CONSTRAINT [PK_VaultDocumentVersion] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_VaultDocumentVersion_DocumentId_Version] UNIQUE NONCLUSTERED ([documentId],[version])
);

-- CreateTable
CREATE TABLE [dbo].[VerificationToken] (
    [identifier] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [VerificationToken_token_key] UNIQUE NONCLUSTERED ([token]),
    CONSTRAINT [VerificationToken_identifier_token_key] UNIQUE NONCLUSTERED ([identifier],[token])
);

-- CreateTable
CREATE TABLE [dbo].[Wip] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    [GSTaskID] UNIQUEIDENTIFIER NOT NULL,
    [PeriodRef] INT,
    [PeriodStart] DATETIME2,
    [PeriodEnd] DATETIME2,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [TaskCode] NVARCHAR(10) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [TaskPartner] NVARCHAR(10) NOT NULL,
    [LTDTime] MONEY,
    [LTDDisb] MONEY,
    [LTDFeeTime] MONEY,
    [LTDFeeDisb] MONEY,
    [LTDAdjTime] MONEY,
    [LTDAdjDisb] MONEY,
    [LTDCost] MONEY,
    [YTDTime] MONEY,
    [YTDDisb] MONEY,
    [YTDFeeTime] MONEY,
    [YTDFeeDisb] MONEY,
    [YTDAdjTime] MONEY,
    [YTDAdjDisb] MONEY,
    [YTDCost] MONEY,
    [PTDTime] MONEY,
    [PTDDisb] MONEY,
    [PTDFeeTime] MONEY,
    [PTDFeeDisb] MONEY,
    [PTDAdjTime] MONEY,
    [PTDAdjDisb] MONEY,
    [PTDCost] MONEY,
    [BalTime] MONEY,
    [BalDisb] MONEY,
    [BalWIP] MONEY,
    [WipProvision] MONEY,
    [PTDProvision] MONEY,
    [YTDProvision] MONEY,
    [PTDPendingTime] MONEY,
    [YTDPendingTime] MONEY,
    [LTDPendingTime] MONEY,
    [PTDCostExcludeCP] MONEY,
    [YTDCostExcludeCP] MONEY,
    [LTDCostExcludeCP] MONEY,
    [LTDHours] MONEY,
    [YTDHours] MONEY,
    [PTDHours] MONEY,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_Wip_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Wip_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WIPAging] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    [GSTaskID] UNIQUEIDENTIFIER NOT NULL,
    [PeriodRef] INT,
    [PeriodStart] DATETIME2,
    [PeriodEnd] DATETIME2,
    [ClientCode] NVARCHAR(10),
    [TaskCode] NVARCHAR(10),
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [TaskPartner] NVARCHAR(10) NOT NULL,
    [Curr] MONEY,
    [Bal30] MONEY,
    [Bal60] MONEY,
    [Bal90] MONEY,
    [Bal120] MONEY,
    [Bal150] MONEY,
    [Bal180] MONEY,
    [BalWip] MONEY,
    [Provision] MONEY,
    [NettWip] MONEY,
    [PtdFeeAmt] MONEY,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WIPAging_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WIPAging_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WIPTransactions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSWIPTransID] UNIQUEIDENTIFIER NOT NULL,
    [GSTaskID] UNIQUEIDENTIFIER NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [OfficeDesc] NVARCHAR(100) NOT NULL,
    [TranDate] DATETIME2 NOT NULL,
    [TranType] VARCHAR(23) NOT NULL,
    [TType] VARCHAR(3) NOT NULL,
    [Ref] NVARCHAR(20),
    [ClientCode] NVARCHAR(10) NOT NULL,
    [ClientName] NVARCHAR(259),
    [TaskCode] NVARCHAR(10) NOT NULL,
    [TaskDesc] NVARCHAR(150) NOT NULL,
    [TaskPartner] NVARCHAR(10) NOT NULL,
    [PartnerName] NVARCHAR(50) NOT NULL,
    [TaskManager] NVARCHAR(10) NOT NULL,
    [ManagerName] NVARCHAR(50) NOT NULL,
    [TaskServLine] NVARCHAR(10) NOT NULL,
    [TaskServLineDesc] NVARCHAR(150) NOT NULL,
    [EmpCode] NVARCHAR(10),
    [EmpName] NVARCHAR(50),
    [EmpOffice] NVARCHAR(10),
    [EmpServLineCode] NVARCHAR(10),
    [EmpServLineDesc] NVARCHAR(150),
    [TranSubServLine] NVARCHAR(10),
    [TranSubServLineDesc] NVARCHAR(50),
    [ADOType] NVARCHAR(10),
    [ADODesc] NVARCHAR(100),
    [Hour] MONEY NOT NULL,
    [Rate] NVARCHAR(2),
    [Amount] MONEY,
    [Cost] MONEY NOT NULL,
    [Narr] TEXT,
    [TaskDateTerminate] DATETIME2,
    [Ordinal] INT NOT NULL,
    [GroupCode] NVARCHAR(10),
    [GroupDesc] NVARCHAR(150),
    [MainServLineCode] NVARCHAR(10) NOT NULL,
    [MainServLineDesc] NVARCHAR(150) NOT NULL,
    [ServLineGroup] NVARCHAR(10) NOT NULL,
    [EmpMainServLineCode] NVARCHAR(10),
    [EmpMainServLineDesc] NVARCHAR(150),
    [EmpServLineGroup] NVARCHAR(10),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WIPTransactions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WIPTransactions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WIPTransactions_GSWIPTransID_key] UNIQUE NONCLUSTERED ([GSWIPTransID])
);

-- CreateTable
CREATE TABLE [dbo].[WorkspaceFile] (
    [id] INT NOT NULL IDENTITY(1,1),
    [folderId] INT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [fileType] NVARCHAR(50) NOT NULL,
    [fileSize] BIGINT NOT NULL,
    [driveId] NVARCHAR(255) NOT NULL,
    [itemId] NVARCHAR(255) NOT NULL,
    [webUrl] NVARCHAR(500) NOT NULL,
    [embedUrl] NVARCHAR(500),
    [thumbnailUrl] NVARCHAR(500),
    [uploadedBy] NVARCHAR(200) NOT NULL,
    [lastModifiedBy] NVARCHAR(200),
    [lastModifiedAt] DATETIME2,
    [version] INT NOT NULL CONSTRAINT [WorkspaceFile_version_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFile_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WorkspaceFile_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkspaceFileActivity] (
    [id] INT NOT NULL IDENTITY(1,1),
    [fileId] INT NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [action] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(500),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFileActivity_timestamp] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkspaceFileActivity_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkspaceFilePermission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [fileId] INT NOT NULL,
    [userId] NVARCHAR(200),
    [role] NVARCHAR(50) NOT NULL,
    [serviceLine] NVARCHAR(50),
    [grantedBy] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFilePermission_createdAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkspaceFilePermission_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkspaceFolder] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [serviceLine] NVARCHAR(50),
    [subServiceLineGroup] NVARCHAR(100),
    [parentFolderId] INT,
    [driveId] NVARCHAR(255),
    [itemId] NVARCHAR(255),
    [sharepointUrl] NVARCHAR(500),
    [createdBy] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFolder_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [WorkspaceFolder_active_df] DEFAULT 1,
    [taskId] INT,
    CONSTRAINT [WorkspaceFolder_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AcceptanceAnswer_questionId_idx] ON [dbo].[AcceptanceAnswer]([questionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AcceptanceAnswer_responseId_idx] ON [dbo].[AcceptanceAnswer]([responseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AcceptanceDocument_documentType_idx] ON [dbo].[AcceptanceDocument]([documentType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AcceptanceDocument_responseId_idx] ON [dbo].[AcceptanceDocument]([responseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_accquestion_type_order_covering] ON [dbo].[AcceptanceQuestion]([questionnaireType], [order]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Account_userId_idx] ON [dbo].[Account]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Accounts_Account_idx] ON [dbo].[Accounts]([Account]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Accounts_AccStatus_idx] ON [dbo].[Accounts]([AccStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Accounts_Category_idx] ON [dbo].[Accounts]([Category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Accounts_OfficeCode_idx] ON [dbo].[Accounts]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AdjustmentDocument_extractionStatus_idx] ON [dbo].[AdjustmentDocument]([extractionStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AdjustmentDocument_extractionStatus_taskId_idx] ON [dbo].[AdjustmentDocument]([extractionStatus], [taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AdjustmentDocument_taskId_idx] ON [dbo].[AdjustmentDocument]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AdjustmentDocument_taxAdjustmentId_idx] ON [dbo].[AdjustmentDocument]([taxAdjustmentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AITaxReport_taskId_idx] ON [dbo].[AITaxReport]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approval_requestedById_idx] ON [dbo].[Approval]([requestedById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approval_status_idx] ON [dbo].[Approval]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approval_workflowType_idx] ON [dbo].[Approval]([workflowType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approval_workflowType_workflowId_idx] ON [dbo].[Approval]([workflowType], [workflowId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalDelegation_fromUserId_idx] ON [dbo].[ApprovalDelegation]([fromUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalDelegation_fromUserId_isActive_idx] ON [dbo].[ApprovalDelegation]([fromUserId], [isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalDelegation_isActive_endDate_idx] ON [dbo].[ApprovalDelegation]([isActive], [endDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalRoute_workflowType_isDefault_idx] ON [dbo].[ApprovalRoute]([workflowType], [isDefault]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_approvalstep_approval_order_status_covering] ON [dbo].[ApprovalStep]([approvalId], [stepOrder], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalStep_assignedToUserId_idx] ON [dbo].[ApprovalStep]([assignedToUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_bdactivity_assigned_status_due_covering] ON [dbo].[BDActivity]([assignedTo], [status], [dueDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_bdactivity_opp_created_covering] ON [dbo].[BDActivity]([opportunityId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDActivity_opportunityId_idx] ON [dbo].[BDActivity]([opportunityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDActivity_contactId_idx] ON [dbo].[BDActivity]([contactId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDContact_companyName_idx] ON [dbo].[BDContact]([companyName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDContact_createdAt_idx] ON [dbo].[BDContact]([createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDContact_email_idx] ON [dbo].[BDContact]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDNote_createdAt_idx] ON [dbo].[BDNote]([createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDNote_opportunityId_idx] ON [dbo].[BDNote]([opportunityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_bdopp_assigned_status_covering] ON [dbo].[BDOpportunity]([assignedTo], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_bdopp_serviceline_status_covering] ON [dbo].[BDOpportunity]([serviceLine], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_bdopp_created_covering] ON [dbo].[BDOpportunity]([createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_bdopp_updated_covering] ON [dbo].[BDOpportunity]([updatedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDOpportunity_clientId_idx] ON [dbo].[BDOpportunity]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDOpportunity_stageId_idx] ON [dbo].[BDOpportunity]([stageId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDOpportunity_expectedCloseDate_idx] ON [dbo].[BDOpportunity]([expectedCloseDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDProposal_opportunityId_idx] ON [dbo].[BDProposal]([opportunityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDProposal_opportunityId_version_idx] ON [dbo].[BDProposal]([opportunityId], [version]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDProposal_sentAt_idx] ON [dbo].[BDProposal]([sentAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDProposal_status_idx] ON [dbo].[BDProposal]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDStage_isActive_idx] ON [dbo].[BDStage]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDStage_order_idx] ON [dbo].[BDStage]([order]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BDStage_serviceLine_idx] ON [dbo].[BDStage]([serviceLine]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_bugreport_status_priority_covering] ON [dbo].[BugReport]([status], [priority], [reportedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BugReport_reportedBy_idx] ON [dbo].[BugReport]([reportedBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_categoryapprover_category_steporder_covering] ON [dbo].[CategoryApprover]([categoryId], [stepOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_CategoryApprover_UserId] ON [dbo].[CategoryApprover]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Client_active_groupCode_idx] ON [dbo].[Client]([active], [groupCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Client_active_industry_idx] ON [dbo].[Client]([active], [industry]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Client_clientTaxFlag_idx] ON [dbo].[Client]([clientTaxFlag]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Client_groupDesc_clientNameFull_idx] ON [dbo].[Client]([groupDesc], [clientNameFull]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Client_industry_clientNameFull_idx] ON [dbo].[Client]([industry], [clientNameFull]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Client_sector_idx] ON [dbo].[Client]([sector]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Client_updatedAt_idx] ON [dbo].[Client]([updatedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptance_approvalId_idx] ON [dbo].[ClientAcceptance]([approvalId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptance_approvedAt_idx] ON [dbo].[ClientAcceptance]([approvedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptance_clientId_idx] ON [dbo].[ClientAcceptance]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptance_riskRating_idx] ON [dbo].[ClientAcceptance]([riskRating]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_clientaccanswer_acceptance_covering] ON [dbo].[ClientAcceptanceAnswer]([clientAcceptanceId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_clientId_idx] ON [dbo].[ClientAcceptanceResponse]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_questionnaireType_idx] ON [dbo].[ClientAcceptanceResponse]([questionnaireType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_riskRating_idx] ON [dbo].[ClientAcceptanceResponse]([riskRating]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_taskId_idx] ON [dbo].[ClientAcceptanceResponse]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_taskId_questionnaireType_idx] ON [dbo].[ClientAcceptanceResponse]([taskId], [questionnaireType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_clientId_idx] ON [dbo].[ClientAnalyticsDocument]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_documentType_idx] ON [dbo].[ClientAnalyticsDocument]([documentType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_uploadedAt_idx] ON [dbo].[ClientAnalyticsDocument]([uploadedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientCreditRating_clientId_idx] ON [dbo].[ClientCreditRating]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientCreditRating_clientId_ratingDate_idx] ON [dbo].[ClientCreditRating]([clientId], [ratingDate] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientCreditRating_ratingDate_idx] ON [dbo].[ClientCreditRating]([ratingDate] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientCreditRating_ratingGrade_idx] ON [dbo].[ClientCreditRating]([ratingGrade]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_approvalId_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([approvalId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_clientId_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_currentEmployeeApprovedById_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([currentEmployeeApprovedById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_proposedEmployeeApprovedById_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([proposedEmployeeApprovedById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_proposedEmployeeCode_status_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([proposedEmployeeCode], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_requestedAt_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([requestedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_requiresDualApproval_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([requiresDualApproval]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_status_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ComplianceChecklist_assignedTo_idx] ON [dbo].[ComplianceChecklist]([assignedTo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ComplianceChecklist_dueDate_idx] ON [dbo].[ComplianceChecklist]([dueDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ComplianceChecklist_status_idx] ON [dbo].[ComplianceChecklist]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ComplianceChecklist_taskId_idx] ON [dbo].[ComplianceChecklist]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Creditors_BatchNumber_idx] ON [dbo].[Creditors]([BatchNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Creditors_CreditorCode_idx] ON [dbo].[Creditors]([CreditorCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Creditors_GSTaskID_idx] ON [dbo].[Creditors]([GSTaskID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Creditors_InvNumber_idx] ON [dbo].[Creditors]([InvNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Creditors_MatchDate_idx] ON [dbo].[Creditors]([MatchDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Creditors_OfficeCode_idx] ON [dbo].[Creditors]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Creditors_TranDate_idx] ON [dbo].[Creditors]([TranDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CreditRatingDocument_analyticsDocumentId_idx] ON [dbo].[CreditRatingDocument]([analyticsDocumentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CreditRatingDocument_creditRatingId_idx] ON [dbo].[CreditRatingDocument]([creditRatingId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Debtors_Biller_idx] ON [dbo].[Debtors]([Biller]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Debtors_GSClientID_idx] ON [dbo].[Debtors]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Debtors_GSClientID_PeriodRef_idx] ON [dbo].[Debtors]([GSClientID], [PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Debtors_OfficeCode_idx] ON [dbo].[Debtors]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Debtors_PeriodRef_idx] ON [dbo].[Debtors]([PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Debtors_ServLineCode_idx] ON [dbo].[Debtors]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_OfficeCode_idx] ON [dbo].[DrsTransactions]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_PeriodKey_idx] ON [dbo].[DrsTransactions]([PeriodKey]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_ServLineCode_idx] ON [dbo].[DrsTransactions]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_TranDate_idx] ON [dbo].[DrsTransactions]([TranDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailLog_emailType_idx] ON [dbo].[EmailLog]([emailType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailLog_recipientUserId_idx] ON [dbo].[EmailLog]([recipientUserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailLog_status_idx] ON [dbo].[EmailLog]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_Active_idx] ON [dbo].[Employee]([Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_EmpCatCode_idx] ON [dbo].[Employee]([EmpCatCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_EmpCode_Active_idx] ON [dbo].[Employee]([EmpCode], [Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_GSEmployeeID_idx] ON [dbo].[Employee]([GSEmployeeID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_OfficeCode_idx] ON [dbo].[Employee]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_ServLineCode_idx] ON [dbo].[Employee]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_SLGroup_idx] ON [dbo].[Employee]([SLGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_WinLogon_idx] ON [dbo].[Employee]([WinLogon]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_employee_empcode_active] ON [dbo].[Employee]([EmpCode], [Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExternalLink_active_idx] ON [dbo].[ExternalLink]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExternalLink_name_idx] ON [dbo].[ExternalLink]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FilingStatus_deadline_idx] ON [dbo].[FilingStatus]([deadline]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FilingStatus_status_idx] ON [dbo].[FilingStatus]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FilingStatus_taskId_idx] ON [dbo].[FilingStatus]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_calendarYear_calendarMonth] ON [dbo].[FiscalPeriod]([calendarYear], [calendarMonth]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalQuarter] ON [dbo].[FiscalPeriod]([fiscalQuarter]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear] ON [dbo].[FiscalPeriod]([fiscalYear]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear_fiscalMonth] ON [dbo].[FiscalPeriod]([fiscalYear], [fiscalMonth]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear_fiscalQuarter] ON [dbo].[FiscalPeriod]([fiscalYear], [fiscalQuarter]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_startDate_endDate] ON [dbo].[FiscalPeriod]([startDate], [endDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GL_Account_idx] ON [dbo].[GL]([Account]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GL_DatePosted_idx] ON [dbo].[GL]([DatePosted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GL_EntryDate_idx] ON [dbo].[GL]([EntryDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GL_EntryGroup_idx] ON [dbo].[GL]([EntryGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GL_GSAccountID_idx] ON [dbo].[GL]([GSAccountID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GL_OfficeCode_idx] ON [dbo].[GL]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GL_SourceBatch_idx] ON [dbo].[GL]([SourceBatch]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLBudgets_BudgetCode_idx] ON [dbo].[GLBudgets]([BudgetCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLBudgets_GSAccountID_idx] ON [dbo].[GLBudgets]([GSAccountID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLBudgets_GSBudgetTypeID_idx] ON [dbo].[GLBudgets]([GSBudgetTypeID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLBudgets_PeriodYear_PeriodNumber_idx] ON [dbo].[GLBudgets]([PeriodYear], [PeriodNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_notification_user_read_covering] ON [dbo].[InAppNotification]([userId], [isRead]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_notification_created_covering] ON [dbo].[InAppNotification]([createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LeaderGroup_name_idx] ON [dbo].[LeaderGroup]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LeaderGroup_type_idx] ON [dbo].[LeaderGroup]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LeaderGroupMember_employeeId_idx] ON [dbo].[LeaderGroupMember]([employeeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LeaderGroupMember_leaderGroupId_idx] ON [dbo].[LeaderGroupMember]([leaderGroupId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegalPrecedent_taskId_idx] ON [dbo].[LegalPrecedent]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegalPrecedent_year_idx] ON [dbo].[LegalPrecedent]([year]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MappedAccount_taskId_accountCode_idx] ON [dbo].[MappedAccount]([taskId], [accountCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MappedAccount_taskId_idx] ON [dbo].[MappedAccount]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MappedAccount_taskId_section_idx] ON [dbo].[MappedAccount]([taskId], [section]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MappedAccount_taskId_section_subsection_idx] ON [dbo].[MappedAccount]([taskId], [section], [subsection]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsBulletin_category_idx] ON [dbo].[NewsBulletin]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsBulletin_effectiveDate_idx] ON [dbo].[NewsBulletin]([effectiveDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsBulletin_isActive_effectiveDate_idx] ON [dbo].[NewsBulletin]([isActive], [effectiveDate] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsBulletin_isActive_idx] ON [dbo].[NewsBulletin]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsBulletin_isPinned_idx] ON [dbo].[NewsBulletin]([isPinned]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsBulletin_serviceLine_idx] ON [dbo].[NewsBulletin]([serviceLine]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NonClientAllocation_employeeId_idx] ON [dbo].[NonClientAllocation]([employeeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NonClientAllocation_employeeId_startDate_endDate_idx] ON [dbo].[NonClientAllocation]([employeeId], [startDate], [endDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NonClientAllocation_eventType_idx] ON [dbo].[NonClientAllocation]([eventType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationPreference_taskId_idx] ON [dbo].[NotificationPreference]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationPreference_userId_idx] ON [dbo].[NotificationPreference]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OpinionChatMessage_opinionDraftId_createdAt_idx] ON [dbo].[OpinionChatMessage]([opinionDraftId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OpinionChatMessage_sectionGenerationId_idx] ON [dbo].[OpinionChatMessage]([sectionGenerationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OpinionDocument_category_idx] ON [dbo].[OpinionDocument]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OpinionDocument_opinionDraftId_idx] ON [dbo].[OpinionDocument]([opinionDraftId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OpinionDraft_status_idx] ON [dbo].[OpinionDraft]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OpinionDraft_taskId_idx] ON [dbo].[OpinionDraft]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OpinionDraft_taskId_version_idx] ON [dbo].[OpinionDraft]([taskId], [version]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OpinionSection_opinionDraftId_order_idx] ON [dbo].[OpinionSection]([opinionDraftId], [order]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PagePermission_active_idx] ON [dbo].[PagePermission]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PagePermission_pathname_idx] ON [dbo].[PagePermission]([pathname]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PagePermission_role_idx] ON [dbo].[PagePermission]([role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PageRegistry_active_idx] ON [dbo].[PageRegistry]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PageRegistry_category_idx] ON [dbo].[PageRegistry]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ResearchNote_category_idx] ON [dbo].[ResearchNote]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ResearchNote_taskId_idx] ON [dbo].[ResearchNote]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewCategory_active_idx] ON [dbo].[ReviewCategory]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewCategory_serviceLine_idx] ON [dbo].[ReviewCategory]([serviceLine]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewCategory_sortOrder_idx] ON [dbo].[ReviewCategory]([sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_reviewnote_assigned_status_covering] ON [dbo].[ReviewNote]([assignedTo], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_reviewnote_task_status_covering] ON [dbo].[ReviewNote]([taskId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_reviewnote_created_covering] ON [dbo].[ReviewNote]([createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNote_taskId_idx] ON [dbo].[ReviewNote]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNote_categoryId_idx] ON [dbo].[ReviewNote]([categoryId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNote_dueDate_idx] ON [dbo].[ReviewNote]([dueDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNoteAssignee_assignedBy_idx] ON [dbo].[ReviewNoteAssignee]([assignedBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNoteAssignee_reviewNoteId_idx] ON [dbo].[ReviewNoteAssignee]([reviewNoteId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNoteAssignee_userId_idx] ON [dbo].[ReviewNoteAssignee]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNoteAttachment_reviewNoteId_idx] ON [dbo].[ReviewNoteAttachment]([reviewNoteId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNoteAttachment_uploadedBy_idx] ON [dbo].[ReviewNoteAttachment]([uploadedBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNoteComment_createdAt_idx] ON [dbo].[ReviewNoteComment]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNoteComment_reviewNoteId_idx] ON [dbo].[ReviewNoteComment]([reviewNoteId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReviewNoteComment_userId_idx] ON [dbo].[ReviewNoteComment]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SarsResponse_deadline_idx] ON [dbo].[SarsResponse]([deadline]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SarsResponse_status_idx] ON [dbo].[SarsResponse]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SarsResponse_taskId_idx] ON [dbo].[SarsResponse]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_servline_code] ON [dbo].[ServiceLineExternal]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineExternal_masterCode_idx] ON [dbo].[ServiceLineExternal]([masterCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineExternal_ServLineCode_idx] ON [dbo].[ServiceLineExternal]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineExternal_SLGroup_idx] ON [dbo].[ServiceLineExternal]([SLGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineExternal_SubServlineGroupCode_idx] ON [dbo].[ServiceLineExternal]([SubServlineGroupCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_master_sl_code] ON [dbo].[ServiceLineMaster]([code]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineMaster_active_idx] ON [dbo].[ServiceLineMaster]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineMaster_sortOrder_idx] ON [dbo].[ServiceLineMaster]([sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineTool_active_idx] ON [dbo].[ServiceLineTool]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineTool_subServiceLineGroup_idx] ON [dbo].[ServiceLineTool]([subServiceLineGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineTool_toolId_idx] ON [dbo].[ServiceLineTool]([toolId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_ServiceLineUser_masterCode] ON [dbo].[ServiceLineUser]([masterCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineUser_assignmentType_idx] ON [dbo].[ServiceLineUser]([assignmentType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineUser_parentAssignmentId_idx] ON [dbo].[ServiceLineUser]([parentAssignmentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineUser_subServiceLineGroup_idx] ON [dbo].[ServiceLineUser]([subServiceLineGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineUser_userId_assignmentType_idx] ON [dbo].[ServiceLineUser]([userId], [assignmentType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLineUser_userId_idx] ON [dbo].[ServiceLineUser]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_userId_idx] ON [dbo].[Session]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StandardTask_GSStdTaskID_idx] ON [dbo].[StandardTask]([GSStdTaskID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StandardTask_ServLineCode_idx] ON [dbo].[StandardTask]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StandardTask_StdTaskCode_idx] ON [dbo].[StandardTask]([StdTaskCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_task_gsclientid] ON [dbo].[Task]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_task_servlinecode_active] ON [dbo].[Task]([ServLineCode], [Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_GSClientID_Active_updatedAt_idx] ON [dbo].[Task]([GSClientID], [Active], [updatedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_GSClientID_idx] ON [dbo].[Task]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_ServLineCode_Active_idx] ON [dbo].[Task]([ServLineCode], [Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_ServLineCode_Active_updatedAt_idx] ON [dbo].[Task]([ServLineCode], [Active], [updatedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_ServLineCode_SLGroup_idx] ON [dbo].[Task]([ServLineCode], [SLGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_TaskManager_Active_idx] ON [dbo].[Task]([TaskManager], [Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_TaskPartner_Active_idx] ON [dbo].[Task]([TaskPartner], [Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_taskYear_idx] ON [dbo].[Task]([taskYear]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskAcceptance_riskRating_idx] ON [dbo].[TaskAcceptance]([riskRating]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskAcceptance_taskId_idx] ON [dbo].[TaskAcceptance]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskBudget_GSClientID_idx] ON [dbo].[TaskBudget]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskBudget_GSTaskID_idx] ON [dbo].[TaskBudget]([GSTaskID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskBudget_TaskBudgetID_idx] ON [dbo].[TaskBudget]([TaskBudgetID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskBudgetDisbursement_createdBy_idx] ON [dbo].[TaskBudgetDisbursement]([createdBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskBudgetDisbursement_taskId_idx] ON [dbo].[TaskBudgetDisbursement]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskBudgetFee_createdBy_idx] ON [dbo].[TaskBudgetFee]([createdBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskBudgetFee_taskId_idx] ON [dbo].[TaskBudgetFee]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskDocument_category_idx] ON [dbo].[TaskDocument]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskDocument_taskId_idx] ON [dbo].[TaskDocument]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_taskengagement_dpa_covering] ON [dbo].[TaskEngagementLetter]([dpaExtractionStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_taskengagement_el_covering] ON [dbo].[TaskEngagementLetter]([elExtractionStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskEngagementLetter_taskId_idx] ON [dbo].[TaskEngagementLetter]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskEngagementLetter_templateVersionId_idx] ON [dbo].[TaskEngagementLetter]([templateVersionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskIndependenceConfirmation_confirmed_idx] ON [dbo].[TaskIndependenceConfirmation]([confirmed]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskIndependenceConfirmation_taskTeamId_idx] ON [dbo].[TaskIndependenceConfirmation]([taskTeamId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_taskstage_taskid_created] ON [dbo].[TaskStage]([taskId], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskStage_stage_idx] ON [dbo].[TaskStage]([stage]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskStage_taskId_stage_idx] ON [dbo].[TaskStage]([taskId], [stage]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_taskteam_userid_taskid] ON [dbo].[TaskTeam]([userId], [taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTeam_role_idx] ON [dbo].[TaskTeam]([role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTeam_taskId_startDate_endDate_idx] ON [dbo].[TaskTeam]([taskId], [startDate], [endDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTeam_userId_startDate_endDate_idx] ON [dbo].[TaskTeam]([userId], [startDate], [endDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTeam_userId_taskId_idx] ON [dbo].[TaskTeam]([userId], [taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTeam_userId_taskId_role_idx] ON [dbo].[TaskTeam]([userId], [taskId], [role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTool_addedBy_idx] ON [dbo].[TaskTool]([addedBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTool_taskId_idx] ON [dbo].[TaskTool]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTool_taskId_sortOrder_idx] ON [dbo].[TaskTool]([taskId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskTool_toolId_idx] ON [dbo].[TaskTool]([toolId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaxAdjustment_createdAt_idx] ON [dbo].[TaxAdjustment]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaxAdjustment_status_idx] ON [dbo].[TaxAdjustment]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaxAdjustment_status_taskId_idx] ON [dbo].[TaxAdjustment]([status], [taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaxAdjustment_taskId_idx] ON [dbo].[TaxAdjustment]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaxAdjustment_taskId_status_createdAt_idx] ON [dbo].[TaxAdjustment]([taskId], [status], [createdAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Template_active_idx] ON [dbo].[Template]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Template_serviceLine_idx] ON [dbo].[Template]([serviceLine]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Template_type_idx] ON [dbo].[Template]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TemplateSection_sectionKey_idx] ON [dbo].[TemplateSection]([sectionKey]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TemplateSection_templateId_idx] ON [dbo].[TemplateSection]([templateId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TemplateSectionVersion_templateVersionId_idx] ON [dbo].[TemplateSectionVersion]([templateVersionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TemplateSectionVersion_templateVersionId_order_idx] ON [dbo].[TemplateSectionVersion]([templateVersionId], [order]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TemplateVersion_createdAt_idx] ON [dbo].[TemplateVersion]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TemplateVersion_templateId_idx] ON [dbo].[TemplateVersion]([templateId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TemplateVersion_templateId_isActive_idx] ON [dbo].[TemplateVersion]([templateId], [isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tool_active_idx] ON [dbo].[Tool]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tool_code_idx] ON [dbo].[Tool]([code]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tool_sortOrder_idx] ON [dbo].[Tool]([sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ToolSubTab_active_idx] ON [dbo].[ToolSubTab]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ToolSubTab_toolId_idx] ON [dbo].[ToolSubTab]([toolId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ToolSubTab_toolId_sortOrder_idx] ON [dbo].[ToolSubTab]([toolId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_role_idx] ON [dbo].[User]([role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_ApprovalId] ON [dbo].[VaultDocument]([approvalId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_CategoryId] ON [dbo].[VaultDocument]([categoryId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_DocumentType] ON [dbo].[VaultDocument]([documentType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_DocumentType_CategoryId] ON [dbo].[VaultDocument]([documentType], [categoryId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_PublishedAt] ON [dbo].[VaultDocument]([publishedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_Scope] ON [dbo].[VaultDocument]([scope]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_ServiceLine] ON [dbo].[VaultDocument]([serviceLine]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_Status] ON [dbo].[VaultDocument]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_Status_Scope_ServiceLine] ON [dbo].[VaultDocument]([status], [scope], [serviceLine]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocument_UploadedBy] ON [dbo].[VaultDocument]([uploadedBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocumentCategory_Active] ON [dbo].[VaultDocumentCategory]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocumentCategory_DocumentType] ON [dbo].[VaultDocumentCategory]([documentType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocumentCategory_SortOrder] ON [dbo].[VaultDocumentCategory]([sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocumentType_Active] ON [dbo].[VaultDocumentType]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocumentType_SortOrder] ON [dbo].[VaultDocumentType]([sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocumentVersion_DocumentId] ON [dbo].[VaultDocumentVersion]([documentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocumentVersion_DocumentId_Version] ON [dbo].[VaultDocumentVersion]([documentId], [version]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_VaultDocumentVersion_Version] ON [dbo].[VaultDocumentVersion]([version]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Wip_GSClientID_idx] ON [dbo].[Wip]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Wip_GSClientID_PeriodRef_idx] ON [dbo].[Wip]([GSClientID], [PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Wip_GSTaskID_idx] ON [dbo].[Wip]([GSTaskID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Wip_GSTaskID_PeriodRef_idx] ON [dbo].[Wip]([GSTaskID], [PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Wip_OfficeCode_idx] ON [dbo].[Wip]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Wip_PeriodRef_idx] ON [dbo].[Wip]([PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Wip_ServLineCode_idx] ON [dbo].[Wip]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Wip_TaskPartner_idx] ON [dbo].[Wip]([TaskPartner]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPAging_GSClientID_idx] ON [dbo].[WIPAging]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPAging_GSClientID_PeriodRef_idx] ON [dbo].[WIPAging]([GSClientID], [PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPAging_GSTaskID_idx] ON [dbo].[WIPAging]([GSTaskID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPAging_GSTaskID_PeriodRef_idx] ON [dbo].[WIPAging]([GSTaskID], [PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPAging_OfficeCode_idx] ON [dbo].[WIPAging]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPAging_PeriodRef_idx] ON [dbo].[WIPAging]([PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPAging_ServLineCode_idx] ON [dbo].[WIPAging]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPAging_TaskPartner_idx] ON [dbo].[WIPAging]([TaskPartner]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_GSClientID_TranDate_TType_idx] ON [dbo].[WIPTransactions]([GSClientID], [TranDate], [TType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_GSTaskID_TranDate_TType_idx] ON [dbo].[WIPTransactions]([GSTaskID], [TranDate], [TType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_TaskManager_TranDate_idx] ON [dbo].[WIPTransactions]([TaskManager], [TranDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_TaskPartner_TranDate_idx] ON [dbo].[WIPTransactions]([TaskPartner], [TranDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_TranDate_idx] ON [dbo].[WIPTransactions]([TranDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_EmpCode_idx] ON [dbo].[WIPTransactions]([EmpCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_OfficeCode_idx] ON [dbo].[WIPTransactions]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_ServLineGroup_idx] ON [dbo].[WIPTransactions]([ServLineGroup]);

-- AddForeignKey
ALTER TABLE [dbo].[AcceptanceAnswer] ADD CONSTRAINT [FK_AcceptanceAnswer_EngagementResponse] FOREIGN KEY ([responseId]) REFERENCES [dbo].[ClientAcceptanceResponse]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AcceptanceAnswer] ADD CONSTRAINT [FK_AcceptanceAnswer_Question] FOREIGN KEY ([questionId]) REFERENCES [dbo].[AcceptanceQuestion]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AcceptanceDocument] ADD CONSTRAINT [FK_AcceptanceDocument_Response] FOREIGN KEY ([responseId]) REFERENCES [dbo].[ClientAcceptanceResponse]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AdjustmentDocument] ADD CONSTRAINT [AdjustmentDocument_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AdjustmentDocument] ADD CONSTRAINT [AdjustmentDocument_taxAdjustmentId_fkey] FOREIGN KEY ([taxAdjustmentId]) REFERENCES [dbo].[TaxAdjustment]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AITaxReport] ADD CONSTRAINT [AITaxReport_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [FK_Approval_CompletedBy] FOREIGN KEY ([completedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [FK_Approval_RequestedBy] FOREIGN KEY ([requestedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalDelegation] ADD CONSTRAINT [FK_ApprovalDelegation_From] FOREIGN KEY ([fromUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalDelegation] ADD CONSTRAINT [FK_ApprovalDelegation_To] FOREIGN KEY ([toUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [FK_ApprovalStep_Approval] FOREIGN KEY ([approvalId]) REFERENCES [dbo].[Approval]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [FK_ApprovalStep_ApprovedBy] FOREIGN KEY ([approvedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [FK_ApprovalStep_AssignedTo] FOREIGN KEY ([assignedToUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [FK_ApprovalStep_DelegatedTo] FOREIGN KEY ([delegatedToUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BDActivity] ADD CONSTRAINT [BDActivity_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[BDContact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BDActivity] ADD CONSTRAINT [BDActivity_opportunityId_fkey] FOREIGN KEY ([opportunityId]) REFERENCES [dbo].[BDOpportunity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BDNote] ADD CONSTRAINT [BDNote_opportunityId_fkey] FOREIGN KEY ([opportunityId]) REFERENCES [dbo].[BDOpportunity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_clientId_fkey] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[BDContact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_stageId_fkey] FOREIGN KEY ([stageId]) REFERENCES [dbo].[BDStage]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BDProposal] ADD CONSTRAINT [BDProposal_opportunityId_fkey] FOREIGN KEY ([opportunityId]) REFERENCES [dbo].[BDOpportunity]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BugReport] ADD CONSTRAINT [BugReport_reportedBy_fkey] FOREIGN KEY ([reportedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BugReport] ADD CONSTRAINT [BugReport_resolvedBy_fkey] FOREIGN KEY ([resolvedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BugReport] ADD CONSTRAINT [BugReport_testedBy_fkey] FOREIGN KEY ([testedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CategoryApprover] ADD CONSTRAINT [FK_CategoryApprover_Category] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[VaultDocumentCategory]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CategoryApprover] ADD CONSTRAINT [FK_CategoryApprover_CreatedBy] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CategoryApprover] ADD CONSTRAINT [FK_CategoryApprover_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [ClientAcceptance_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [FK_ClientAcceptance_Approval] FOREIGN KEY ([approvalId]) REFERENCES [dbo].[Approval]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [FK_ClientAcceptance_Client] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientAcceptanceAnswer] ADD CONSTRAINT [FK_ClientAcceptanceAnswer_ClientAcceptance] FOREIGN KEY ([clientAcceptanceId]) REFERENCES [dbo].[ClientAcceptance]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientAcceptanceAnswer] ADD CONSTRAINT [FK_ClientAcceptanceAnswer_Question] FOREIGN KEY ([questionId]) REFERENCES [dbo].[AcceptanceQuestion]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientAcceptanceResponse] ADD CONSTRAINT [FK_ClientAcceptanceResponse_Client] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientAcceptanceResponse] ADD CONSTRAINT [FK_ClientAcceptanceResponse_Task] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientAnalyticsDocument] ADD CONSTRAINT [ClientAnalyticsDocument_clientId_fkey] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ClientCreditRating] ADD CONSTRAINT [ClientCreditRating_clientId_fkey] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ChangeRequest_Approval] FOREIGN KEY ([approvalId]) REFERENCES [dbo].[Approval]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_Client] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_CurrentApprover] FOREIGN KEY ([currentEmployeeApprovedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_ProposedApprover] FOREIGN KEY ([proposedEmployeeApprovedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_RequestedBy] FOREIGN KEY ([requestedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_ResolvedBy] FOREIGN KEY ([resolvedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ComplianceChecklist] ADD CONSTRAINT [ComplianceChecklist_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CreditRatingDocument] ADD CONSTRAINT [CreditRatingDocument_analyticsDocumentId_fkey] FOREIGN KEY ([analyticsDocumentId]) REFERENCES [dbo].[ClientAnalyticsDocument]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CreditRatingDocument] ADD CONSTRAINT [CreditRatingDocument_creditRatingId_fkey] FOREIGN KEY ([creditRatingId]) REFERENCES [dbo].[ClientCreditRating]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Debtors] ADD CONSTRAINT [Debtors_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DrsTransactions] ADD CONSTRAINT [DrsTransactions_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EmailLog] ADD CONSTRAINT [EmailLog_recipientUserId_fkey] FOREIGN KEY ([recipientUserId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[FilingStatus] ADD CONSTRAINT [FilingStatus_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_fromUserId_fkey] FOREIGN KEY ([fromUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LeaderGroup] ADD CONSTRAINT [LeaderGroup_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LeaderGroupMember] ADD CONSTRAINT [LeaderGroupMember_addedById_fkey] FOREIGN KEY ([addedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LeaderGroupMember] ADD CONSTRAINT [LeaderGroupMember_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[Employee]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LeaderGroupMember] ADD CONSTRAINT [LeaderGroupMember_leaderGroupId_fkey] FOREIGN KEY ([leaderGroupId]) REFERENCES [dbo].[LeaderGroup]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LegalPrecedent] ADD CONSTRAINT [LegalPrecedent_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MappedAccount] ADD CONSTRAINT [MappedAccount_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NewsBulletin] ADD CONSTRAINT [NewsBulletin_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NonClientAllocation] ADD CONSTRAINT [NonClientAllocation_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[Employee]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OpinionChatMessage] ADD CONSTRAINT [OpinionChatMessage_opinionDraftId_fkey] FOREIGN KEY ([opinionDraftId]) REFERENCES [dbo].[OpinionDraft]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OpinionDocument] ADD CONSTRAINT [OpinionDocument_opinionDraftId_fkey] FOREIGN KEY ([opinionDraftId]) REFERENCES [dbo].[OpinionDraft]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OpinionDraft] ADD CONSTRAINT [OpinionDraft_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OpinionSection] ADD CONSTRAINT [OpinionSection_opinionDraftId_fkey] FOREIGN KEY ([opinionDraftId]) REFERENCES [dbo].[OpinionDraft]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ResearchNote] ADD CONSTRAINT [ResearchNote_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_addressedBy_fkey] FOREIGN KEY ([addressedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_assignedTo_fkey] FOREIGN KEY ([assignedTo]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[ReviewCategory]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_clearedBy_fkey] FOREIGN KEY ([clearedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_currentOwner_fkey] FOREIGN KEY ([currentOwner]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_lastRespondedBy_fkey] FOREIGN KEY ([lastRespondedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_raisedBy_fkey] FOREIGN KEY ([raisedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNoteAssignee] ADD CONSTRAINT [FK_ReviewNoteAssignee_ReviewNote] FOREIGN KEY ([reviewNoteId]) REFERENCES [dbo].[ReviewNote]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNoteAssignee] ADD CONSTRAINT [FK_ReviewNoteAssignee_User_assignedBy] FOREIGN KEY ([assignedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNoteAssignee] ADD CONSTRAINT [FK_ReviewNoteAssignee_User_userId] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNoteAttachment] ADD CONSTRAINT [FK_ReviewNoteAttachment_Comment] FOREIGN KEY ([commentId]) REFERENCES [dbo].[ReviewNoteComment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNoteAttachment] ADD CONSTRAINT [ReviewNoteAttachment_reviewNoteId_fkey] FOREIGN KEY ([reviewNoteId]) REFERENCES [dbo].[ReviewNote]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNoteAttachment] ADD CONSTRAINT [ReviewNoteAttachment_uploadedBy_fkey] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNoteComment] ADD CONSTRAINT [ReviewNoteComment_reviewNoteId_fkey] FOREIGN KEY ([reviewNoteId]) REFERENCES [dbo].[ReviewNote]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ReviewNoteComment] ADD CONSTRAINT [ReviewNoteComment_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SarsResponse] ADD CONSTRAINT [SarsResponse_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ServiceLineTool] ADD CONSTRAINT [ServiceLineTool_toolId_fkey] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ServiceLineUser] ADD CONSTRAINT [ServiceLineUser_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskAcceptance] ADD CONSTRAINT [TaskAcceptance_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskBudget] ADD CONSTRAINT [TaskBudget_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskBudget] ADD CONSTRAINT [TaskBudget_GSTaskID_fkey] FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskBudgetDisbursement] ADD CONSTRAINT [TaskBudgetDisbursement_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskBudgetDisbursement] ADD CONSTRAINT [TaskBudgetDisbursement_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskBudgetFee] ADD CONSTRAINT [TaskBudgetFee_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskBudgetFee] ADD CONSTRAINT [TaskBudgetFee_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskDocument] ADD CONSTRAINT [TaskDocument_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskEngagementLetter] ADD CONSTRAINT [TaskEngagementLetter_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskEngagementLetter] ADD CONSTRAINT [TaskEngagementLetter_templateVersionId_fkey] FOREIGN KEY ([templateVersionId]) REFERENCES [dbo].[TemplateVersion]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskIndependenceConfirmation] ADD CONSTRAINT [TaskIndependenceConfirmation_taskTeamId_fkey] FOREIGN KEY ([taskTeamId]) REFERENCES [dbo].[TaskTeam]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskStage] ADD CONSTRAINT [FK_TaskStage_Task] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskTeam] ADD CONSTRAINT [TaskTeam_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskTeam] ADD CONSTRAINT [TaskTeam_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskTool] ADD CONSTRAINT [TaskTool_addedBy_fkey] FOREIGN KEY ([addedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskTool] ADD CONSTRAINT [TaskTool_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskTool] ADD CONSTRAINT [TaskTool_toolId_fkey] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaxAdjustment] ADD CONSTRAINT [TaxAdjustment_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TemplateSection] ADD CONSTRAINT [TemplateSection_templateId_fkey] FOREIGN KEY ([templateId]) REFERENCES [dbo].[Template]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TemplateSectionVersion] ADD CONSTRAINT [TemplateSectionVersion_templateVersionId_fkey] FOREIGN KEY ([templateVersionId]) REFERENCES [dbo].[TemplateVersion]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TemplateVersion] ADD CONSTRAINT [TemplateVersion_templateId_fkey] FOREIGN KEY ([templateId]) REFERENCES [dbo].[Template]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ToolSubTab] ADD CONSTRAINT [ToolSubTab_toolId_fkey] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_Approval] FOREIGN KEY ([approvalId]) REFERENCES [dbo].[Approval]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_Category] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[VaultDocumentCategory]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_DocumentType] FOREIGN KEY ([documentType]) REFERENCES [dbo].[VaultDocumentType]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_ServiceLineMaster] FOREIGN KEY ([serviceLine]) REFERENCES [dbo].[ServiceLineMaster]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_User] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VaultDocumentCategory] ADD CONSTRAINT [FK_VaultDocumentCategory_DocumentType] FOREIGN KEY ([documentType]) REFERENCES [dbo].[VaultDocumentType]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VaultDocumentVersion] ADD CONSTRAINT [FK_VaultDocumentVersion_Document] FOREIGN KEY ([documentId]) REFERENCES [dbo].[VaultDocument]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VaultDocumentVersion] ADD CONSTRAINT [FK_VaultDocumentVersion_User] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [Wip_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [Wip_GSTaskID_fkey] FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WIPAging] ADD CONSTRAINT [WIPAging_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WIPAging] ADD CONSTRAINT [WIPAging_GSTaskID_fkey] FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WIPTransactions] ADD CONSTRAINT [WIPTransactions_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WIPTransactions] ADD CONSTRAINT [WIPTransactions_GSTaskID_fkey] FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFile] ADD CONSTRAINT [WorkspaceFile_folderId_fkey] FOREIGN KEY ([folderId]) REFERENCES [dbo].[WorkspaceFolder]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFileActivity] ADD CONSTRAINT [WorkspaceFileActivity_fileId_fkey] FOREIGN KEY ([fileId]) REFERENCES [dbo].[WorkspaceFile]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFilePermission] ADD CONSTRAINT [WorkspaceFilePermission_fileId_fkey] FOREIGN KEY ([fileId]) REFERENCES [dbo].[WorkspaceFile]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [WorkspaceFolder_parentFolderId_fkey] FOREIGN KEY ([parentFolderId]) REFERENCES [dbo].[WorkspaceFolder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [WorkspaceFolder_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

