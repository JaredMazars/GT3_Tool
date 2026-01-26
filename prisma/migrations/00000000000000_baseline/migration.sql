-- ============================================================================
-- BASELINE MIGRATION - Generated from actual database introspection
-- Date: 2026-01-25
-- Tables: 98
-- Indexes: 490
-- Foreign Keys: 131
-- Stored Procedures: 3
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

CREATE TABLE [dbo].[AcceptanceAnswer] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [responseId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [answer] NVARCHAR(Max),
    [comment] NVARCHAR(Max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceAnswer_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceAnswer_updatedAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[AcceptanceDocument] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [responseId] INT NOT NULL,
    [documentType] NVARCHAR(50) NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(200) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceDocument_uploadedAt_df] DEFAULT (getdate()),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceDocument_createdAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[AcceptanceQuestion] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [questionnaireType] NVARCHAR(50) NOT NULL,
    [sectionKey] NVARCHAR(100) NOT NULL,
    [questionKey] NVARCHAR(100) NOT NULL,
    [questionText] NVARCHAR(Max) NOT NULL,
    [description] NVARCHAR(Max),
    [fieldType] NVARCHAR(50) NOT NULL,
    [options] NVARCHAR(Max),
    [required] BIT NOT NULL CONSTRAINT [AcceptanceQuestion_required_df] DEFAULT ((1)),
    [order] INT NOT NULL,
    [riskWeight] FLOAT NOT NULL CONSTRAINT [AcceptanceQuestion_riskWeight_df] DEFAULT ((1.0)),
    [highRiskAnswers] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceQuestion_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceQuestion_updatedAt_df] DEFAULT (getdate())
);

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
    [session_state] NVARCHAR(1000)
);

CREATE TABLE [dbo].[Accounts] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [OfficeDesc] NVARCHAR(100) NOT NULL
);

CREATE TABLE [dbo].[AdjustmentDocument] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [taxAdjustmentId] INT,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileType] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [uploadedBy] NVARCHAR(1000),
    [extractionStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [AdjustmentDocument_extractionStatus_df] DEFAULT ('PENDING'),
    [extractedData] NVARCHAR(1000),
    [extractionError] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdjustmentDocument_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[AITaxReport] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [executiveSummary] NVARCHAR(Max) NOT NULL,
    [risks] NVARCHAR(Max) NOT NULL,
    [taxSensitiveItems] NVARCHAR(Max) NOT NULL,
    [detailedFindings] NVARCHAR(Max) NOT NULL,
    [recommendations] NVARCHAR(Max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AITaxReport_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[Approval] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [workflowType] VARCHAR(50) NOT NULL,
    [workflowId] INT NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [priority] VARCHAR(20) NOT NULL CONSTRAINT [DF_Approval_priority] DEFAULT ('MEDIUM'),
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(Max),
    [requestedById] NVARCHAR(1000) NOT NULL,
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Approval_requestedAt] DEFAULT (getdate()),
    [currentStepId] INT,
    [requiresAllSteps] BIT NOT NULL CONSTRAINT [DF_Approval_requiresAllSteps] DEFAULT ((0)),
    [completedAt] DATETIME2,
    [completedById] NVARCHAR(1000),
    [resolutionComment] NVARCHAR(Max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_Approval_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ApprovalDelegation] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [fromUserId] NVARCHAR(1000) NOT NULL,
    [toUserId] NVARCHAR(1000) NOT NULL,
    [workflowType] VARCHAR(50),
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2,
    [reason] NVARCHAR(500),
    [isActive] BIT NOT NULL CONSTRAINT [DF_ApprovalDelegation_isActive] DEFAULT ((1)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ApprovalDelegation_createdAt] DEFAULT (getdate())
);

CREATE TABLE [dbo].[ApprovalRoute] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [workflowType] VARCHAR(50) NOT NULL,
    [routeName] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [routeConfig] NVARCHAR(Max) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [DF_ApprovalRoute_isActive] DEFAULT ((1)),
    [isDefault] BIT NOT NULL CONSTRAINT [DF_ApprovalRoute_isDefault] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ApprovalRoute_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ApprovalStep] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [approvalId] INT NOT NULL,
    [stepOrder] INT NOT NULL,
    [stepType] VARCHAR(50) NOT NULL,
    [isRequired] BIT NOT NULL CONSTRAINT [DF_ApprovalStep_isRequired] DEFAULT ((1)),
    [assignedToUserId] NVARCHAR(1000),
    [assignedToRole] VARCHAR(50),
    [assignedToCondition] NVARCHAR(Max),
    [status] VARCHAR(20) NOT NULL CONSTRAINT [DF_ApprovalStep_status] DEFAULT ('PENDING'),
    [approvedAt] DATETIME2,
    [approvedById] NVARCHAR(1000),
    [comment] NVARCHAR(Max),
    [isDelegated] BIT NOT NULL CONSTRAINT [DF_ApprovalStep_isDelegated] DEFAULT ((0)),
    [delegatedToUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ApprovalStep_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[BDActivity] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [opportunityId] INT NOT NULL,
    [contactId] INT,
    [activityType] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(Max),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [BDActivity_status_df] DEFAULT ('SCHEDULED'),
    [dueDate] DATETIME2,
    [completedAt] DATETIME2,
    [duration] INT,
    [location] NVARCHAR(1000),
    [assignedTo] NVARCHAR(1000) NOT NULL,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDActivity_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[BDContact] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [country] NVARCHAR(1000) CONSTRAINT [BDContact_country_df] DEFAULT ('South Africa'),
    [notes] NVARCHAR(Max),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDContact_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[BDNote] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [opportunityId] INT NOT NULL,
    [content] NVARCHAR(Max) NOT NULL,
    [isPrivate] BIT NOT NULL CONSTRAINT [BDNote_isPrivate_df] DEFAULT ((0)),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDNote_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[BDOpportunity] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(Max),
    [companyName] NVARCHAR(1000),
    [contactId] INT,
    [serviceLine] NVARCHAR(1000) NOT NULL,
    [stageId] INT NOT NULL,
    [value] FLOAT,
    [probability] FLOAT,
    [expectedCloseDate] DATETIME2,
    [source] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [BDOpportunity_status_df] DEFAULT ('OPEN'),
    [lostReason] NVARCHAR(1000),
    [assignedTo] NVARCHAR(1000) NOT NULL,
    [convertedToClientId] INT,
    [convertedAt] DATETIME2,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDOpportunity_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [clientId] INT
);

CREATE TABLE [dbo].[BDProposal] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [opportunityId] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(Max),
    [fileName] NVARCHAR(1000) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [proposedValue] FLOAT,
    [validUntil] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [BDProposal_status_df] DEFAULT ('DRAFT'),
    [sentAt] DATETIME2,
    [viewedAt] DATETIME2,
    [respondedAt] DATETIME2,
    [version] INT NOT NULL CONSTRAINT [BDProposal_version_df] DEFAULT ((1)),
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDProposal_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[BDStage] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [order] INT NOT NULL,
    [probability] FLOAT NOT NULL,
    [serviceLine] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [BDStage_isActive_df] DEFAULT ((1)),
    [isDefault] BIT NOT NULL CONSTRAINT [BDStage_isDefault_df] DEFAULT ((0)),
    [color] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BDStage_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[BugReport] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [reportedBy] NVARCHAR(1000) NOT NULL,
    [reportedAt] DATETIME2 NOT NULL CONSTRAINT [BugReport_reportedAt_df] DEFAULT (getdate()),
    [url] NVARCHAR(500) NOT NULL,
    [description] NVARCHAR(Max) NOT NULL,
    [screenshotPath] NVARCHAR(500),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [BugReport_status_df] DEFAULT ('OPEN'),
    [testedAt] DATETIME2,
    [testedBy] NVARCHAR(1000),
    [resolvedAt] DATETIME2,
    [resolvedBy] NVARCHAR(1000),
    [resolutionNotes] NVARCHAR(Max),
    [priority] NVARCHAR(20) NOT NULL CONSTRAINT [BugReport_priority_df] DEFAULT ('MEDIUM')
);

CREATE TABLE [dbo].[CategoryApprover] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [categoryId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [stepOrder] INT NOT NULL CONSTRAINT [DF__CategoryA__stepO__01] DEFAULT ((1)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__CategoryA__creat__02] DEFAULT (getdate()),
    [createdBy] NVARCHAR(1000) NOT NULL
);

CREATE TABLE [dbo].[Client] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Client_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER NOT NULL
);

CREATE TABLE [dbo].[ClientAcceptance] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [clientId] INT NOT NULL,
    [riskRating] NVARCHAR(20),
    [overallRiskScore] FLOAT,
    [riskSummary] NVARCHAR(Max),
    [completedAt] DATETIME2,
    [completedBy] NVARCHAR(200),
    [approvedAt] DATETIME2,
    [approvedBy] NVARCHAR(200),
    [approvalId] INT,
    [validUntil] DATETIME2,
    [lastReviewedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptance_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptance_updatedAt] DEFAULT (getdate()),
    [userId] NVARCHAR(1000),
    [researchData] NVARCHAR(Max),
    [researchedAt] DATETIME2,
    [researchCompleted] BIT NOT NULL CONSTRAINT [ClientAcceptance_researchCompleted_df] DEFAULT ((0)),
    [researchSkipped] BIT NOT NULL CONSTRAINT [ClientAcceptance_researchSkipped_df] DEFAULT ((0)),
    [pendingInchargeCode] NVARCHAR(10),
    [pendingManagerCode] NVARCHAR(10),
    [pendingPartnerCode] NVARCHAR(10),
    [teamChangesApplied] BIT NOT NULL CONSTRAINT [ClientAcceptance_teamChangesApplied_df] DEFAULT ((0)),
    [teamChangesAppliedAt] DATETIME2
);

CREATE TABLE [dbo].[ClientAcceptanceAnswer] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [clientAcceptanceId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [answer] NVARCHAR(Max),
    [comment] NVARCHAR(Max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptanceAnswer_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptanceAnswer_updatedAt] DEFAULT (getdate())
);

CREATE TABLE [dbo].[ClientAcceptanceResponse] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [clientId] INT NOT NULL,
    [questionnaireType] NVARCHAR(50) NOT NULL,
    [overallRiskScore] FLOAT,
    [riskRating] NVARCHAR(20),
    [riskSummary] NVARCHAR(Max),
    [completedAt] DATETIME2,
    [completedBy] NVARCHAR(200),
    [reviewedBy] NVARCHAR(200),
    [reviewedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientAcceptanceResponse_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ClientAcceptanceResponse_updatedAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[ClientAnalyticsDocument] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [clientId] INT NOT NULL,
    [documentType] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [ClientAnalyticsDocument_uploadedAt_df] DEFAULT (getdate()),
    [extractedData] NVARCHAR(Max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientAnalyticsDocument_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ClientCreditRating] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [clientId] INT NOT NULL,
    [ratingScore] FLOAT NOT NULL,
    [ratingGrade] NVARCHAR(1000) NOT NULL,
    [ratingDate] DATETIME2 NOT NULL CONSTRAINT [ClientCreditRating_ratingDate_df] DEFAULT (getdate()),
    [analysisReport] NVARCHAR(Max) NOT NULL,
    [financialRatios] NVARCHAR(Max) NOT NULL,
    [confidence] FLOAT NOT NULL,
    [analyzedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientCreditRating_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ClientPartnerManagerChangeRequest] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [clientId] INT NOT NULL,
    [changeType] VARCHAR(20) NOT NULL,
    [currentEmployeeCode] NVARCHAR(10) NOT NULL,
    [currentEmployeeName] NVARCHAR(100),
    [proposedEmployeeCode] NVARCHAR(10) NOT NULL,
    [proposedEmployeeName] NVARCHAR(100),
    [reason] NVARCHAR(500),
    [status] VARCHAR(20) NOT NULL,
    [requestedById] NVARCHAR(1000) NOT NULL,
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientPartnerManagerChangeRequest_requestedAt] DEFAULT (getdate()),
    [resolvedById] NVARCHAR(1000),
    [resolvedAt] DATETIME2,
    [resolutionComment] NVARCHAR(500),
    [requiresDualApproval] BIT NOT NULL CONSTRAINT [DF_ClientPartnerManagerChangeRequest_requiresDualApproval] DEFAULT ((0)),
    [currentEmployeeApprovedAt] DATETIME2,
    [currentEmployeeApprovedById] NVARCHAR(1000),
    [proposedEmployeeApprovedAt] DATETIME2,
    [proposedEmployeeApprovedById] NVARCHAR(1000),
    [approvalId] INT
);

CREATE TABLE [dbo].[ComplianceChecklist] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(Max),
    [dueDate] DATETIME2,
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [ComplianceChecklist_priority_df] DEFAULT ('MEDIUM'),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ComplianceChecklist_status_df] DEFAULT ('PENDING'),
    [assignedTo] NVARCHAR(1000),
    [completedAt] DATETIME2,
    [completedBy] NVARCHAR(1000),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ComplianceChecklist_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[Creditors] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [MatchNr] NVARCHAR(20) NOT NULL
);

CREATE TABLE [dbo].[CreditRatingDocument] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [creditRatingId] INT NOT NULL,
    [analyticsDocumentId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CreditRatingDocument_createdAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[Debtors] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_Debtors_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[DrsTransactions] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DrsTransactions_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[EmailLog] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [recipientEmail] NVARCHAR(1000) NOT NULL,
    [recipientUserId] NVARCHAR(1000),
    [emailType] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [errorMessage] NVARCHAR(1000),
    [metadata] NVARCHAR(Max),
    [sentAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailLog_createdAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[Employee] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__Employee__create__15C52FC4] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ExternalLink] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [url] NVARCHAR(500) NOT NULL,
    [icon] NVARCHAR(50) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [ExternalLink_active_df] DEFAULT ((1)),
    [sortOrder] INT NOT NULL CONSTRAINT [ExternalLink_sortOrder_df] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExternalLink_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[FilingStatus] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [filingType] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [FilingStatus_status_df] DEFAULT ('PENDING'),
    [deadline] DATETIME2,
    [submittedDate] DATETIME2,
    [approvedDate] DATETIME2,
    [referenceNumber] NVARCHAR(1000),
    [notes] NVARCHAR(Max),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FilingStatus_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[FiscalPeriod] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_FiscalPeriod_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[GL] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [AccStatus] NVARCHAR(50)
);

CREATE TABLE [dbo].[GLBudgets] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [GSBudgetID] UNIQUEIDENTIFIER NOT NULL,
    [GSBudgetTypeID] UNIQUEIDENTIFIER NOT NULL,
    [GSAccountID] UNIQUEIDENTIFIER NOT NULL,
    [BudgetCode] NVARCHAR(10) NOT NULL,
    [PeriodYear] INT NOT NULL,
    [PeriodNumber] INT NOT NULL,
    [BudgetAmount] FLOAT
);

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
    [LastUpdated] DATETIME CONSTRAINT [DF_GS_Stg_TSChargeable_LastUpdated] DEFAULT (getdate())
);

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
    [LastUpdated] DATETIME CONSTRAINT [DF_GS_TSChargeable_LastUpdated] DEFAULT (getdate())
);

CREATE TABLE [dbo].[InAppNotification] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [taskId] INT,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(Max) NOT NULL,
    [actionUrl] NVARCHAR(1000),
    [isRead] BIT NOT NULL CONSTRAINT [InAppNotification_isRead_df] DEFAULT ((0)),
    [readAt] DATETIME2,
    [metadata] NVARCHAR(Max),
    [fromUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InAppNotification_createdAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[LeaderGroup] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [createdById] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LeaderGroup_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [type] NVARCHAR(20) NOT NULL CONSTRAINT [LeaderGroup_type_df] DEFAULT ('GROUP')
);

CREATE TABLE [dbo].[LeaderGroupMember] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [leaderGroupId] INT NOT NULL,
    [employeeId] INT NOT NULL,
    [addedById] NVARCHAR(1000) NOT NULL,
    [addedAt] DATETIME2 NOT NULL CONSTRAINT [LeaderGroupMember_addedAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[LegalPrecedent] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [caseName] NVARCHAR(1000) NOT NULL,
    [citation] NVARCHAR(1000) NOT NULL,
    [court] NVARCHAR(1000),
    [year] INT,
    [summary] NVARCHAR(Max) NOT NULL,
    [relevance] NVARCHAR(Max),
    [link] NVARCHAR(1000),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LegalPrecedent_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[MappedAccount] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [accountCode] NVARCHAR(1000) NOT NULL,
    [accountName] NVARCHAR(1000) NOT NULL,
    [section] NVARCHAR(1000) NOT NULL,
    [subsection] NVARCHAR(1000) NOT NULL,
    [balance] FLOAT NOT NULL,
    [priorYearBalance] FLOAT NOT NULL CONSTRAINT [MappedAccount_priorYearBalance_df] DEFAULT ((0)),
    [sarsItem] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MappedAccount_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [taskId] INT NOT NULL
);

CREATE TABLE [dbo].[NewsBulletin] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [summary] NVARCHAR(500) NOT NULL,
    [body] NVARCHAR(Max) NOT NULL,
    [category] NVARCHAR(50) NOT NULL,
    [serviceLine] NVARCHAR(50),
    [effectiveDate] DATETIME2 NOT NULL,
    [expiresAt] DATETIME2,
    [contactPerson] NVARCHAR(255),
    [actionRequired] BIT NOT NULL CONSTRAINT [NewsBulletin_actionRequired_df] DEFAULT ((0)),
    [callToActionUrl] NVARCHAR(500),
    [callToActionText] NVARCHAR(100),
    [isPinned] BIT NOT NULL CONSTRAINT [NewsBulletin_isPinned_df] DEFAULT ((0)),
    [isActive] BIT NOT NULL CONSTRAINT [NewsBulletin_isActive_df] DEFAULT ((1)),
    [createdById] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NewsBulletin_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [documentFileName] NVARCHAR(255),
    [documentFilePath] NVARCHAR(500),
    [documentFileSize] INT,
    [documentUploadedAt] DATETIME2,
    [showDocumentLink] BIT NOT NULL CONSTRAINT [NewsBulletin_showDocumentLink_df] DEFAULT ((0))
);

CREATE TABLE [dbo].[NonClientAllocation] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [eventType] NVARCHAR(50) NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [allocatedHours] DECIMAL(10, 2) NOT NULL,
    [allocatedPercentage] INT NOT NULL CONSTRAINT [NonClientAllocation_allocatedPercentage_df] DEFAULT ((100)),
    [notes] NVARCHAR(Max),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NonClientAllocation_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [employeeId] INT NOT NULL
);

CREATE TABLE [dbo].[NotificationPreference] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [taskId] INT,
    [notificationType] NVARCHAR(1000) NOT NULL,
    [emailEnabled] BIT NOT NULL CONSTRAINT [NotificationPreference_emailEnabled_df] DEFAULT ((1)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NotificationPreference_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[OpinionChatMessage] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [opinionDraftId] INT NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(Max) NOT NULL,
    [metadata] NVARCHAR(Max),
    [sectionGenerationId] NVARCHAR(1000),
    [sectionType] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionChatMessage_createdAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[OpinionDocument] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [opinionDraftId] INT NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileType] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [extractedText] NVARCHAR(Max),
    [vectorized] BIT NOT NULL CONSTRAINT [OpinionDocument_vectorized_df] DEFAULT ((0)),
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionDocument_createdAt_df] DEFAULT (getdate())
);

CREATE TABLE [dbo].[OpinionDraft] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [version] INT NOT NULL CONSTRAINT [OpinionDraft_version_df] DEFAULT ((1)),
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(Max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [OpinionDraft_status_df] DEFAULT ('DRAFT'),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionDraft_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[OpinionSection] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [opinionDraftId] INT NOT NULL,
    [sectionType] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(Max) NOT NULL,
    [aiGenerated] BIT NOT NULL CONSTRAINT [OpinionSection_aiGenerated_df] DEFAULT ((0)),
    [reviewed] BIT NOT NULL CONSTRAINT [OpinionSection_reviewed_df] DEFAULT ((0)),
    [reviewedBy] NVARCHAR(1000),
    [reviewedAt] DATETIME2,
    [order] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OpinionSection_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[PagePermission] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [pathname] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [accessLevel] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(Max),
    [active] BIT NOT NULL CONSTRAINT [PagePermission_active_df] DEFAULT ((1)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PagePermission_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [createdBy] NVARCHAR(1000)
);

CREATE TABLE [dbo].[PageRegistry] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [pathname] NVARCHAR(1000) NOT NULL,
    [pageTitle] NVARCHAR(1000),
    [category] NVARCHAR(1000),
    [discovered] BIT NOT NULL CONSTRAINT [PageRegistry_discovered_df] DEFAULT ((1)),
    [active] BIT NOT NULL CONSTRAINT [PageRegistry_active_df] DEFAULT ((1)),
    [lastSeen] DATETIME2 NOT NULL CONSTRAINT [PageRegistry_lastSeen_df] DEFAULT (getdate()),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PageRegistry_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ResearchNote] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(Max) NOT NULL,
    [tags] NVARCHAR(1000),
    [category] NVARCHAR(1000),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ResearchNote_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ReviewCategory] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [serviceLine] NVARCHAR(50),
    [active] BIT NOT NULL CONSTRAINT [ReviewCategory_active_df] DEFAULT ((1)),
    [sortOrder] INT NOT NULL CONSTRAINT [ReviewCategory_sortOrder_df] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReviewCategory_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ReviewNote] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(Max),
    [referenceUrl] NVARCHAR(1000),
    [referenceType] NVARCHAR(20) NOT NULL CONSTRAINT [ReviewNote_referenceType_df] DEFAULT ('EXTERNAL'),
    [referenceId] NVARCHAR(100),
    [section] NVARCHAR(255),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [ReviewNote_status_df] DEFAULT ('OPEN'),
    [priority] NVARCHAR(20) NOT NULL CONSTRAINT [ReviewNote_priority_df] DEFAULT ('MEDIUM'),
    [categoryId] INT,
    [dueDate] DATETIME2,
    [raisedBy] NVARCHAR(1000) NOT NULL,
    [assignedTo] NVARCHAR(1000),
    [addressedAt] DATETIME2,
    [addressedBy] NVARCHAR(1000),
    [addressedComment] NVARCHAR(Max),
    [clearedAt] DATETIME2,
    [clearedBy] NVARCHAR(1000),
    [clearanceComment] NVARCHAR(Max),
    [rejectedAt] DATETIME2,
    [rejectionReason] NVARCHAR(Max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNote_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [currentOwner] NVARCHAR(1000),
    [lastRespondedBy] NVARCHAR(1000),
    [lastRespondedAt] DATETIME2
);

CREATE TABLE [dbo].[ReviewNoteAssignee] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [reviewNoteId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [assignedAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNoteAssignee_assignedAt_df] DEFAULT (getdate()),
    [assignedBy] NVARCHAR(1000) NOT NULL,
    [isForwarded] BIT NOT NULL CONSTRAINT [ReviewNoteAssignee_isForwarded_df] DEFAULT ((0))
);

CREATE TABLE [dbo].[ReviewNoteAttachment] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [reviewNoteId] INT NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [fileType] NVARCHAR(100) NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNoteAttachment_createdAt_df] DEFAULT (getdate()),
    [commentId] INT
);

CREATE TABLE [dbo].[ReviewNoteComment] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [reviewNoteId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [comment] NVARCHAR(Max) NOT NULL,
    [isInternal] BIT NOT NULL CONSTRAINT [ReviewNoteComment_isInternal_df] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReviewNoteComment_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[SarsResponse] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [referenceNumber] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(Max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [SarsResponse_status_df] DEFAULT ('PENDING'),
    [responseType] NVARCHAR(1000) NOT NULL,
    [deadline] DATETIME2,
    [sentDate] DATETIME2,
    [receivedDate] DATETIME2,
    [documentPath] NVARCHAR(1000),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SarsResponse_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ServiceLineExternal] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [ServLineCode] NVARCHAR(10),
    [ServLineDesc] NVARCHAR(150),
    [GLPrefix] NVARCHAR(10),
    [SLGroup] NVARCHAR(10),
    [masterCode] NVARCHAR(50),
    [SubServlineGroupCode] NVARCHAR(10),
    [SubServlineGroupDesc] NVARCHAR(150),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ServiceLineExternal_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [Active] BIT
);

CREATE TABLE [dbo].[ServiceLineMaster] (
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(500),
    [active] BIT NOT NULL CONSTRAINT [ServiceLineMaster_active_df] DEFAULT ((1)),
    [sortOrder] INT NOT NULL CONSTRAINT [ServiceLineMaster_sortOrder_df] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ServiceLineMaster_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ServiceLineTool] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [subServiceLineGroup] NVARCHAR(50) NOT NULL,
    [toolId] INT NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [ServiceLineTool_active_df] DEFAULT ((1)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__ServiceLi__creat__08362A7C] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ServiceLineUser] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [subServiceLineGroup] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [ServiceLineUser_role_df] DEFAULT ('USER'),
    [assignmentType] NVARCHAR(1000) NOT NULL CONSTRAINT [ServiceLineUser_assignmentType_df] DEFAULT ('SPECIFIC_SUBGROUP'),
    [parentAssignmentId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ServiceLineUser_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [masterCode] NVARCHAR(50)
);

CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionToken] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[StandardTask] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [GSStdTaskID] UNIQUEIDENTIFIER NOT NULL,
    [StdTaskCode] NVARCHAR(10) NOT NULL,
    [StdTaskDesc] NVARCHAR(150) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_StandardTask_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[Task] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Task_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [taskYear] INT NOT NULL
);

CREATE TABLE [dbo].[TaskAcceptance] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [acceptanceApproved] BIT NOT NULL CONSTRAINT [TaskAcceptance_acceptanceApproved_df] DEFAULT ((0)),
    [approvedBy] NVARCHAR(1000),
    [approvedAt] DATETIME2,
    [questionnaireType] NVARCHAR(1000),
    [overallRiskScore] FLOAT,
    [riskRating] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskAcceptance_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[TaskBudget] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskBudget_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [BudApproveDate] DATETIME2,
    [BudDueDate] DATETIME2,
    [BudStartDate] DATETIME2
);

CREATE TABLE [dbo].[TaskBudgetDisbursement] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [description] NVARCHAR(255) NOT NULL,
    [amount] DECIMAL(18, 2) NOT NULL,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskBudgetDisbursement_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [expectedDate] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[TaskBudgetFee] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [description] NVARCHAR(255) NOT NULL,
    [amount] DECIMAL(18, 2) NOT NULL,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskBudgetFee_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [expectedDate] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[TaskDocument] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileType] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [version] INT NOT NULL CONSTRAINT [TaskDocument_version_df] DEFAULT ((1)),
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskDocument_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[TaskEngagementLetter] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [generated] BIT NOT NULL CONSTRAINT [TaskEngagementLetter_generated_df] DEFAULT ((0)),
    [uploaded] BIT NOT NULL CONSTRAINT [TaskEngagementLetter_uploaded_df] DEFAULT ((0)),
    [filePath] NVARCHAR(1000),
    [content] NVARCHAR(Max),
    [templateId] INT,
    [generatedAt] DATETIME2,
    [generatedBy] NVARCHAR(1000),
    [uploadedAt] DATETIME2,
    [uploadedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskEngagementLetter_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [dpaUploaded] BIT NOT NULL CONSTRAINT [DF_TaskEngagementLetter_dpaUploaded] DEFAULT ((0)),
    [dpaFilePath] NVARCHAR(Max),
    [dpaUploadedAt] DATETIME2,
    [dpaUploadedBy] NVARCHAR(Max),
    [elExtractionStatus] NVARCHAR(20),
    [elExtractionError] NVARCHAR(Max),
    [elLetterDate] DATETIME2,
    [elLetterAge] INT,
    [elSigningPartner] NVARCHAR(100),
    [elSigningPartnerCode] NVARCHAR(10),
    [elServicesCovered] NVARCHAR(Max),
    [elHasPartnerSignature] BIT,
    [elHasClientSignature] BIT,
    [elHasTermsConditions] BIT,
    [elHasTcPartnerSignature] BIT,
    [elHasTcClientSignature] BIT,
    [elExtractedText] NVARCHAR(Max),
    [dpaExtractionStatus] NVARCHAR(20),
    [dpaExtractionError] NVARCHAR(Max),
    [dpaLetterDate] DATETIME2,
    [dpaLetterAge] INT,
    [dpaSigningPartner] NVARCHAR(100),
    [dpaSigningPartnerCode] NVARCHAR(10),
    [dpaHasPartnerSignature] BIT,
    [dpaHasClientSignature] BIT,
    [dpaExtractedText] NVARCHAR(Max),
    [templateVersionId] INT
);

CREATE TABLE [dbo].[TaskIndependenceConfirmation] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskTeamId] INT NOT NULL,
    [confirmed] BIT NOT NULL CONSTRAINT [TaskIndependenceConfirmation_confirmed_df] DEFAULT ((0)),
    [confirmedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskIndependenceConfirmation_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[TaskStage] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [stage] NVARCHAR(50) NOT NULL,
    [movedBy] NVARCHAR(Max) NOT NULL,
    [notes] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_TaskStage_createdAt] DEFAULT (getdate())
);

CREATE TABLE [dbo].[TaskTeam] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [TaskTeam_role_df] DEFAULT ('VIEWER'),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskTeam_createdAt_df] DEFAULT (getdate()),
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [allocatedHours] DECIMAL(10, 2),
    [allocatedPercentage] INT,
    [actualHours] DECIMAL(10, 2)
);

CREATE TABLE [dbo].[TaskTool] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [toolId] INT NOT NULL,
    [addedBy] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [TaskTool_sortOrder_df] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__TaskTool__create__0EE3280B] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[TaxAdjustment] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [taskId] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [TaxAdjustment_status_df] DEFAULT ('SUGGESTED'),
    [sourceDocuments] NVARCHAR(1000),
    [extractedData] NVARCHAR(1000),
    [calculationDetails] NVARCHAR(1000),
    [notes] NVARCHAR(1000),
    [sarsSection] NVARCHAR(1000),
    [confidenceScore] FLOAT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaxAdjustment_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[Template] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [serviceLine] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [Template_active_df] DEFAULT ((1)),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Template_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [currentVersion] INT NOT NULL CONSTRAINT [Template_currentVersion_df] DEFAULT ((1))
);

CREATE TABLE [dbo].[TemplateSection] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [templateId] INT NOT NULL,
    [sectionKey] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(Max) NOT NULL,
    [isRequired] BIT NOT NULL CONSTRAINT [TemplateSection_isRequired_df] DEFAULT ((1)),
    [isAiAdaptable] BIT NOT NULL CONSTRAINT [TemplateSection_isAiAdaptable_df] DEFAULT ((0)),
    [order] INT NOT NULL,
    [applicableServiceLines] NVARCHAR(Max),
    [applicableProjectTypes] NVARCHAR(Max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TemplateSection_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[TemplateSectionVersion] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [templateVersionId] INT NOT NULL,
    [sectionKey] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(Max) NOT NULL,
    [isRequired] BIT NOT NULL CONSTRAINT [TemplateSectionVersion_isRequired_df] DEFAULT ((1)),
    [isAiAdaptable] BIT NOT NULL CONSTRAINT [TemplateSectionVersion_isAiAdaptable_df] DEFAULT ((0)),
    [order] INT NOT NULL,
    [applicableServiceLines] NVARCHAR(Max),
    [applicableProjectTypes] NVARCHAR(Max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__TemplateS__creat__6359AB88] DEFAULT (getdate())
);

CREATE TABLE [dbo].[TemplateVersion] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [templateId] INT NOT NULL,
    [version] INT NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [serviceLine] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [TemplateVersion_isActive_df] DEFAULT ((0)),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__TemplateV__creat__5DA0D232] DEFAULT (getdate()),
    [changeNotes] NVARCHAR(Max)
);

CREATE TABLE [dbo].[Tool] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(Max),
    [icon] NVARCHAR(50),
    [componentPath] NVARCHAR(500) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Tool_active_df] DEFAULT ((1)),
    [sortOrder] INT NOT NULL CONSTRAINT [Tool_sortOrder_df] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__Tool__createdAt__7ADC2F5E] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[ToolSubTab] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [toolId] INT NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [componentPath] NVARCHAR(500) NOT NULL,
    [icon] NVARCHAR(50),
    [sortOrder] INT NOT NULL CONSTRAINT [ToolSubTab_sortOrder_df] DEFAULT ((0)),
    [active] BIT NOT NULL CONSTRAINT [ToolSubTab_active_df] DEFAULT ((1)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__ToolSubTa__creat__01892CED] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [emailVerified] DATETIME2,
    [image] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT ('USER'),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[VaultDocument] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(Max),
    [documentType] NVARCHAR(50) NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [mimeType] NVARCHAR(100) NOT NULL,
    [categoryId] INT NOT NULL,
    [scope] NVARCHAR(50) NOT NULL,
    [serviceLine] NVARCHAR(50),
    [version] INT NOT NULL CONSTRAINT [DF__VaultDocu__versi__72D0F942] DEFAULT ((1)),
    [status] NVARCHAR(50) NOT NULL,
    [approvalId] INT,
    [aiExtractionStatus] NVARCHAR(50) NOT NULL CONSTRAINT [DF__VaultDocu__aiExt__73C51D7B] DEFAULT ('PENDING'),
    [aiSummary] NVARCHAR(Max),
    [aiKeyPoints] NVARCHAR(Max),
    [aiExtractedText] NVARCHAR(Max),
    [effectiveDate] DATE,
    [expiryDate] DATE,
    [tags] NVARCHAR(Max),
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [publishedAt] DATETIME2,
    [archivedAt] DATETIME2,
    [archivedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__creat__74B941B4] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__updat__75AD65ED] DEFAULT (getdate()),
    [documentVersion] NVARCHAR(50)
);

CREATE TABLE [dbo].[VaultDocumentCategory] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(500),
    [icon] NVARCHAR(50),
    [color] NVARCHAR(20),
    [documentType] NVARCHAR(50),
    [active] BIT NOT NULL CONSTRAINT [DF__VaultDocu__activ__6D181FEC] DEFAULT ((1)),
    [sortOrder] INT NOT NULL CONSTRAINT [DF__VaultDocu__sortO__6E0C4425] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__creat__6F00685E] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__updat__6FF48C97] DEFAULT (getdate())
);

CREATE TABLE [dbo].[VaultDocumentType] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [icon] NVARCHAR(50),
    [color] NVARCHAR(20),
    [active] BIT NOT NULL CONSTRAINT [DF__VaultDocu__activ__06D7F1EF] DEFAULT ((1)),
    [sortOrder] INT NOT NULL CONSTRAINT [DF__VaultDocu__sortO__07CC1628] DEFAULT ((0)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__creat__08C03A61] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__updat__09B45E9A] DEFAULT (getdate())
);

CREATE TABLE [dbo].[VaultDocumentVersion] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [documentId] INT NOT NULL,
    [version] INT NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [DF__VaultDocu__uploa__011F1899] DEFAULT (getdate()),
    [supersededAt] DATETIME2,
    [changeNotes] NVARCHAR(Max)
);

CREATE TABLE [dbo].[VerificationToken] (
    [identifier] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[Wip] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_Wip_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[WIPAging] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WIPAging_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[WIPTransactions] (
    [id] INT IDENTITY(1,1) NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WIPTransactions_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[WorkspaceFile] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [folderId] INT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(Max),
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
    [version] INT NOT NULL CONSTRAINT [WorkspaceFile_version_df] DEFAULT ((1)),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFile_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL
);

CREATE TABLE [dbo].[WorkspaceFileActivity] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [fileId] INT NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [action] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(500),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFileActivity_timestamp] DEFAULT (getdate())
);

CREATE TABLE [dbo].[WorkspaceFilePermission] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [fileId] INT NOT NULL,
    [userId] NVARCHAR(200),
    [role] NVARCHAR(50) NOT NULL,
    [serviceLine] NVARCHAR(50),
    [grantedBy] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFilePermission_createdAt] DEFAULT (getdate())
);

CREATE TABLE [dbo].[WorkspaceFolder] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(Max),
    [serviceLine] NVARCHAR(50),
    [subServiceLineGroup] NVARCHAR(100),
    [parentFolderId] INT,
    [driveId] NVARCHAR(255),
    [itemId] NVARCHAR(255),
    [sharepointUrl] NVARCHAR(500),
    [createdBy] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFolder_createdAt] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [WorkspaceFolder_active_df] DEFAULT ((1)),
    [taskId] INT
);


-- ============================================================================
-- PART 2: CREATE INDEXES
-- ============================================================================

CREATE NONCLUSTERED INDEX [AcceptanceAnswer_questionId_idx]
ON [dbo].[AcceptanceAnswer]([questionId]);

CREATE NONCLUSTERED INDEX [AcceptanceAnswer_responseId_idx]
ON [dbo].[AcceptanceAnswer]([responseId]);

CREATE UNIQUE NONCLUSTERED INDEX [AcceptanceAnswer_responseId_questionId_key]
ON [dbo].[AcceptanceAnswer]([responseId], [questionId]);

-- Primary Key: [PK__Acceptan__3213E83F4AB0FF4B] on [AcceptanceAnswer]
ALTER TABLE [dbo].[AcceptanceAnswer] ADD CONSTRAINT [PK__Acceptan__3213E83F4AB0FF4B] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [AcceptanceDocument_documentType_idx]
ON [dbo].[AcceptanceDocument]([documentType]);

CREATE NONCLUSTERED INDEX [AcceptanceDocument_responseId_idx]
ON [dbo].[AcceptanceDocument]([responseId]);

-- Primary Key: [PK__Acceptan__3213E83FEBEE39E6] on [AcceptanceDocument]
ALTER TABLE [dbo].[AcceptanceDocument] ADD CONSTRAINT [PK__Acceptan__3213E83FEBEE39E6] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [AcceptanceQuestion_questionnaireType_idx]
ON [dbo].[AcceptanceQuestion]([questionnaireType]);

CREATE NONCLUSTERED INDEX [AcceptanceQuestion_questionnaireType_order_idx]
ON [dbo].[AcceptanceQuestion]([questionnaireType], [order]);

CREATE UNIQUE NONCLUSTERED INDEX [AcceptanceQuestion_questionnaireType_questionKey_key]
ON [dbo].[AcceptanceQuestion]([questionnaireType], [questionKey]);

CREATE NONCLUSTERED INDEX [AcceptanceQuestion_questionnaireType_sectionKey_idx]
ON [dbo].[AcceptanceQuestion]([questionnaireType], [sectionKey]);

-- Primary Key: [PK__Acceptan__3213E83FB3075BED] on [AcceptanceQuestion]
ALTER TABLE [dbo].[AcceptanceQuestion] ADD CONSTRAINT [PK__Acceptan__3213E83FB3075BED] PRIMARY KEY CLUSTERED ([id]);

-- Primary Key: [Account_pkey] on [Account]
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE UNIQUE NONCLUSTERED INDEX [Account_provider_providerAccountId_key]
ON [dbo].[Account]([provider], [providerAccountId]);

CREATE NONCLUSTERED INDEX [Account_userId_idx]
ON [dbo].[Account]([userId]);

CREATE NONCLUSTERED INDEX [Accounts_Account_idx]
ON [dbo].[Accounts]([Account]);

CREATE NONCLUSTERED INDEX [Accounts_AccStatus_idx]
ON [dbo].[Accounts]([AccStatus]);

CREATE NONCLUSTERED INDEX [Accounts_Category_idx]
ON [dbo].[Accounts]([Category]);

CREATE UNIQUE NONCLUSTERED INDEX [Accounts_GSAccountID_key]
ON [dbo].[Accounts]([GSAccountID]);

CREATE NONCLUSTERED INDEX [Accounts_OfficeCode_idx]
ON [dbo].[Accounts]([OfficeCode]);

-- Primary Key: [Accounts_pkey] on [Accounts]
ALTER TABLE [dbo].[Accounts] ADD CONSTRAINT [Accounts_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [AdjustmentDocument_extractionStatus_idx]
ON [dbo].[AdjustmentDocument]([extractionStatus]);

CREATE NONCLUSTERED INDEX [AdjustmentDocument_extractionStatus_taskId_idx]
ON [dbo].[AdjustmentDocument]([extractionStatus], [taskId]);

-- Primary Key: [AdjustmentDocument_pkey] on [AdjustmentDocument]
ALTER TABLE [dbo].[AdjustmentDocument] ADD CONSTRAINT [AdjustmentDocument_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [AdjustmentDocument_taskId_idx]
ON [dbo].[AdjustmentDocument]([taskId]);

CREATE NONCLUSTERED INDEX [AdjustmentDocument_taxAdjustmentId_idx]
ON [dbo].[AdjustmentDocument]([taxAdjustmentId]);

-- Primary Key: [AITaxReport_pkey] on [AITaxReport]
ALTER TABLE [dbo].[AITaxReport] ADD CONSTRAINT [AITaxReport_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [AITaxReport_taskId_idx]
ON [dbo].[AITaxReport]([taskId]);

CREATE NONCLUSTERED INDEX [Approval_requestedById_idx]
ON [dbo].[Approval]([requestedById]);

CREATE NONCLUSTERED INDEX [Approval_status_idx]
ON [dbo].[Approval]([status]);

CREATE NONCLUSTERED INDEX [Approval_workflowType_idx]
ON [dbo].[Approval]([workflowType]);

CREATE NONCLUSTERED INDEX [Approval_workflowType_workflowId_idx]
ON [dbo].[Approval]([workflowType], [workflowId]);

-- Primary Key: [PK_Approval] on [Approval]
ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [PK_Approval] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ApprovalDelegation_fromUserId_idx]
ON [dbo].[ApprovalDelegation]([fromUserId]);

CREATE NONCLUSTERED INDEX [ApprovalDelegation_fromUserId_isActive_idx]
ON [dbo].[ApprovalDelegation]([fromUserId], [isActive]);

CREATE NONCLUSTERED INDEX [ApprovalDelegation_isActive_endDate_idx]
ON [dbo].[ApprovalDelegation]([isActive], [endDate]);

-- Primary Key: [PK_ApprovalDelegation] on [ApprovalDelegation]
ALTER TABLE [dbo].[ApprovalDelegation] ADD CONSTRAINT [PK_ApprovalDelegation] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ApprovalRoute_workflowType_isDefault_idx]
ON [dbo].[ApprovalRoute]([workflowType], [isDefault]);

-- Primary Key: [PK_ApprovalRoute] on [ApprovalRoute]
ALTER TABLE [dbo].[ApprovalRoute] ADD CONSTRAINT [PK_ApprovalRoute] PRIMARY KEY CLUSTERED ([id]);

CREATE UNIQUE NONCLUSTERED INDEX [UQ_ApprovalRoute_workflowType_routeName]
ON [dbo].[ApprovalRoute]([workflowType], [routeName]);

CREATE NONCLUSTERED INDEX [ApprovalStep_approvalId_idx]
ON [dbo].[ApprovalStep]([approvalId]);

CREATE NONCLUSTERED INDEX [ApprovalStep_approvalId_stepOrder_idx]
ON [dbo].[ApprovalStep]([approvalId], [stepOrder]);

CREATE NONCLUSTERED INDEX [ApprovalStep_assignedToUserId_idx]
ON [dbo].[ApprovalStep]([assignedToUserId]);

CREATE NONCLUSTERED INDEX [ApprovalStep_status_idx]
ON [dbo].[ApprovalStep]([status]);

-- Primary Key: [PK_ApprovalStep] on [ApprovalStep]
ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [PK_ApprovalStep] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [BDActivity_activityType_idx]
ON [dbo].[BDActivity]([activityType]);

CREATE NONCLUSTERED INDEX [BDActivity_assignedTo_idx]
ON [dbo].[BDActivity]([assignedTo]);

CREATE NONCLUSTERED INDEX [BDActivity_assignedTo_status_dueDate_idx]
ON [dbo].[BDActivity]([assignedTo], [status], [dueDate]);

CREATE NONCLUSTERED INDEX [BDActivity_contactId_idx]
ON [dbo].[BDActivity]([contactId]);

CREATE NONCLUSTERED INDEX [BDActivity_dueDate_idx]
ON [dbo].[BDActivity]([dueDate]);

CREATE NONCLUSTERED INDEX [BDActivity_opportunityId_createdAt_idx]
ON [dbo].[BDActivity]([opportunityId], [createdAt]);

CREATE NONCLUSTERED INDEX [BDActivity_opportunityId_idx]
ON [dbo].[BDActivity]([opportunityId]);

-- Primary Key: [BDActivity_pkey] on [BDActivity]
ALTER TABLE [dbo].[BDActivity] ADD CONSTRAINT [BDActivity_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [BDActivity_status_idx]
ON [dbo].[BDActivity]([status]);

CREATE NONCLUSTERED INDEX [BDContact_companyName_idx]
ON [dbo].[BDContact]([companyName]);

CREATE NONCLUSTERED INDEX [BDContact_createdAt_idx]
ON [dbo].[BDContact]([createdAt]);

CREATE NONCLUSTERED INDEX [BDContact_email_idx]
ON [dbo].[BDContact]([email]);

-- Primary Key: [BDContact_pkey] on [BDContact]
ALTER TABLE [dbo].[BDContact] ADD CONSTRAINT [BDContact_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [BDNote_createdAt_idx]
ON [dbo].[BDNote]([createdAt]);

CREATE NONCLUSTERED INDEX [BDNote_opportunityId_idx]
ON [dbo].[BDNote]([opportunityId]);

-- Primary Key: [BDNote_pkey] on [BDNote]
ALTER TABLE [dbo].[BDNote] ADD CONSTRAINT [BDNote_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [BDOpportunity_assignedTo_idx]
ON [dbo].[BDOpportunity]([assignedTo]);

CREATE NONCLUSTERED INDEX [BDOpportunity_assignedTo_status_idx]
ON [dbo].[BDOpportunity]([assignedTo], [status]);

CREATE NONCLUSTERED INDEX [BDOpportunity_clientId_idx]
ON [dbo].[BDOpportunity]([clientId]);

CREATE NONCLUSTERED INDEX [BDOpportunity_convertedToClientId_idx]
ON [dbo].[BDOpportunity]([convertedToClientId]);

CREATE NONCLUSTERED INDEX [BDOpportunity_createdAt_idx]
ON [dbo].[BDOpportunity]([createdAt]);

CREATE NONCLUSTERED INDEX [BDOpportunity_expectedCloseDate_idx]
ON [dbo].[BDOpportunity]([expectedCloseDate]);

-- Primary Key: [BDOpportunity_pkey] on [BDOpportunity]
ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [BDOpportunity_serviceLine_idx]
ON [dbo].[BDOpportunity]([serviceLine]);

CREATE NONCLUSTERED INDEX [BDOpportunity_serviceLine_status_idx]
ON [dbo].[BDOpportunity]([serviceLine], [status]);

CREATE NONCLUSTERED INDEX [BDOpportunity_stageId_idx]
ON [dbo].[BDOpportunity]([stageId]);

CREATE NONCLUSTERED INDEX [BDOpportunity_status_idx]
ON [dbo].[BDOpportunity]([status]);

CREATE NONCLUSTERED INDEX [BDOpportunity_updatedAt_idx]
ON [dbo].[BDOpportunity]([updatedAt]);

CREATE NONCLUSTERED INDEX [BDProposal_opportunityId_idx]
ON [dbo].[BDProposal]([opportunityId]);

CREATE NONCLUSTERED INDEX [BDProposal_opportunityId_version_idx]
ON [dbo].[BDProposal]([opportunityId], [version]);

-- Primary Key: [BDProposal_pkey] on [BDProposal]
ALTER TABLE [dbo].[BDProposal] ADD CONSTRAINT [BDProposal_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [BDProposal_sentAt_idx]
ON [dbo].[BDProposal]([sentAt]);

CREATE NONCLUSTERED INDEX [BDProposal_status_idx]
ON [dbo].[BDProposal]([status]);

CREATE NONCLUSTERED INDEX [BDStage_isActive_idx]
ON [dbo].[BDStage]([isActive]);

CREATE NONCLUSTERED INDEX [BDStage_order_idx]
ON [dbo].[BDStage]([order]);

-- Primary Key: [BDStage_pkey] on [BDStage]
ALTER TABLE [dbo].[BDStage] ADD CONSTRAINT [BDStage_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [BDStage_serviceLine_idx]
ON [dbo].[BDStage]([serviceLine]);

CREATE UNIQUE NONCLUSTERED INDEX [BDStage_serviceLine_name_key]
ON [dbo].[BDStage]([serviceLine], [name]);

-- Primary Key: [BugReport_pkey] on [BugReport]
ALTER TABLE [dbo].[BugReport] ADD CONSTRAINT [BugReport_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [BugReport_priority_idx]
ON [dbo].[BugReport]([priority]);

CREATE NONCLUSTERED INDEX [BugReport_reportedAt_idx]
ON [dbo].[BugReport]([reportedAt]);

CREATE NONCLUSTERED INDEX [BugReport_reportedBy_idx]
ON [dbo].[BugReport]([reportedBy]);

CREATE NONCLUSTERED INDEX [BugReport_status_idx]
ON [dbo].[BugReport]([status]);

CREATE NONCLUSTERED INDEX [IX_CategoryApprover_CategoryId]
ON [dbo].[CategoryApprover]([categoryId]);

CREATE NONCLUSTERED INDEX [IX_CategoryApprover_CategoryId_StepOrder]
ON [dbo].[CategoryApprover]([categoryId], [stepOrder]);

CREATE NONCLUSTERED INDEX [IX_CategoryApprover_UserId]
ON [dbo].[CategoryApprover]([userId]);

-- Primary Key: [PK_CategoryApprover] on [CategoryApprover]
ALTER TABLE [dbo].[CategoryApprover] ADD CONSTRAINT [PK_CategoryApprover] PRIMARY KEY CLUSTERED ([id]);

CREATE UNIQUE NONCLUSTERED INDEX [UQ_CategoryApprover_CategoryId_UserId]
ON [dbo].[CategoryApprover]([categoryId], [userId]);

CREATE NONCLUSTERED INDEX [Client_active_groupCode_idx]
ON [dbo].[Client]([active], [groupCode]);

CREATE NONCLUSTERED INDEX [Client_active_industry_idx]
ON [dbo].[Client]([active], [industry]);

CREATE UNIQUE NONCLUSTERED INDEX [Client_clientCode_key]
ON [dbo].[Client]([clientCode]);

CREATE NONCLUSTERED INDEX [Client_clientTaxFlag_idx]
ON [dbo].[Client]([clientTaxFlag]);

CREATE NONCLUSTERED INDEX [Client_groupDesc_clientNameFull_idx]
ON [dbo].[Client]([groupDesc], [clientNameFull]);

CREATE UNIQUE NONCLUSTERED INDEX [Client_GSClientID_key]
ON [dbo].[Client]([GSClientID]);

CREATE NONCLUSTERED INDEX [Client_industry_clientNameFull_idx]
ON [dbo].[Client]([industry], [clientNameFull]);

-- Primary Key: [Client_pkey] on [Client]
ALTER TABLE [dbo].[Client] ADD CONSTRAINT [Client_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Client_sector_idx]
ON [dbo].[Client]([sector]);

CREATE NONCLUSTERED INDEX [Client_updatedAt_idx]
ON [dbo].[Client]([updatedAt]);

CREATE NONCLUSTERED INDEX [ClientAcceptance_approvalId_idx]
ON [dbo].[ClientAcceptance]([approvalId]);

CREATE NONCLUSTERED INDEX [ClientAcceptance_approvedAt_idx]
ON [dbo].[ClientAcceptance]([approvedAt]);

CREATE NONCLUSTERED INDEX [ClientAcceptance_clientId_idx]
ON [dbo].[ClientAcceptance]([clientId]);

CREATE UNIQUE NONCLUSTERED INDEX [ClientAcceptance_clientId_key]
ON [dbo].[ClientAcceptance]([clientId]);

CREATE NONCLUSTERED INDEX [ClientAcceptance_riskRating_idx]
ON [dbo].[ClientAcceptance]([riskRating]);

-- Primary Key: [PK__ClientAc__3213E83F94B62F26] on [ClientAcceptance]
ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [PK__ClientAc__3213E83F94B62F26] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ClientAcceptanceAnswer_clientAcceptanceId_idx]
ON [dbo].[ClientAcceptanceAnswer]([clientAcceptanceId]);

CREATE UNIQUE NONCLUSTERED INDEX [ClientAcceptanceAnswer_clientAcceptanceId_questionId_key]
ON [dbo].[ClientAcceptanceAnswer]([clientAcceptanceId], [questionId]);

CREATE NONCLUSTERED INDEX [ClientAcceptanceAnswer_questionId_idx]
ON [dbo].[ClientAcceptanceAnswer]([questionId]);

-- Primary Key: [PK__ClientAc__3213E83F4AB0FF4C] on [ClientAcceptanceAnswer]
ALTER TABLE [dbo].[ClientAcceptanceAnswer] ADD CONSTRAINT [PK__ClientAc__3213E83F4AB0FF4C] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_clientId_idx]
ON [dbo].[ClientAcceptanceResponse]([clientId]);

CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_questionnaireType_idx]
ON [dbo].[ClientAcceptanceResponse]([questionnaireType]);

CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_riskRating_idx]
ON [dbo].[ClientAcceptanceResponse]([riskRating]);

CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_taskId_idx]
ON [dbo].[ClientAcceptanceResponse]([taskId]);

CREATE NONCLUSTERED INDEX [ClientAcceptanceResponse_taskId_questionnaireType_idx]
ON [dbo].[ClientAcceptanceResponse]([taskId], [questionnaireType]);

-- Primary Key: [PK__ClientAc__3213E83F94B62F25] on [ClientAcceptanceResponse]
ALTER TABLE [dbo].[ClientAcceptanceResponse] ADD CONSTRAINT [PK__ClientAc__3213E83F94B62F25] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_clientId_idx]
ON [dbo].[ClientAnalyticsDocument]([clientId]);

CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_documentType_idx]
ON [dbo].[ClientAnalyticsDocument]([documentType]);

-- Primary Key: [ClientAnalyticsDocument_pkey] on [ClientAnalyticsDocument]
ALTER TABLE [dbo].[ClientAnalyticsDocument] ADD CONSTRAINT [ClientAnalyticsDocument_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_uploadedAt_idx]
ON [dbo].[ClientAnalyticsDocument]([uploadedAt]);

CREATE NONCLUSTERED INDEX [ClientCreditRating_clientId_idx]
ON [dbo].[ClientCreditRating]([clientId]);

CREATE NONCLUSTERED INDEX [ClientCreditRating_clientId_ratingDate_idx]
ON [dbo].[ClientCreditRating]([clientId], [ratingDate]);

-- Primary Key: [ClientCreditRating_pkey] on [ClientCreditRating]
ALTER TABLE [dbo].[ClientCreditRating] ADD CONSTRAINT [ClientCreditRating_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ClientCreditRating_ratingDate_idx]
ON [dbo].[ClientCreditRating]([ratingDate]);

CREATE NONCLUSTERED INDEX [ClientCreditRating_ratingGrade_idx]
ON [dbo].[ClientCreditRating]([ratingGrade]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_approvalId_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([approvalId]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_clientId_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([clientId]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_currentEmployeeApprovedById_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([currentEmployeeApprovedById]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_proposedEmployeeApprovedById_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([proposedEmployeeApprovedById]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_proposedEmployeeCode_status_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([proposedEmployeeCode], [status]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_requestedAt_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([requestedAt]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_requiresDualApproval_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([requiresDualApproval]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_status_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([status]);

-- Primary Key: [PK_ClientPartnerManagerChangeRequest] on [ClientPartnerManagerChangeRequest]
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [PK_ClientPartnerManagerChangeRequest] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ComplianceChecklist_assignedTo_idx]
ON [dbo].[ComplianceChecklist]([assignedTo]);

CREATE NONCLUSTERED INDEX [ComplianceChecklist_dueDate_idx]
ON [dbo].[ComplianceChecklist]([dueDate]);

-- Primary Key: [ComplianceChecklist_pkey] on [ComplianceChecklist]
ALTER TABLE [dbo].[ComplianceChecklist] ADD CONSTRAINT [ComplianceChecklist_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ComplianceChecklist_status_idx]
ON [dbo].[ComplianceChecklist]([status]);

CREATE NONCLUSTERED INDEX [ComplianceChecklist_taskId_idx]
ON [dbo].[ComplianceChecklist]([taskId]);

CREATE NONCLUSTERED INDEX [Creditors_BatchNumber_idx]
ON [dbo].[Creditors]([BatchNumber]);

CREATE NONCLUSTERED INDEX [Creditors_CreditorCode_idx]
ON [dbo].[Creditors]([CreditorCode]);

CREATE NONCLUSTERED INDEX [Creditors_GSTaskID_idx]
ON [dbo].[Creditors]([GSTaskID]);

CREATE UNIQUE NONCLUSTERED INDEX [Creditors_GSTranID_key]
ON [dbo].[Creditors]([GSTranID]);

CREATE NONCLUSTERED INDEX [Creditors_InvNumber_idx]
ON [dbo].[Creditors]([InvNumber]);

CREATE NONCLUSTERED INDEX [Creditors_MatchDate_idx]
ON [dbo].[Creditors]([MatchDate]);

CREATE NONCLUSTERED INDEX [Creditors_OfficeCode_idx]
ON [dbo].[Creditors]([OfficeCode]);

-- Primary Key: [Creditors_pkey] on [Creditors]
ALTER TABLE [dbo].[Creditors] ADD CONSTRAINT [Creditors_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Creditors_TranDate_idx]
ON [dbo].[Creditors]([TranDate]);

CREATE NONCLUSTERED INDEX [CreditRatingDocument_analyticsDocumentId_idx]
ON [dbo].[CreditRatingDocument]([analyticsDocumentId]);

CREATE UNIQUE NONCLUSTERED INDEX [CreditRatingDocument_creditRatingId_analyticsDocumentId_key]
ON [dbo].[CreditRatingDocument]([creditRatingId], [analyticsDocumentId]);

CREATE NONCLUSTERED INDEX [CreditRatingDocument_creditRatingId_idx]
ON [dbo].[CreditRatingDocument]([creditRatingId]);

-- Primary Key: [CreditRatingDocument_pkey] on [CreditRatingDocument]
ALTER TABLE [dbo].[CreditRatingDocument] ADD CONSTRAINT [CreditRatingDocument_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Debtors_Biller_idx]
ON [dbo].[Debtors]([Biller]);

CREATE NONCLUSTERED INDEX [Debtors_GSClientID_idx]
ON [dbo].[Debtors]([GSClientID]);

CREATE NONCLUSTERED INDEX [Debtors_GSClientID_PeriodRef_idx]
ON [dbo].[Debtors]([GSClientID], [PeriodRef]);

CREATE NONCLUSTERED INDEX [Debtors_OfficeCode_idx]
ON [dbo].[Debtors]([OfficeCode]);

CREATE NONCLUSTERED INDEX [Debtors_PeriodRef_idx]
ON [dbo].[Debtors]([PeriodRef]);

-- Primary Key: [Debtors_pkey] on [Debtors]
ALTER TABLE [dbo].[Debtors] ADD CONSTRAINT [Debtors_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Debtors_ServLineCode_idx]
ON [dbo].[Debtors]([ServLineCode]);

CREATE UNIQUE NONCLUSTERED INDEX [DrsTransactions_GSDebtorsTranID_key]
ON [dbo].[DrsTransactions]([GSDebtorsTranID]);

CREATE NONCLUSTERED INDEX [DrsTransactions_OfficeCode_idx]
ON [dbo].[DrsTransactions]([OfficeCode]);

CREATE NONCLUSTERED INDEX [DrsTransactions_PeriodKey_idx]
ON [dbo].[DrsTransactions]([PeriodKey]);

-- Primary Key: [DrsTransactions_pkey] on [DrsTransactions]
ALTER TABLE [dbo].[DrsTransactions] ADD CONSTRAINT [DrsTransactions_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [DrsTransactions_ServLineCode_idx]
ON [dbo].[DrsTransactions]([ServLineCode]);

CREATE NONCLUSTERED INDEX [DrsTransactions_TranDate_idx]
ON [dbo].[DrsTransactions]([TranDate]);

CREATE NONCLUSTERED INDEX [idx_drs_biller_super_covering]
ON [dbo].[DrsTransactions]([Biller], [TranDate])
INCLUDE ([Total], [EntryType], [ServLineCode], [InvNumber], [Reference])
WHERE ([Biller] IS NOT NULL);

CREATE NONCLUSTERED INDEX [idx_drs_gsclientid_super_covering]
ON [dbo].[DrsTransactions]([GSClientID], [TranDate])
INCLUDE ([Total], [EntryType], [InvNumber], [Reference], [ServLineCode], [Biller], [updatedAt])
WHERE ([GSClientID] IS NOT NULL);

CREATE NONCLUSTERED INDEX [EmailLog_emailType_idx]
ON [dbo].[EmailLog]([emailType]);

-- Primary Key: [EmailLog_pkey] on [EmailLog]
ALTER TABLE [dbo].[EmailLog] ADD CONSTRAINT [EmailLog_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [EmailLog_recipientUserId_idx]
ON [dbo].[EmailLog]([recipientUserId]);

CREATE NONCLUSTERED INDEX [EmailLog_status_idx]
ON [dbo].[EmailLog]([status]);

CREATE NONCLUSTERED INDEX [Employee_Active_idx]
ON [dbo].[Employee]([Active]);

CREATE NONCLUSTERED INDEX [Employee_EmpCatCode_idx]
ON [dbo].[Employee]([EmpCatCode]);

CREATE NONCLUSTERED INDEX [Employee_EmpCode_Active_idx]
ON [dbo].[Employee]([EmpCode], [Active]);

CREATE NONCLUSTERED INDEX [Employee_GSEmployeeID_idx]
ON [dbo].[Employee]([GSEmployeeID]);

CREATE UNIQUE NONCLUSTERED INDEX [Employee_GSEmployeeID_key]
ON [dbo].[Employee]([GSEmployeeID]);

CREATE NONCLUSTERED INDEX [Employee_OfficeCode_idx]
ON [dbo].[Employee]([OfficeCode]);

-- Primary Key: [Employee_pkey] on [Employee]
ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Employee_ServLineCode_idx]
ON [dbo].[Employee]([ServLineCode]);

CREATE NONCLUSTERED INDEX [Employee_SLGroup_idx]
ON [dbo].[Employee]([SLGroup]);

CREATE NONCLUSTERED INDEX [Employee_WinLogon_idx]
ON [dbo].[Employee]([WinLogon]);

CREATE NONCLUSTERED INDEX [idx_employee_empcode_active]
ON [dbo].[Employee]([EmpCode], [Active]);

CREATE NONCLUSTERED INDEX [ExternalLink_active_idx]
ON [dbo].[ExternalLink]([active]);

CREATE NONCLUSTERED INDEX [ExternalLink_name_idx]
ON [dbo].[ExternalLink]([name]);

-- Primary Key: [ExternalLink_pkey] on [ExternalLink]
ALTER TABLE [dbo].[ExternalLink] ADD CONSTRAINT [ExternalLink_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [FilingStatus_deadline_idx]
ON [dbo].[FilingStatus]([deadline]);

-- Primary Key: [FilingStatus_pkey] on [FilingStatus]
ALTER TABLE [dbo].[FilingStatus] ADD CONSTRAINT [FilingStatus_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [FilingStatus_status_idx]
ON [dbo].[FilingStatus]([status]);

CREATE NONCLUSTERED INDEX [FilingStatus_taskId_idx]
ON [dbo].[FilingStatus]([taskId]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_calendarYear_calendarMonth]
ON [dbo].[FiscalPeriod]([calendarYear], [calendarMonth]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalQuarter]
ON [dbo].[FiscalPeriod]([fiscalQuarter]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear]
ON [dbo].[FiscalPeriod]([fiscalYear]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear_fiscalMonth]
ON [dbo].[FiscalPeriod]([fiscalYear], [fiscalMonth]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear_fiscalQuarter]
ON [dbo].[FiscalPeriod]([fiscalYear], [fiscalQuarter]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_startDate_endDate]
ON [dbo].[FiscalPeriod]([startDate], [endDate]);

-- Primary Key: [PK_FiscalPeriod] on [FiscalPeriod]
ALTER TABLE [dbo].[FiscalPeriod] ADD CONSTRAINT [PK_FiscalPeriod] PRIMARY KEY CLUSTERED ([id]);

CREATE UNIQUE NONCLUSTERED INDEX [UQ_FiscalPeriod_periodKey]
ON [dbo].[FiscalPeriod]([periodKey]);

CREATE NONCLUSTERED INDEX [GL_Account_idx]
ON [dbo].[GL]([Account]);

CREATE NONCLUSTERED INDEX [GL_DatePosted_idx]
ON [dbo].[GL]([DatePosted]);

CREATE NONCLUSTERED INDEX [GL_EntryDate_idx]
ON [dbo].[GL]([EntryDate]);

CREATE NONCLUSTERED INDEX [GL_EntryGroup_idx]
ON [dbo].[GL]([EntryGroup]);

CREATE NONCLUSTERED INDEX [GL_GSAccountID_idx]
ON [dbo].[GL]([GSAccountID]);

CREATE UNIQUE NONCLUSTERED INDEX [GL_GSEntryID_key]
ON [dbo].[GL]([GSEntryID]);

CREATE NONCLUSTERED INDEX [GL_OfficeCode_idx]
ON [dbo].[GL]([OfficeCode]);

-- Primary Key: [GL_pkey] on [GL]
ALTER TABLE [dbo].[GL] ADD CONSTRAINT [GL_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [GL_SourceBatch_idx]
ON [dbo].[GL]([SourceBatch]);

CREATE NONCLUSTERED INDEX [GLBudgets_BudgetCode_idx]
ON [dbo].[GLBudgets]([BudgetCode]);

CREATE NONCLUSTERED INDEX [GLBudgets_GSAccountID_idx]
ON [dbo].[GLBudgets]([GSAccountID]);

CREATE UNIQUE NONCLUSTERED INDEX [GLBudgets_GSBudgetID_key]
ON [dbo].[GLBudgets]([GSBudgetID]);

CREATE NONCLUSTERED INDEX [GLBudgets_GSBudgetTypeID_idx]
ON [dbo].[GLBudgets]([GSBudgetTypeID]);

CREATE NONCLUSTERED INDEX [GLBudgets_PeriodYear_PeriodNumber_idx]
ON [dbo].[GLBudgets]([PeriodYear], [PeriodNumber]);

-- Primary Key: [GLBudgets_pkey] on [GLBudgets]
ALTER TABLE [dbo].[GLBudgets] ADD CONSTRAINT [GLBudgets_pkey] PRIMARY KEY CLUSTERED ([id]);

-- Primary Key: [PK_GS_Stg_TSChargeable] on [GS_Stg_TSChargeable]
ALTER TABLE [dbo].[GS_Stg_TSChargeable] ADD CONSTRAINT [PK_GS_Stg_TSChargeable] PRIMARY KEY CLUSTERED ([TSID]);

-- Primary Key: [PK_GS_TSChargeable] on [GS_TSChargeable]
ALTER TABLE [dbo].[GS_TSChargeable] ADD CONSTRAINT [PK_GS_TSChargeable] PRIMARY KEY CLUSTERED ([TSID]);

CREATE NONCLUSTERED INDEX [InAppNotification_createdAt_idx]
ON [dbo].[InAppNotification]([createdAt]);

CREATE NONCLUSTERED INDEX [InAppNotification_fromUserId_idx]
ON [dbo].[InAppNotification]([fromUserId]);

-- Primary Key: [InAppNotification_pkey] on [InAppNotification]
ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [InAppNotification_taskId_idx]
ON [dbo].[InAppNotification]([taskId]);

CREATE NONCLUSTERED INDEX [InAppNotification_userId_idx]
ON [dbo].[InAppNotification]([userId]);

CREATE NONCLUSTERED INDEX [InAppNotification_userId_isRead_idx]
ON [dbo].[InAppNotification]([userId], [isRead]);

CREATE NONCLUSTERED INDEX [LeaderGroup_name_idx]
ON [dbo].[LeaderGroup]([name]);

CREATE UNIQUE NONCLUSTERED INDEX [LeaderGroup_name_key]
ON [dbo].[LeaderGroup]([name]);

-- Primary Key: [LeaderGroup_pkey] on [LeaderGroup]
ALTER TABLE [dbo].[LeaderGroup] ADD CONSTRAINT [LeaderGroup_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [LeaderGroup_type_idx]
ON [dbo].[LeaderGroup]([type]);

CREATE NONCLUSTERED INDEX [LeaderGroupMember_employeeId_idx]
ON [dbo].[LeaderGroupMember]([employeeId]);

CREATE UNIQUE NONCLUSTERED INDEX [LeaderGroupMember_leaderGroupId_employeeId_key]
ON [dbo].[LeaderGroupMember]([leaderGroupId], [employeeId]);

CREATE NONCLUSTERED INDEX [LeaderGroupMember_leaderGroupId_idx]
ON [dbo].[LeaderGroupMember]([leaderGroupId]);

-- Primary Key: [LeaderGroupMember_pkey] on [LeaderGroupMember]
ALTER TABLE [dbo].[LeaderGroupMember] ADD CONSTRAINT [LeaderGroupMember_pkey] PRIMARY KEY CLUSTERED ([id]);

-- Primary Key: [LegalPrecedent_pkey] on [LegalPrecedent]
ALTER TABLE [dbo].[LegalPrecedent] ADD CONSTRAINT [LegalPrecedent_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [LegalPrecedent_taskId_idx]
ON [dbo].[LegalPrecedent]([taskId]);

CREATE NONCLUSTERED INDEX [LegalPrecedent_year_idx]
ON [dbo].[LegalPrecedent]([year]);

-- Primary Key: [MappedAccount_pkey] on [MappedAccount]
ALTER TABLE [dbo].[MappedAccount] ADD CONSTRAINT [MappedAccount_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [MappedAccount_taskId_accountCode_idx]
ON [dbo].[MappedAccount]([taskId], [accountCode]);

CREATE NONCLUSTERED INDEX [MappedAccount_taskId_idx]
ON [dbo].[MappedAccount]([taskId]);

CREATE NONCLUSTERED INDEX [MappedAccount_taskId_section_idx]
ON [dbo].[MappedAccount]([taskId], [section]);

CREATE NONCLUSTERED INDEX [MappedAccount_taskId_section_subsection_idx]
ON [dbo].[MappedAccount]([taskId], [section], [subsection]);

CREATE NONCLUSTERED INDEX [NewsBulletin_category_idx]
ON [dbo].[NewsBulletin]([category]);

CREATE NONCLUSTERED INDEX [NewsBulletin_effectiveDate_idx]
ON [dbo].[NewsBulletin]([effectiveDate]);

CREATE NONCLUSTERED INDEX [NewsBulletin_isActive_effectiveDate_idx]
ON [dbo].[NewsBulletin]([isActive], [effectiveDate]);

CREATE NONCLUSTERED INDEX [NewsBulletin_isActive_idx]
ON [dbo].[NewsBulletin]([isActive]);

CREATE NONCLUSTERED INDEX [NewsBulletin_isPinned_idx]
ON [dbo].[NewsBulletin]([isPinned]);

-- Primary Key: [NewsBulletin_pkey] on [NewsBulletin]
ALTER TABLE [dbo].[NewsBulletin] ADD CONSTRAINT [NewsBulletin_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [NewsBulletin_serviceLine_idx]
ON [dbo].[NewsBulletin]([serviceLine]);

CREATE NONCLUSTERED INDEX [NonClientAllocation_employeeId_idx]
ON [dbo].[NonClientAllocation]([employeeId]);

CREATE NONCLUSTERED INDEX [NonClientAllocation_employeeId_startDate_endDate_idx]
ON [dbo].[NonClientAllocation]([employeeId], [startDate], [endDate]);

CREATE NONCLUSTERED INDEX [NonClientAllocation_eventType_idx]
ON [dbo].[NonClientAllocation]([eventType]);

-- Primary Key: [NonClientAllocation_pkey] on [NonClientAllocation]
ALTER TABLE [dbo].[NonClientAllocation] ADD CONSTRAINT [NonClientAllocation_pkey] PRIMARY KEY CLUSTERED ([id]);

-- Primary Key: [NotificationPreference_pkey] on [NotificationPreference]
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [NotificationPreference_taskId_idx]
ON [dbo].[NotificationPreference]([taskId]);

CREATE NONCLUSTERED INDEX [NotificationPreference_userId_idx]
ON [dbo].[NotificationPreference]([userId]);

CREATE UNIQUE NONCLUSTERED INDEX [NotificationPreference_userId_taskId_notificationType_key]
ON [dbo].[NotificationPreference]([userId], [taskId], [notificationType]);

CREATE NONCLUSTERED INDEX [OpinionChatMessage_opinionDraftId_createdAt_idx]
ON [dbo].[OpinionChatMessage]([opinionDraftId], [createdAt]);

-- Primary Key: [OpinionChatMessage_pkey] on [OpinionChatMessage]
ALTER TABLE [dbo].[OpinionChatMessage] ADD CONSTRAINT [OpinionChatMessage_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [OpinionChatMessage_sectionGenerationId_idx]
ON [dbo].[OpinionChatMessage]([sectionGenerationId]);

CREATE NONCLUSTERED INDEX [OpinionDocument_category_idx]
ON [dbo].[OpinionDocument]([category]);

CREATE NONCLUSTERED INDEX [OpinionDocument_opinionDraftId_idx]
ON [dbo].[OpinionDocument]([opinionDraftId]);

-- Primary Key: [OpinionDocument_pkey] on [OpinionDocument]
ALTER TABLE [dbo].[OpinionDocument] ADD CONSTRAINT [OpinionDocument_pkey] PRIMARY KEY CLUSTERED ([id]);

-- Primary Key: [OpinionDraft_pkey] on [OpinionDraft]
ALTER TABLE [dbo].[OpinionDraft] ADD CONSTRAINT [OpinionDraft_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [OpinionDraft_status_idx]
ON [dbo].[OpinionDraft]([status]);

CREATE NONCLUSTERED INDEX [OpinionDraft_taskId_idx]
ON [dbo].[OpinionDraft]([taskId]);

CREATE NONCLUSTERED INDEX [OpinionDraft_taskId_version_idx]
ON [dbo].[OpinionDraft]([taskId], [version]);

CREATE NONCLUSTERED INDEX [OpinionSection_opinionDraftId_order_idx]
ON [dbo].[OpinionSection]([opinionDraftId], [order]);

-- Primary Key: [OpinionSection_pkey] on [OpinionSection]
ALTER TABLE [dbo].[OpinionSection] ADD CONSTRAINT [OpinionSection_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [PagePermission_active_idx]
ON [dbo].[PagePermission]([active]);

CREATE NONCLUSTERED INDEX [PagePermission_pathname_idx]
ON [dbo].[PagePermission]([pathname]);

CREATE UNIQUE NONCLUSTERED INDEX [PagePermission_pathname_role_key]
ON [dbo].[PagePermission]([pathname], [role]);

-- Primary Key: [PagePermission_pkey] on [PagePermission]
ALTER TABLE [dbo].[PagePermission] ADD CONSTRAINT [PagePermission_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [PagePermission_role_idx]
ON [dbo].[PagePermission]([role]);

CREATE NONCLUSTERED INDEX [PageRegistry_active_idx]
ON [dbo].[PageRegistry]([active]);

CREATE NONCLUSTERED INDEX [PageRegistry_category_idx]
ON [dbo].[PageRegistry]([category]);

CREATE UNIQUE NONCLUSTERED INDEX [PageRegistry_pathname_key]
ON [dbo].[PageRegistry]([pathname]);

-- Primary Key: [PageRegistry_pkey] on [PageRegistry]
ALTER TABLE [dbo].[PageRegistry] ADD CONSTRAINT [PageRegistry_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ResearchNote_category_idx]
ON [dbo].[ResearchNote]([category]);

-- Primary Key: [ResearchNote_pkey] on [ResearchNote]
ALTER TABLE [dbo].[ResearchNote] ADD CONSTRAINT [ResearchNote_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ResearchNote_taskId_idx]
ON [dbo].[ResearchNote]([taskId]);

CREATE NONCLUSTERED INDEX [ReviewCategory_active_idx]
ON [dbo].[ReviewCategory]([active]);

-- Primary Key: [ReviewCategory_pkey] on [ReviewCategory]
ALTER TABLE [dbo].[ReviewCategory] ADD CONSTRAINT [ReviewCategory_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ReviewCategory_serviceLine_idx]
ON [dbo].[ReviewCategory]([serviceLine]);

CREATE NONCLUSTERED INDEX [ReviewCategory_sortOrder_idx]
ON [dbo].[ReviewCategory]([sortOrder]);

CREATE NONCLUSTERED INDEX [ReviewNote_assignedTo_idx]
ON [dbo].[ReviewNote]([assignedTo]);

CREATE NONCLUSTERED INDEX [ReviewNote_assignedTo_status_idx]
ON [dbo].[ReviewNote]([assignedTo], [status]);

CREATE NONCLUSTERED INDEX [ReviewNote_categoryId_idx]
ON [dbo].[ReviewNote]([categoryId]);

CREATE NONCLUSTERED INDEX [ReviewNote_createdAt_idx]
ON [dbo].[ReviewNote]([createdAt]);

CREATE NONCLUSTERED INDEX [ReviewNote_currentOwner_idx]
ON [dbo].[ReviewNote]([currentOwner]);

CREATE NONCLUSTERED INDEX [ReviewNote_dueDate_idx]
ON [dbo].[ReviewNote]([dueDate]);

-- Primary Key: [ReviewNote_pkey] on [ReviewNote]
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ReviewNote_priority_idx]
ON [dbo].[ReviewNote]([priority]);

CREATE NONCLUSTERED INDEX [ReviewNote_raisedBy_idx]
ON [dbo].[ReviewNote]([raisedBy]);

CREATE NONCLUSTERED INDEX [ReviewNote_status_idx]
ON [dbo].[ReviewNote]([status]);

CREATE NONCLUSTERED INDEX [ReviewNote_taskId_idx]
ON [dbo].[ReviewNote]([taskId]);

CREATE NONCLUSTERED INDEX [ReviewNote_taskId_status_idx]
ON [dbo].[ReviewNote]([taskId], [status]);

-- Primary Key: [PK_ReviewNoteAssignee] on [ReviewNoteAssignee]
ALTER TABLE [dbo].[ReviewNoteAssignee] ADD CONSTRAINT [PK_ReviewNoteAssignee] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ReviewNoteAssignee_assignedBy_idx]
ON [dbo].[ReviewNoteAssignee]([assignedBy]);

CREATE NONCLUSTERED INDEX [ReviewNoteAssignee_reviewNoteId_idx]
ON [dbo].[ReviewNoteAssignee]([reviewNoteId]);

CREATE UNIQUE NONCLUSTERED INDEX [ReviewNoteAssignee_reviewNoteId_userId_key]
ON [dbo].[ReviewNoteAssignee]([reviewNoteId], [userId]);

CREATE NONCLUSTERED INDEX [ReviewNoteAssignee_userId_idx]
ON [dbo].[ReviewNoteAssignee]([userId]);

-- Primary Key: [ReviewNoteAttachment_pkey] on [ReviewNoteAttachment]
ALTER TABLE [dbo].[ReviewNoteAttachment] ADD CONSTRAINT [ReviewNoteAttachment_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ReviewNoteAttachment_reviewNoteId_idx]
ON [dbo].[ReviewNoteAttachment]([reviewNoteId]);

CREATE NONCLUSTERED INDEX [ReviewNoteAttachment_uploadedBy_idx]
ON [dbo].[ReviewNoteAttachment]([uploadedBy]);

CREATE NONCLUSTERED INDEX [ReviewNoteComment_createdAt_idx]
ON [dbo].[ReviewNoteComment]([createdAt]);

-- Primary Key: [ReviewNoteComment_pkey] on [ReviewNoteComment]
ALTER TABLE [dbo].[ReviewNoteComment] ADD CONSTRAINT [ReviewNoteComment_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ReviewNoteComment_reviewNoteId_idx]
ON [dbo].[ReviewNoteComment]([reviewNoteId]);

CREATE NONCLUSTERED INDEX [ReviewNoteComment_userId_idx]
ON [dbo].[ReviewNoteComment]([userId]);

CREATE NONCLUSTERED INDEX [SarsResponse_deadline_idx]
ON [dbo].[SarsResponse]([deadline]);

-- Primary Key: [SarsResponse_pkey] on [SarsResponse]
ALTER TABLE [dbo].[SarsResponse] ADD CONSTRAINT [SarsResponse_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [SarsResponse_status_idx]
ON [dbo].[SarsResponse]([status]);

CREATE NONCLUSTERED INDEX [SarsResponse_taskId_idx]
ON [dbo].[SarsResponse]([taskId]);

CREATE NONCLUSTERED INDEX [idx_servline_code]
ON [dbo].[ServiceLineExternal]([ServLineCode]);

CREATE NONCLUSTERED INDEX [ServiceLineExternal_masterCode_idx]
ON [dbo].[ServiceLineExternal]([masterCode]);

-- Primary Key: [ServiceLineExternal_pkey] on [ServiceLineExternal]
ALTER TABLE [dbo].[ServiceLineExternal] ADD CONSTRAINT [ServiceLineExternal_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ServiceLineExternal_ServLineCode_idx]
ON [dbo].[ServiceLineExternal]([ServLineCode]);

CREATE NONCLUSTERED INDEX [ServiceLineExternal_SLGroup_idx]
ON [dbo].[ServiceLineExternal]([SLGroup]);

CREATE NONCLUSTERED INDEX [ServiceLineExternal_SubServlineGroupCode_idx]
ON [dbo].[ServiceLineExternal]([SubServlineGroupCode]);

CREATE NONCLUSTERED INDEX [idx_master_sl_code]
ON [dbo].[ServiceLineMaster]([code]);

CREATE NONCLUSTERED INDEX [ServiceLineMaster_active_idx]
ON [dbo].[ServiceLineMaster]([active]);

-- Primary Key: [ServiceLineMaster_pkey] on [ServiceLineMaster]
ALTER TABLE [dbo].[ServiceLineMaster] ADD CONSTRAINT [ServiceLineMaster_pkey] PRIMARY KEY CLUSTERED ([code]);

CREATE NONCLUSTERED INDEX [ServiceLineMaster_sortOrder_idx]
ON [dbo].[ServiceLineMaster]([sortOrder]);

CREATE NONCLUSTERED INDEX [ServiceLineTool_active_idx]
ON [dbo].[ServiceLineTool]([active]);

-- Primary Key: [ServiceLineTool_pkey] on [ServiceLineTool]
ALTER TABLE [dbo].[ServiceLineTool] ADD CONSTRAINT [ServiceLineTool_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ServiceLineTool_subServiceLineGroup_idx]
ON [dbo].[ServiceLineTool]([subServiceLineGroup]);

CREATE UNIQUE NONCLUSTERED INDEX [ServiceLineTool_subServiceLineGroup_toolId_key]
ON [dbo].[ServiceLineTool]([subServiceLineGroup], [toolId]);

CREATE NONCLUSTERED INDEX [ServiceLineTool_toolId_idx]
ON [dbo].[ServiceLineTool]([toolId]);

CREATE NONCLUSTERED INDEX [idx_ServiceLineUser_masterCode]
ON [dbo].[ServiceLineUser]([masterCode]);

CREATE NONCLUSTERED INDEX [ServiceLineUser_assignmentType_idx]
ON [dbo].[ServiceLineUser]([assignmentType]);

CREATE NONCLUSTERED INDEX [ServiceLineUser_parentAssignmentId_idx]
ON [dbo].[ServiceLineUser]([parentAssignmentId]);

-- Primary Key: [ServiceLineUser_pkey] on [ServiceLineUser]
ALTER TABLE [dbo].[ServiceLineUser] ADD CONSTRAINT [ServiceLineUser_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [ServiceLineUser_subServiceLineGroup_idx]
ON [dbo].[ServiceLineUser]([subServiceLineGroup]);

CREATE NONCLUSTERED INDEX [ServiceLineUser_userId_assignmentType_idx]
ON [dbo].[ServiceLineUser]([userId], [assignmentType]);

CREATE NONCLUSTERED INDEX [ServiceLineUser_userId_idx]
ON [dbo].[ServiceLineUser]([userId]);

CREATE UNIQUE NONCLUSTERED INDEX [ServiceLineUser_userId_subServiceLineGroup_masterCode_key]
ON [dbo].[ServiceLineUser]([userId], [subServiceLineGroup], [masterCode])
WHERE ([masterCode] IS NOT NULL);

-- Primary Key: [Session_pkey] on [Session]
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE UNIQUE NONCLUSTERED INDEX [Session_sessionToken_key]
ON [dbo].[Session]([sessionToken]);

CREATE NONCLUSTERED INDEX [Session_userId_idx]
ON [dbo].[Session]([userId]);

CREATE NONCLUSTERED INDEX [StandardTask_GSStdTaskID_idx]
ON [dbo].[StandardTask]([GSStdTaskID]);

CREATE UNIQUE NONCLUSTERED INDEX [StandardTask_GSStdTaskID_key]
ON [dbo].[StandardTask]([GSStdTaskID]);

-- Primary Key: [StandardTask_pkey] on [StandardTask]
ALTER TABLE [dbo].[StandardTask] ADD CONSTRAINT [StandardTask_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [StandardTask_ServLineCode_idx]
ON [dbo].[StandardTask]([ServLineCode]);

CREATE NONCLUSTERED INDEX [StandardTask_StdTaskCode_idx]
ON [dbo].[StandardTask]([StdTaskCode]);

CREATE NONCLUSTERED INDEX [Task_GSClientID_Active_updatedAt_idx]
ON [dbo].[Task]([GSClientID], [Active], [updatedAt]);

CREATE NONCLUSTERED INDEX [Task_GSClientID_idx]
ON [dbo].[Task]([GSClientID]);

CREATE UNIQUE NONCLUSTERED INDEX [Task_GSTaskID_key]
ON [dbo].[Task]([GSTaskID]);

-- Primary Key: [Task_pkey] on [Task]
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Task_ServLineCode_Active_idx]
ON [dbo].[Task]([ServLineCode], [Active]);

CREATE NONCLUSTERED INDEX [Task_ServLineCode_Active_updatedAt_idx]
ON [dbo].[Task]([ServLineCode], [Active], [updatedAt]);

CREATE NONCLUSTERED INDEX [Task_ServLineCode_SLGroup_idx]
ON [dbo].[Task]([ServLineCode], [SLGroup]);

CREATE NONCLUSTERED INDEX [Task_TaskManager_Active_idx]
ON [dbo].[Task]([TaskManager], [Active]);

CREATE NONCLUSTERED INDEX [Task_TaskPartner_Active_idx]
ON [dbo].[Task]([TaskPartner], [Active]);

CREATE NONCLUSTERED INDEX [Task_taskYear_idx]
ON [dbo].[Task]([taskYear]);

-- Primary Key: [TaskAcceptance_pkey] on [TaskAcceptance]
ALTER TABLE [dbo].[TaskAcceptance] ADD CONSTRAINT [TaskAcceptance_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskAcceptance_riskRating_idx]
ON [dbo].[TaskAcceptance]([riskRating]);

CREATE NONCLUSTERED INDEX [TaskAcceptance_taskId_idx]
ON [dbo].[TaskAcceptance]([taskId]);

CREATE UNIQUE NONCLUSTERED INDEX [TaskAcceptance_taskId_key]
ON [dbo].[TaskAcceptance]([taskId]);

CREATE NONCLUSTERED INDEX [TaskBudget_GSClientID_idx]
ON [dbo].[TaskBudget]([GSClientID]);

CREATE NONCLUSTERED INDEX [TaskBudget_GSTaskID_idx]
ON [dbo].[TaskBudget]([GSTaskID]);

-- Primary Key: [TaskBudget_pkey] on [TaskBudget]
ALTER TABLE [dbo].[TaskBudget] ADD CONSTRAINT [TaskBudget_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskBudget_TaskBudgetID_idx]
ON [dbo].[TaskBudget]([TaskBudgetID]);

CREATE UNIQUE NONCLUSTERED INDEX [TaskBudget_TaskBudgetID_key]
ON [dbo].[TaskBudget]([TaskBudgetID]);

CREATE NONCLUSTERED INDEX [TaskBudgetDisbursement_createdBy_idx]
ON [dbo].[TaskBudgetDisbursement]([createdBy]);

-- Primary Key: [TaskBudgetDisbursement_pkey] on [TaskBudgetDisbursement]
ALTER TABLE [dbo].[TaskBudgetDisbursement] ADD CONSTRAINT [TaskBudgetDisbursement_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskBudgetDisbursement_taskId_idx]
ON [dbo].[TaskBudgetDisbursement]([taskId]);

CREATE NONCLUSTERED INDEX [TaskBudgetFee_createdBy_idx]
ON [dbo].[TaskBudgetFee]([createdBy]);

-- Primary Key: [TaskBudgetFee_pkey] on [TaskBudgetFee]
ALTER TABLE [dbo].[TaskBudgetFee] ADD CONSTRAINT [TaskBudgetFee_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskBudgetFee_taskId_idx]
ON [dbo].[TaskBudgetFee]([taskId]);

CREATE NONCLUSTERED INDEX [TaskDocument_category_idx]
ON [dbo].[TaskDocument]([category]);

-- Primary Key: [TaskDocument_pkey] on [TaskDocument]
ALTER TABLE [dbo].[TaskDocument] ADD CONSTRAINT [TaskDocument_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskDocument_taskId_idx]
ON [dbo].[TaskDocument]([taskId]);

CREATE NONCLUSTERED INDEX [idx_taskengagementletter_dpaextractionstatus]
ON [dbo].[TaskEngagementLetter]([dpaExtractionStatus]);

CREATE NONCLUSTERED INDEX [idx_taskengagementletter_dpaletterdate]
ON [dbo].[TaskEngagementLetter]([dpaLetterDate]);

CREATE NONCLUSTERED INDEX [idx_taskengagementletter_elextractionstatus]
ON [dbo].[TaskEngagementLetter]([elExtractionStatus]);

CREATE NONCLUSTERED INDEX [idx_taskengagementletter_elletterdate]
ON [dbo].[TaskEngagementLetter]([elLetterDate]);

-- Primary Key: [TaskEngagementLetter_pkey] on [TaskEngagementLetter]
ALTER TABLE [dbo].[TaskEngagementLetter] ADD CONSTRAINT [TaskEngagementLetter_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskEngagementLetter_taskId_idx]
ON [dbo].[TaskEngagementLetter]([taskId]);

CREATE UNIQUE NONCLUSTERED INDEX [TaskEngagementLetter_taskId_key]
ON [dbo].[TaskEngagementLetter]([taskId]);

CREATE NONCLUSTERED INDEX [TaskEngagementLetter_templateVersionId_idx]
ON [dbo].[TaskEngagementLetter]([templateVersionId]);

CREATE NONCLUSTERED INDEX [TaskIndependenceConfirmation_confirmed_idx]
ON [dbo].[TaskIndependenceConfirmation]([confirmed]);

-- Primary Key: [TaskIndependenceConfirmation_pkey] on [TaskIndependenceConfirmation]
ALTER TABLE [dbo].[TaskIndependenceConfirmation] ADD CONSTRAINT [TaskIndependenceConfirmation_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskIndependenceConfirmation_taskTeamId_idx]
ON [dbo].[TaskIndependenceConfirmation]([taskTeamId]);

CREATE UNIQUE NONCLUSTERED INDEX [TaskIndependenceConfirmation_taskTeamId_key]
ON [dbo].[TaskIndependenceConfirmation]([taskTeamId]);

CREATE NONCLUSTERED INDEX [idx_taskstage_taskid_created]
ON [dbo].[TaskStage]([taskId], [createdAt]);

-- Primary Key: [PK_TaskStage] on [TaskStage]
ALTER TABLE [dbo].[TaskStage] ADD CONSTRAINT [PK_TaskStage] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskStage_stage_idx]
ON [dbo].[TaskStage]([stage]);

CREATE NONCLUSTERED INDEX [TaskStage_taskId_stage_idx]
ON [dbo].[TaskStage]([taskId], [stage]);

CREATE NONCLUSTERED INDEX [idx_taskteam_userid_taskid]
ON [dbo].[TaskTeam]([userId], [taskId]);

-- Primary Key: [TaskTeam_pkey] on [TaskTeam]
ALTER TABLE [dbo].[TaskTeam] ADD CONSTRAINT [TaskTeam_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskTeam_role_idx]
ON [dbo].[TaskTeam]([role]);

CREATE NONCLUSTERED INDEX [TaskTeam_taskId_startDate_endDate_idx]
ON [dbo].[TaskTeam]([taskId], [startDate], [endDate]);

CREATE UNIQUE NONCLUSTERED INDEX [TaskTeam_taskId_userId_key]
ON [dbo].[TaskTeam]([taskId], [userId]);

CREATE NONCLUSTERED INDEX [TaskTeam_userId_startDate_endDate_idx]
ON [dbo].[TaskTeam]([userId], [startDate], [endDate]);

CREATE NONCLUSTERED INDEX [TaskTeam_userId_taskId_idx]
ON [dbo].[TaskTeam]([userId], [taskId]);

CREATE NONCLUSTERED INDEX [TaskTeam_userId_taskId_role_idx]
ON [dbo].[TaskTeam]([userId], [taskId], [role]);

CREATE NONCLUSTERED INDEX [TaskTool_addedBy_idx]
ON [dbo].[TaskTool]([addedBy]);

-- Primary Key: [TaskTool_pkey] on [TaskTool]
ALTER TABLE [dbo].[TaskTool] ADD CONSTRAINT [TaskTool_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaskTool_taskId_idx]
ON [dbo].[TaskTool]([taskId]);

CREATE NONCLUSTERED INDEX [TaskTool_taskId_sortOrder_idx]
ON [dbo].[TaskTool]([taskId], [sortOrder]);

CREATE UNIQUE NONCLUSTERED INDEX [TaskTool_taskId_toolId_key]
ON [dbo].[TaskTool]([taskId], [toolId]);

CREATE NONCLUSTERED INDEX [TaskTool_toolId_idx]
ON [dbo].[TaskTool]([toolId]);

CREATE NONCLUSTERED INDEX [TaxAdjustment_createdAt_idx]
ON [dbo].[TaxAdjustment]([createdAt]);

-- Primary Key: [TaxAdjustment_pkey] on [TaxAdjustment]
ALTER TABLE [dbo].[TaxAdjustment] ADD CONSTRAINT [TaxAdjustment_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TaxAdjustment_status_idx]
ON [dbo].[TaxAdjustment]([status]);

CREATE NONCLUSTERED INDEX [TaxAdjustment_status_taskId_idx]
ON [dbo].[TaxAdjustment]([status], [taskId]);

CREATE NONCLUSTERED INDEX [TaxAdjustment_taskId_idx]
ON [dbo].[TaxAdjustment]([taskId]);

CREATE NONCLUSTERED INDEX [TaxAdjustment_taskId_status_createdAt_idx]
ON [dbo].[TaxAdjustment]([taskId], [status], [createdAt]);

CREATE NONCLUSTERED INDEX [Template_active_idx]
ON [dbo].[Template]([active]);

-- Primary Key: [Template_pkey] on [Template]
ALTER TABLE [dbo].[Template] ADD CONSTRAINT [Template_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Template_serviceLine_idx]
ON [dbo].[Template]([serviceLine]);

CREATE NONCLUSTERED INDEX [Template_type_idx]
ON [dbo].[Template]([type]);

-- Primary Key: [TemplateSection_pkey] on [TemplateSection]
ALTER TABLE [dbo].[TemplateSection] ADD CONSTRAINT [TemplateSection_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TemplateSection_sectionKey_idx]
ON [dbo].[TemplateSection]([sectionKey]);

CREATE NONCLUSTERED INDEX [TemplateSection_templateId_idx]
ON [dbo].[TemplateSection]([templateId]);

-- Primary Key: [TemplateSectionVersion_pkey] on [TemplateSectionVersion]
ALTER TABLE [dbo].[TemplateSectionVersion] ADD CONSTRAINT [TemplateSectionVersion_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TemplateSectionVersion_templateVersionId_idx]
ON [dbo].[TemplateSectionVersion]([templateVersionId]);

CREATE NONCLUSTERED INDEX [TemplateSectionVersion_templateVersionId_order_idx]
ON [dbo].[TemplateSectionVersion]([templateVersionId], [order]);

CREATE NONCLUSTERED INDEX [TemplateVersion_createdAt_idx]
ON [dbo].[TemplateVersion]([createdAt]);

-- Primary Key: [TemplateVersion_pkey] on [TemplateVersion]
ALTER TABLE [dbo].[TemplateVersion] ADD CONSTRAINT [TemplateVersion_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [TemplateVersion_templateId_idx]
ON [dbo].[TemplateVersion]([templateId]);

CREATE NONCLUSTERED INDEX [TemplateVersion_templateId_isActive_idx]
ON [dbo].[TemplateVersion]([templateId], [isActive]);

CREATE UNIQUE NONCLUSTERED INDEX [UQ_TemplateVersion_Number]
ON [dbo].[TemplateVersion]([templateId], [version]);

CREATE NONCLUSTERED INDEX [Tool_active_idx]
ON [dbo].[Tool]([active]);

CREATE NONCLUSTERED INDEX [Tool_code_idx]
ON [dbo].[Tool]([code]);

CREATE UNIQUE NONCLUSTERED INDEX [Tool_code_key]
ON [dbo].[Tool]([code]);

-- Primary Key: [Tool_pkey] on [Tool]
ALTER TABLE [dbo].[Tool] ADD CONSTRAINT [Tool_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Tool_sortOrder_idx]
ON [dbo].[Tool]([sortOrder]);

CREATE NONCLUSTERED INDEX [ToolSubTab_active_idx]
ON [dbo].[ToolSubTab]([active]);

-- Primary Key: [ToolSubTab_pkey] on [ToolSubTab]
ALTER TABLE [dbo].[ToolSubTab] ADD CONSTRAINT [ToolSubTab_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE UNIQUE NONCLUSTERED INDEX [ToolSubTab_toolId_code_key]
ON [dbo].[ToolSubTab]([toolId], [code]);

CREATE NONCLUSTERED INDEX [ToolSubTab_toolId_idx]
ON [dbo].[ToolSubTab]([toolId]);

CREATE NONCLUSTERED INDEX [ToolSubTab_toolId_sortOrder_idx]
ON [dbo].[ToolSubTab]([toolId], [sortOrder]);

CREATE UNIQUE NONCLUSTERED INDEX [User_email_key]
ON [dbo].[User]([email]);

-- Primary Key: [User_pkey] on [User]
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [User_role_idx]
ON [dbo].[User]([role]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_ApprovalId]
ON [dbo].[VaultDocument]([approvalId]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_CategoryId]
ON [dbo].[VaultDocument]([categoryId]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_DocumentType]
ON [dbo].[VaultDocument]([documentType]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_DocumentType_CategoryId]
ON [dbo].[VaultDocument]([documentType], [categoryId]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_PublishedAt]
ON [dbo].[VaultDocument]([publishedAt]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_Scope]
ON [dbo].[VaultDocument]([scope]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_ServiceLine]
ON [dbo].[VaultDocument]([serviceLine]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_Status]
ON [dbo].[VaultDocument]([status]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_Status_Scope_ServiceLine]
ON [dbo].[VaultDocument]([status], [scope], [serviceLine]);

CREATE NONCLUSTERED INDEX [IX_VaultDocument_UploadedBy]
ON [dbo].[VaultDocument]([uploadedBy]);

-- Primary Key: [PK_VaultDocument] on [VaultDocument]
ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [PK_VaultDocument] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [IX_VaultDocumentCategory_Active]
ON [dbo].[VaultDocumentCategory]([active]);

CREATE NONCLUSTERED INDEX [IX_VaultDocumentCategory_DocumentType]
ON [dbo].[VaultDocumentCategory]([documentType]);

CREATE NONCLUSTERED INDEX [IX_VaultDocumentCategory_SortOrder]
ON [dbo].[VaultDocumentCategory]([sortOrder]);

-- Primary Key: [PK_VaultDocumentCategory] on [VaultDocumentCategory]
ALTER TABLE [dbo].[VaultDocumentCategory] ADD CONSTRAINT [PK_VaultDocumentCategory] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [IX_VaultDocumentType_Active]
ON [dbo].[VaultDocumentType]([active]);

CREATE NONCLUSTERED INDEX [IX_VaultDocumentType_SortOrder]
ON [dbo].[VaultDocumentType]([sortOrder]);

-- Primary Key: [PK_VaultDocumentType] on [VaultDocumentType]
ALTER TABLE [dbo].[VaultDocumentType] ADD CONSTRAINT [PK_VaultDocumentType] PRIMARY KEY CLUSTERED ([id]);

CREATE UNIQUE NONCLUSTERED INDEX [UQ_VaultDocumentType_Code]
ON [dbo].[VaultDocumentType]([code]);

CREATE NONCLUSTERED INDEX [IX_VaultDocumentVersion_DocumentId]
ON [dbo].[VaultDocumentVersion]([documentId]);

CREATE NONCLUSTERED INDEX [IX_VaultDocumentVersion_DocumentId_Version]
ON [dbo].[VaultDocumentVersion]([documentId], [version]);

CREATE NONCLUSTERED INDEX [IX_VaultDocumentVersion_Version]
ON [dbo].[VaultDocumentVersion]([version]);

-- Primary Key: [PK_VaultDocumentVersion] on [VaultDocumentVersion]
ALTER TABLE [dbo].[VaultDocumentVersion] ADD CONSTRAINT [PK_VaultDocumentVersion] PRIMARY KEY CLUSTERED ([id]);

CREATE UNIQUE NONCLUSTERED INDEX [UQ_VaultDocumentVersion_DocumentId_Version]
ON [dbo].[VaultDocumentVersion]([documentId], [version]);

CREATE UNIQUE NONCLUSTERED INDEX [VerificationToken_identifier_token_key]
ON [dbo].[VerificationToken]([identifier], [token]);

CREATE UNIQUE NONCLUSTERED INDEX [VerificationToken_token_key]
ON [dbo].[VerificationToken]([token]);

CREATE NONCLUSTERED INDEX [Wip_GSClientID_idx]
ON [dbo].[Wip]([GSClientID]);

CREATE NONCLUSTERED INDEX [Wip_GSClientID_PeriodRef_idx]
ON [dbo].[Wip]([GSClientID], [PeriodRef]);

CREATE NONCLUSTERED INDEX [Wip_GSTaskID_idx]
ON [dbo].[Wip]([GSTaskID]);

CREATE NONCLUSTERED INDEX [Wip_GSTaskID_PeriodRef_idx]
ON [dbo].[Wip]([GSTaskID], [PeriodRef]);

CREATE NONCLUSTERED INDEX [Wip_OfficeCode_idx]
ON [dbo].[Wip]([OfficeCode]);

CREATE NONCLUSTERED INDEX [Wip_PeriodRef_idx]
ON [dbo].[Wip]([PeriodRef]);

-- Primary Key: [Wip_pkey] on [Wip]
ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [Wip_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [Wip_ServLineCode_idx]
ON [dbo].[Wip]([ServLineCode]);

CREATE NONCLUSTERED INDEX [Wip_TaskPartner_idx]
ON [dbo].[Wip]([TaskPartner]);

CREATE NONCLUSTERED INDEX [WIPAging_GSClientID_idx]
ON [dbo].[WIPAging]([GSClientID]);

CREATE NONCLUSTERED INDEX [WIPAging_GSClientID_PeriodRef_idx]
ON [dbo].[WIPAging]([GSClientID], [PeriodRef]);

CREATE NONCLUSTERED INDEX [WIPAging_GSTaskID_idx]
ON [dbo].[WIPAging]([GSTaskID]);

CREATE NONCLUSTERED INDEX [WIPAging_GSTaskID_PeriodRef_idx]
ON [dbo].[WIPAging]([GSTaskID], [PeriodRef]);

CREATE NONCLUSTERED INDEX [WIPAging_OfficeCode_idx]
ON [dbo].[WIPAging]([OfficeCode]);

CREATE NONCLUSTERED INDEX [WIPAging_PeriodRef_idx]
ON [dbo].[WIPAging]([PeriodRef]);

-- Primary Key: [WIPAging_pkey] on [WIPAging]
ALTER TABLE [dbo].[WIPAging] ADD CONSTRAINT [WIPAging_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [WIPAging_ServLineCode_idx]
ON [dbo].[WIPAging]([ServLineCode]);

CREATE NONCLUSTERED INDEX [WIPAging_TaskPartner_idx]
ON [dbo].[WIPAging]([TaskPartner]);

CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_super_covering]
ON [dbo].[WIPTransactions]([GSClientID], [TranDate])
INCLUDE ([TType], [TranType], [Amount], [Cost], [Hour], [MainServLineCode], [TaskPartner], [TaskManager], [updatedAt])
WHERE ([GSClientID] IS NOT NULL);

CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_super_covering]
ON [dbo].[WIPTransactions]([GSTaskID], [TranDate])
INCLUDE ([TType], [TranType], [Amount], [Cost], [Hour], [MainServLineCode], [TaskPartner], [TaskManager], [updatedAt])
WHERE ([GSTaskID] IS NOT NULL);

CREATE NONCLUSTERED INDEX [WIPTransactions_GSClientID_TranDate_TType_idx]
ON [dbo].[WIPTransactions]([GSClientID], [TranDate], [TType]);

CREATE NONCLUSTERED INDEX [WIPTransactions_GSTaskID_TranDate_TType_idx]
ON [dbo].[WIPTransactions]([GSTaskID], [TranDate], [TType]);

CREATE UNIQUE NONCLUSTERED INDEX [WIPTransactions_GSWIPTransID_key]
ON [dbo].[WIPTransactions]([GSWIPTransID]);

-- Primary Key: [WIPTransactions_pkey] on [WIPTransactions]
ALTER TABLE [dbo].[WIPTransactions] ADD CONSTRAINT [WIPTransactions_pkey] PRIMARY KEY CLUSTERED ([id]);

CREATE NONCLUSTERED INDEX [WIPTransactions_TaskManager_TranDate_idx]
ON [dbo].[WIPTransactions]([TaskManager], [TranDate]);

CREATE NONCLUSTERED INDEX [WIPTransactions_TaskPartner_TranDate_idx]
ON [dbo].[WIPTransactions]([TaskPartner], [TranDate]);

CREATE NONCLUSTERED INDEX [WIPTransactions_TranDate_idx]
ON [dbo].[WIPTransactions]([TranDate]);

-- Primary Key: [WorkspaceFile_pkey] on [WorkspaceFile]
ALTER TABLE [dbo].[WorkspaceFile] ADD CONSTRAINT [WorkspaceFile_pkey] PRIMARY KEY CLUSTERED ([id]);

-- Primary Key: [WorkspaceFileActivity_pkey] on [WorkspaceFileActivity]
ALTER TABLE [dbo].[WorkspaceFileActivity] ADD CONSTRAINT [WorkspaceFileActivity_pkey] PRIMARY KEY CLUSTERED ([id]);

-- Primary Key: [WorkspaceFilePermission_pkey] on [WorkspaceFilePermission]
ALTER TABLE [dbo].[WorkspaceFilePermission] ADD CONSTRAINT [WorkspaceFilePermission_pkey] PRIMARY KEY CLUSTERED ([id]);

-- Primary Key: [WorkspaceFolder_pkey] on [WorkspaceFolder]
ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [WorkspaceFolder_pkey] PRIMARY KEY CLUSTERED ([id]);


-- ============================================================================
-- PART 3: FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE [dbo].[AcceptanceAnswer] ADD CONSTRAINT [FK_AcceptanceAnswer_EngagementResponse]
    FOREIGN KEY ([responseId])
    REFERENCES [dbo].[ClientAcceptanceResponse]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[AcceptanceAnswer] ADD CONSTRAINT [FK_AcceptanceAnswer_Question]
    FOREIGN KEY ([questionId])
    REFERENCES [dbo].[AcceptanceQuestion]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[AcceptanceDocument] ADD CONSTRAINT [FK_AcceptanceDocument_Response]
    FOREIGN KEY ([responseId])
    REFERENCES [dbo].[ClientAcceptanceResponse]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_userId_fkey]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[AdjustmentDocument] ADD CONSTRAINT [AdjustmentDocument_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[AdjustmentDocument] ADD CONSTRAINT [AdjustmentDocument_taxAdjustmentId_fkey]
    FOREIGN KEY ([taxAdjustmentId])
    REFERENCES [dbo].[TaxAdjustment]([id])
    ON DELETE SET_NULL ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[AITaxReport] ADD CONSTRAINT [AITaxReport_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE NO_ACTION ON UPDATE CASCADE;

ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [FK_Approval_CompletedBy]
    FOREIGN KEY ([completedById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[Approval] ADD CONSTRAINT [FK_Approval_RequestedBy]
    FOREIGN KEY ([requestedById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ApprovalDelegation] ADD CONSTRAINT [FK_ApprovalDelegation_From]
    FOREIGN KEY ([fromUserId])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ApprovalDelegation] ADD CONSTRAINT [FK_ApprovalDelegation_To]
    FOREIGN KEY ([toUserId])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [FK_ApprovalStep_Approval]
    FOREIGN KEY ([approvalId])
    REFERENCES [dbo].[Approval]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [FK_ApprovalStep_ApprovedBy]
    FOREIGN KEY ([approvedById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [FK_ApprovalStep_AssignedTo]
    FOREIGN KEY ([assignedToUserId])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ApprovalStep] ADD CONSTRAINT [FK_ApprovalStep_DelegatedTo]
    FOREIGN KEY ([delegatedToUserId])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[BDActivity] ADD CONSTRAINT [BDActivity_contactId_fkey]
    FOREIGN KEY ([contactId])
    REFERENCES [dbo].[BDContact]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[BDActivity] ADD CONSTRAINT [BDActivity_opportunityId_fkey]
    FOREIGN KEY ([opportunityId])
    REFERENCES [dbo].[BDOpportunity]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[BDNote] ADD CONSTRAINT [BDNote_opportunityId_fkey]
    FOREIGN KEY ([opportunityId])
    REFERENCES [dbo].[BDOpportunity]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_clientId_fkey]
    FOREIGN KEY ([clientId])
    REFERENCES [dbo].[Client]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_contactId_fkey]
    FOREIGN KEY ([contactId])
    REFERENCES [dbo].[BDContact]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_stageId_fkey]
    FOREIGN KEY ([stageId])
    REFERENCES [dbo].[BDStage]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[BDProposal] ADD CONSTRAINT [BDProposal_opportunityId_fkey]
    FOREIGN KEY ([opportunityId])
    REFERENCES [dbo].[BDOpportunity]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[BugReport] ADD CONSTRAINT [BugReport_reportedBy_fkey]
    FOREIGN KEY ([reportedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[BugReport] ADD CONSTRAINT [BugReport_resolvedBy_fkey]
    FOREIGN KEY ([resolvedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[BugReport] ADD CONSTRAINT [BugReport_testedBy_fkey]
    FOREIGN KEY ([testedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[CategoryApprover] ADD CONSTRAINT [FK_CategoryApprover_Category]
    FOREIGN KEY ([categoryId])
    REFERENCES [dbo].[VaultDocumentCategory]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[CategoryApprover] ADD CONSTRAINT [FK_CategoryApprover_CreatedBy]
    FOREIGN KEY ([createdBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[CategoryApprover] ADD CONSTRAINT [FK_CategoryApprover_User]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [ClientAcceptance_userId_fkey]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE SET_NULL ON UPDATE CASCADE;

ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [FK_ClientAcceptance_Approval]
    FOREIGN KEY ([approvalId])
    REFERENCES [dbo].[Approval]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [FK_ClientAcceptance_Client]
    FOREIGN KEY ([clientId])
    REFERENCES [dbo].[Client]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientAcceptanceAnswer] ADD CONSTRAINT [FK_ClientAcceptanceAnswer_ClientAcceptance]
    FOREIGN KEY ([clientAcceptanceId])
    REFERENCES [dbo].[ClientAcceptance]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientAcceptanceAnswer] ADD CONSTRAINT [FK_ClientAcceptanceAnswer_Question]
    FOREIGN KEY ([questionId])
    REFERENCES [dbo].[AcceptanceQuestion]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientAcceptanceResponse] ADD CONSTRAINT [FK_ClientAcceptanceResponse_Client]
    FOREIGN KEY ([clientId])
    REFERENCES [dbo].[Client]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientAcceptanceResponse] ADD CONSTRAINT [FK_ClientAcceptanceResponse_Task]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientAnalyticsDocument] ADD CONSTRAINT [ClientAnalyticsDocument_clientId_fkey]
    FOREIGN KEY ([clientId])
    REFERENCES [dbo].[Client]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ClientCreditRating] ADD CONSTRAINT [ClientCreditRating_clientId_fkey]
    FOREIGN KEY ([clientId])
    REFERENCES [dbo].[Client]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ChangeRequest_Approval]
    FOREIGN KEY ([approvalId])
    REFERENCES [dbo].[Approval]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_Client]
    FOREIGN KEY ([clientId])
    REFERENCES [dbo].[Client]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_CurrentApprover]
    FOREIGN KEY ([currentEmployeeApprovedById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_ProposedApprover]
    FOREIGN KEY ([proposedEmployeeApprovedById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_RequestedBy]
    FOREIGN KEY ([requestedById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest] ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_ResolvedBy]
    FOREIGN KEY ([resolvedById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ComplianceChecklist] ADD CONSTRAINT [ComplianceChecklist_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[CreditRatingDocument] ADD CONSTRAINT [CreditRatingDocument_analyticsDocumentId_fkey]
    FOREIGN KEY ([analyticsDocumentId])
    REFERENCES [dbo].[ClientAnalyticsDocument]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[CreditRatingDocument] ADD CONSTRAINT [CreditRatingDocument_creditRatingId_fkey]
    FOREIGN KEY ([creditRatingId])
    REFERENCES [dbo].[ClientCreditRating]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[Debtors] ADD CONSTRAINT [Debtors_GSClientID_fkey]
    FOREIGN KEY ([GSClientID])
    REFERENCES [dbo].[Client]([GSClientID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[DrsTransactions] ADD CONSTRAINT [DrsTransactions_GSClientID_fkey]
    FOREIGN KEY ([GSClientID])
    REFERENCES [dbo].[Client]([GSClientID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[EmailLog] ADD CONSTRAINT [EmailLog_recipientUserId_fkey]
    FOREIGN KEY ([recipientUserId])
    REFERENCES [dbo].[User]([id])
    ON DELETE SET_NULL ON UPDATE CASCADE;

ALTER TABLE [dbo].[FilingStatus] ADD CONSTRAINT [FilingStatus_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_fromUserId_fkey]
    FOREIGN KEY ([fromUserId])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[InAppNotification] ADD CONSTRAINT [InAppNotification_userId_fkey]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[LeaderGroup] ADD CONSTRAINT [LeaderGroup_createdById_fkey]
    FOREIGN KEY ([createdById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE CASCADE;

ALTER TABLE [dbo].[LeaderGroupMember] ADD CONSTRAINT [LeaderGroupMember_addedById_fkey]
    FOREIGN KEY ([addedById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[LeaderGroupMember] ADD CONSTRAINT [LeaderGroupMember_employeeId_fkey]
    FOREIGN KEY ([employeeId])
    REFERENCES [dbo].[Employee]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[LeaderGroupMember] ADD CONSTRAINT [LeaderGroupMember_leaderGroupId_fkey]
    FOREIGN KEY ([leaderGroupId])
    REFERENCES [dbo].[LeaderGroup]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[LegalPrecedent] ADD CONSTRAINT [LegalPrecedent_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[MappedAccount] ADD CONSTRAINT [MappedAccount_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE NO_ACTION ON UPDATE CASCADE;

ALTER TABLE [dbo].[NewsBulletin] ADD CONSTRAINT [NewsBulletin_createdById_fkey]
    FOREIGN KEY ([createdById])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[NonClientAllocation] ADD CONSTRAINT [NonClientAllocation_employeeId_fkey]
    FOREIGN KEY ([employeeId])
    REFERENCES [dbo].[Employee]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_userId_fkey]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[OpinionChatMessage] ADD CONSTRAINT [OpinionChatMessage_opinionDraftId_fkey]
    FOREIGN KEY ([opinionDraftId])
    REFERENCES [dbo].[OpinionDraft]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[OpinionDocument] ADD CONSTRAINT [OpinionDocument_opinionDraftId_fkey]
    FOREIGN KEY ([opinionDraftId])
    REFERENCES [dbo].[OpinionDraft]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[OpinionDraft] ADD CONSTRAINT [OpinionDraft_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[OpinionSection] ADD CONSTRAINT [OpinionSection_opinionDraftId_fkey]
    FOREIGN KEY ([opinionDraftId])
    REFERENCES [dbo].[OpinionDraft]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ResearchNote] ADD CONSTRAINT [ResearchNote_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_addressedBy_fkey]
    FOREIGN KEY ([addressedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_assignedTo_fkey]
    FOREIGN KEY ([assignedTo])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_categoryId_fkey]
    FOREIGN KEY ([categoryId])
    REFERENCES [dbo].[ReviewCategory]([id])
    ON DELETE SET_NULL ON UPDATE CASCADE;

ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_clearedBy_fkey]
    FOREIGN KEY ([clearedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_currentOwner_fkey]
    FOREIGN KEY ([currentOwner])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_lastRespondedBy_fkey]
    FOREIGN KEY ([lastRespondedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_raisedBy_fkey]
    FOREIGN KEY ([raisedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ReviewNoteAssignee] ADD CONSTRAINT [FK_ReviewNoteAssignee_ReviewNote]
    FOREIGN KEY ([reviewNoteId])
    REFERENCES [dbo].[ReviewNote]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNoteAssignee] ADD CONSTRAINT [FK_ReviewNoteAssignee_User_assignedBy]
    FOREIGN KEY ([assignedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNoteAssignee] ADD CONSTRAINT [FK_ReviewNoteAssignee_User_userId]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNoteAttachment] ADD CONSTRAINT [FK_ReviewNoteAttachment_Comment]
    FOREIGN KEY ([commentId])
    REFERENCES [dbo].[ReviewNoteComment]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNoteAttachment] ADD CONSTRAINT [ReviewNoteAttachment_reviewNoteId_fkey]
    FOREIGN KEY ([reviewNoteId])
    REFERENCES [dbo].[ReviewNote]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ReviewNoteAttachment] ADD CONSTRAINT [ReviewNoteAttachment_uploadedBy_fkey]
    FOREIGN KEY ([uploadedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[ReviewNoteComment] ADD CONSTRAINT [ReviewNoteComment_reviewNoteId_fkey]
    FOREIGN KEY ([reviewNoteId])
    REFERENCES [dbo].[ReviewNote]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ReviewNoteComment] ADD CONSTRAINT [ReviewNoteComment_userId_fkey]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[SarsResponse] ADD CONSTRAINT [SarsResponse_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ServiceLineTool] ADD CONSTRAINT [ServiceLineTool_toolId_fkey]
    FOREIGN KEY ([toolId])
    REFERENCES [dbo].[Tool]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ServiceLineUser] ADD CONSTRAINT [ServiceLineUser_userId_fkey]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_createdBy_fkey]
    FOREIGN KEY ([createdBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_GSClientID_fkey]
    FOREIGN KEY ([GSClientID])
    REFERENCES [dbo].[Client]([GSClientID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[TaskAcceptance] ADD CONSTRAINT [TaskAcceptance_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskBudget] ADD CONSTRAINT [TaskBudget_GSClientID_fkey]
    FOREIGN KEY ([GSClientID])
    REFERENCES [dbo].[Client]([GSClientID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[TaskBudget] ADD CONSTRAINT [TaskBudget_GSTaskID_fkey]
    FOREIGN KEY ([GSTaskID])
    REFERENCES [dbo].[Task]([GSTaskID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[TaskBudgetDisbursement] ADD CONSTRAINT [TaskBudgetDisbursement_createdBy_fkey]
    FOREIGN KEY ([createdBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[TaskBudgetDisbursement] ADD CONSTRAINT [TaskBudgetDisbursement_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskBudgetFee] ADD CONSTRAINT [TaskBudgetFee_createdBy_fkey]
    FOREIGN KEY ([createdBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[TaskBudgetFee] ADD CONSTRAINT [TaskBudgetFee_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskDocument] ADD CONSTRAINT [TaskDocument_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskEngagementLetter] ADD CONSTRAINT [TaskEngagementLetter_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskEngagementLetter] ADD CONSTRAINT [TaskEngagementLetter_templateVersionId_fkey]
    FOREIGN KEY ([templateVersionId])
    REFERENCES [dbo].[TemplateVersion]([id])
    ON DELETE SET_NULL ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskIndependenceConfirmation] ADD CONSTRAINT [TaskIndependenceConfirmation_taskTeamId_fkey]
    FOREIGN KEY ([taskTeamId])
    REFERENCES [dbo].[TaskTeam]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskStage] ADD CONSTRAINT [FK_TaskStage_Task]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[TaskTeam] ADD CONSTRAINT [TaskTeam_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskTeam] ADD CONSTRAINT [TaskTeam_userId_fkey]
    FOREIGN KEY ([userId])
    REFERENCES [dbo].[User]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskTool] ADD CONSTRAINT [TaskTool_addedBy_fkey]
    FOREIGN KEY ([addedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[TaskTool] ADD CONSTRAINT [TaskTool_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaskTool] ADD CONSTRAINT [TaskTool_toolId_fkey]
    FOREIGN KEY ([toolId])
    REFERENCES [dbo].[Tool]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TaxAdjustment] ADD CONSTRAINT [TaxAdjustment_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE NO_ACTION ON UPDATE CASCADE;

ALTER TABLE [dbo].[TemplateSection] ADD CONSTRAINT [TemplateSection_templateId_fkey]
    FOREIGN KEY ([templateId])
    REFERENCES [dbo].[Template]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TemplateSectionVersion] ADD CONSTRAINT [TemplateSectionVersion_templateVersionId_fkey]
    FOREIGN KEY ([templateVersionId])
    REFERENCES [dbo].[TemplateVersion]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[TemplateVersion] ADD CONSTRAINT [TemplateVersion_templateId_fkey]
    FOREIGN KEY ([templateId])
    REFERENCES [dbo].[Template]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[ToolSubTab] ADD CONSTRAINT [ToolSubTab_toolId_fkey]
    FOREIGN KEY ([toolId])
    REFERENCES [dbo].[Tool]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_Approval]
    FOREIGN KEY ([approvalId])
    REFERENCES [dbo].[Approval]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_Category]
    FOREIGN KEY ([categoryId])
    REFERENCES [dbo].[VaultDocumentCategory]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_DocumentType]
    FOREIGN KEY ([documentType])
    REFERENCES [dbo].[VaultDocumentType]([code])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_ServiceLineMaster]
    FOREIGN KEY ([serviceLine])
    REFERENCES [dbo].[ServiceLineMaster]([code])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[VaultDocument] ADD CONSTRAINT [FK_VaultDocument_User]
    FOREIGN KEY ([uploadedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[VaultDocumentCategory] ADD CONSTRAINT [FK_VaultDocumentCategory_DocumentType]
    FOREIGN KEY ([documentType])
    REFERENCES [dbo].[VaultDocumentType]([code])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[VaultDocumentVersion] ADD CONSTRAINT [FK_VaultDocumentVersion_Document]
    FOREIGN KEY ([documentId])
    REFERENCES [dbo].[VaultDocument]([id])
    ON DELETE CASCADE ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[VaultDocumentVersion] ADD CONSTRAINT [FK_VaultDocumentVersion_User]
    FOREIGN KEY ([uploadedBy])
    REFERENCES [dbo].[User]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [Wip_GSClientID_fkey]
    FOREIGN KEY ([GSClientID])
    REFERENCES [dbo].[Client]([GSClientID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [Wip_GSTaskID_fkey]
    FOREIGN KEY ([GSTaskID])
    REFERENCES [dbo].[Task]([GSTaskID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[WIPAging] ADD CONSTRAINT [WIPAging_GSClientID_fkey]
    FOREIGN KEY ([GSClientID])
    REFERENCES [dbo].[Client]([GSClientID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[WIPAging] ADD CONSTRAINT [WIPAging_GSTaskID_fkey]
    FOREIGN KEY ([GSTaskID])
    REFERENCES [dbo].[Task]([GSTaskID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[WIPTransactions] ADD CONSTRAINT [WIPTransactions_GSClientID_fkey]
    FOREIGN KEY ([GSClientID])
    REFERENCES [dbo].[Client]([GSClientID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[WIPTransactions] ADD CONSTRAINT [WIPTransactions_GSTaskID_fkey]
    FOREIGN KEY ([GSTaskID])
    REFERENCES [dbo].[Task]([GSTaskID])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[WorkspaceFile] ADD CONSTRAINT [WorkspaceFile_folderId_fkey]
    FOREIGN KEY ([folderId])
    REFERENCES [dbo].[WorkspaceFolder]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[WorkspaceFileActivity] ADD CONSTRAINT [WorkspaceFileActivity_fileId_fkey]
    FOREIGN KEY ([fileId])
    REFERENCES [dbo].[WorkspaceFile]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[WorkspaceFilePermission] ADD CONSTRAINT [WorkspaceFilePermission_fileId_fkey]
    FOREIGN KEY ([fileId])
    REFERENCES [dbo].[WorkspaceFile]([id])
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [WorkspaceFolder_parentFolderId_fkey]
    FOREIGN KEY ([parentFolderId])
    REFERENCES [dbo].[WorkspaceFolder]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;

ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [WorkspaceFolder_taskId_fkey]
    FOREIGN KEY ([taskId])
    REFERENCES [dbo].[Task]([id])
    ON DELETE NO_ACTION ON UPDATE NO_ACTION;


-- ============================================================================
-- PART 4: STORED PROCEDURES
-- ============================================================================

-- Stored Procedure: sp_GetProfitabilityByTasks

CREATE PROCEDURE sp_GetProfitabilityByTasks
  @TaskIds NVARCHAR(MAX),
  @StartDate DATE,
  @EndDate DATE
AS
BEGIN
  SET NOCOUNT ON;
  SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
  
  DECLARE @TaskTable TABLE (GSTaskID UNIQUEIDENTIFIER);
  INSERT INTO @TaskTable
  SELECT CAST(value AS UNIQUEIDENTIFIER) 
  FROM OPENJSON(@TaskIds);
  
  SELECT 
    w.GSTaskID,
    SUM(CASE WHEN w.TType = 'T' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdTime,
    SUM(CASE WHEN w.TType = 'T' THEN ISNULL(w.Hour, 0) ELSE 0 END) as ltdHours,
    SUM(CASE WHEN w.TType = 'D' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdDisb,
    SUM(CASE WHEN w.TType = 'ADJ' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdAdj,
    SUM(CASE WHEN w.TType = 'F' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdFee,
    SUM(CASE WHEN w.TType = 'P' THEN ISNULL(w.Amount, 0) ELSE 0 END) as ltdProvision,
    SUM(CASE WHEN w.TType != 'P' THEN ISNULL(w.Cost, 0) ELSE 0 END) as ltdCost
  FROM WIPTransactions w
  INNER JOIN @TaskTable t ON w.GSTaskID = t.GSTaskID
  WHERE w.TranDate >= @StartDate AND w.TranDate <= @EndDate
  GROUP BY w.GSTaskID
  OPTION (RECOMPILE);
END


-- Stored Procedure: WipLTD

--Select * from Client
--select * from Task


--select 
--	top 50 *
--from WipTransactions w

CREATE procedure [dbo].[WipLTD] 
		 @ServLineCode nvarchar(max)	= '*'
		,@PartnerCode nvarchar(max)		= 'BLAW001'
		,@ManagerCode nvarchar(max)		= '*'
		,@GroupCode nvarchar(max)		= '*'
		,@ClientCode nvarchar(max)		= '*'
		,@TaskCode nvarchar(max)		= '*'
		,@DateTo datetime				= '2025/01/01'
as

set nocount on

;with Tsk as (
	select
		c.clientCode
		,c.clientNameFull
		,c.groupCode
		,c.groupDesc
		,t.TaskCode
		,t.OfficeCode
		,t.ServLineCode
		,t.ServLineDesc
		,t.TaskPartner
		,t.TaskPartnerName
		,t.TaskManager
		,t.TaskManagerName
		,t.GSTaskID
	from Task t
		cross apply (
				select 
					c.clientCode
					,c.clientNameFull
					,c.groupCode
					,c.groupDesc
				from Client c
				where (t.GSClientID = c.GSClientID)
					and (c.clientCode = @ClientCode or @ClientCode = '*')
					and (c.groupCode = @GroupCode or @GroupCode = '*')
			) c
	where (t.ServLineCode = @ServLineCode or @ServLineCode = '*')
		and (t.TaskPartner = @PartnerCode or @PartnerCode = '*')
		and (t.TaskManager = @ManagerCode or @ManagerCode = '*')
		and (t.TaskCode = @TaskCode or @TaskCode = '*')

)
, WipTran as (
	select 
		w.GSTaskID
		,case when w.TType = 'T' then w.Amount else 0 end TimeCharged
		,case when w.TType = 'D' then w.Amount else 0 end DisbCharged
		,case when w.TType = 'F' then 0 - w.Amount else 0 end FeesBilled
		,case when w.TType = 'ADJ' then w.Amount else 0 end Adjustments
		,case when w.TType = 'P' then w.Amount else 0 end WipProvision
		,case when w.TType = 'F' then 0 - w.Amount else w.Amount end BalWip
	from WipTransactions w
		cross apply (
				select 
					t.GSTaskID
				from Tsk t 
				where w.GSTaskID = t.GSTaskID
			) t
	where w.TranDate <= @DateTo
)
, WipLTD as (
	select 
		w.GSTaskID
		,sum(TimeCharged)  LTDTimeCharged
		,sum(DisbCharged)  LTDDisbCharged
		,sum(FeesBilled)   LTDFeesBilled
		,sum(Adjustments)  LTDAdjustments
		,sum(WipProvision) LTDWipProvision
		,sum(w.BalWip)	   BalWip
	from WipTran w
	group by w.GSTaskID
)

Select *
from Tsk t
	join WIPLTD w on t.GSTaskID = w.GSTaskID

-- Stored Procedure: WipLTD_V2

create PROCEDURE dbo.WipLTD_V2
      @ServLineCode nvarchar(10) = N'AUD'
    , @PartnerCode  nvarchar(10) = N'*'
    , @ManagerCode  nvarchar(10) = N'*'
    , @GroupCode    nvarchar(10) = N'*'
    , @ClientCode   nvarchar(10) = N'*'
    , @TaskCode     nvarchar(10) = N'*'
    , @DateTo       datetime2(7) = '2025-01-01'
AS
BEGIN
  SET NOCOUNT ON;

  ;WITH Tsk AS (
    SELECT
        c.ClientCode, c.ClientNameFull, c.GroupCode, c.GroupDesc,
        t.TaskCode, t.OfficeCode, t.ServLineCode, t.ServLineDesc,
        t.TaskPartner, t.TaskPartnerName, t.TaskManager, t.TaskManagerName,
        t.GSTaskID
    FROM dbo.Task t
    JOIN dbo.Client c
      ON c.GSClientID = t.GSClientID
    WHERE (@ServLineCode = N'*' OR t.ServLineCode = @ServLineCode)
      AND (@PartnerCode  = N'*' OR t.TaskPartner  = @PartnerCode)
      AND (@ManagerCode  = N'*' OR t.TaskManager  = @ManagerCode)
      AND (@TaskCode     = N'*' OR t.TaskCode     = @TaskCode)
      AND (@ClientCode   = N'*' OR c.ClientCode   = @ClientCode)
      AND (@GroupCode    = N'*' OR c.GroupCode    = @GroupCode)
  ),
  WipLTD AS (
    SELECT
        w.GSTaskID,
        SUM(CASE WHEN w.TType = 'T'   THEN w.Amount ELSE 0 END) AS LTDTimeCharged,
        SUM(CASE WHEN w.TType = 'D'   THEN w.Amount ELSE 0 END) AS LTDDisbCharged,
        SUM(CASE WHEN w.TType = 'F'   THEN 0 - w.Amount ELSE 0 END) AS LTDFeesBilled,
        SUM(CASE WHEN w.TType = 'ADJ' THEN w.Amount ELSE 0 END) AS LTDAdjustments,
        SUM(CASE WHEN w.TType = 'P'   THEN w.Amount ELSE 0 END) AS LTDWipProvision,
        SUM(CASE WHEN w.TType = 'F'   THEN 0 - w.Amount ELSE w.Amount END) AS BalWip
    FROM dbo.WipTransactions w
    JOIN Tsk t
      ON t.GSTaskID = w.GSTaskID
    WHERE w.TranDate <= @DateTo
    GROUP BY w.GSTaskID
  )
  SELECT t.*, w.*
  FROM Tsk t
  JOIN WipLTD w
    ON w.GSTaskID = t.GSTaskID
  OPTION (RECOMPILE);  -- helps with optional filters
END


