-- Add Client Acceptance and Continuance Questionnaire Tables
-- This migration adds tables to support comprehensive questionnaire-based
-- client acceptance and continuance workflows with risk assessment.

BEGIN TRY

BEGIN TRANSACTION;

-- ============================================
-- 1. Create ClientAcceptanceResponse table
-- ============================================
CREATE TABLE [dbo].[ClientAcceptanceResponse] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [projectId] INT NOT NULL,
    [clientId] INT NOT NULL,
    [questionnaireType] NVARCHAR(50) NOT NULL,  -- ACCEPTANCE_FULL, ACCEPTANCE_LITE, CONTINUANCE_FULL, CONTINUANCE_LITE
    [overallRiskScore] FLOAT,
    [riskRating] NVARCHAR(20),  -- LOW, MEDIUM, HIGH
    [riskSummary] NVARCHAR(MAX),
    [completedAt] DATETIME2,
    [completedBy] NVARCHAR(200),
    [reviewedBy] NVARCHAR(200),
    [reviewedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientAcceptanceResponse_createdAt_df] DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ClientAcceptanceResponse_updatedAt_df] DEFAULT GETDATE(),
    CONSTRAINT [FK_ClientAcceptanceResponse_Project] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ClientAcceptanceResponse_Client] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ClientAcceptanceResponse_projectId_idx] ON [dbo].[ClientAcceptanceResponse]([projectId]);
CREATE INDEX [ClientAcceptanceResponse_clientId_idx] ON [dbo].[ClientAcceptanceResponse]([clientId]);
CREATE INDEX [ClientAcceptanceResponse_questionnaireType_idx] ON [dbo].[ClientAcceptanceResponse]([questionnaireType]);
CREATE INDEX [ClientAcceptanceResponse_riskRating_idx] ON [dbo].[ClientAcceptanceResponse]([riskRating]);
CREATE INDEX [ClientAcceptanceResponse_projectId_questionnaireType_idx] ON [dbo].[ClientAcceptanceResponse]([projectId], [questionnaireType]);

-- ============================================
-- 2. Create AcceptanceQuestion table
-- ============================================
CREATE TABLE [dbo].[AcceptanceQuestion] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [questionnaireType] NVARCHAR(50) NOT NULL,  -- ACCEPTANCE_FULL, ACCEPTANCE_LITE, CONTINUANCE_FULL, CONTINUANCE_LITE
    [sectionKey] NVARCHAR(100) NOT NULL,  -- e.g., "independence", "money_laundering", "kyc"
    [questionKey] NVARCHAR(100) NOT NULL,  -- e.g., "Q1Independence"
    [questionText] NVARCHAR(MAX) NOT NULL,
    [description] NVARCHAR(MAX),
    [fieldType] NVARCHAR(50) NOT NULL,  -- RADIO, TEXTAREA, SELECT, FILE_UPLOAD
    [options] NVARCHAR(MAX),  -- JSON array of options
    [required] BIT NOT NULL CONSTRAINT [AcceptanceQuestion_required_df] DEFAULT 1,
    [order] INT NOT NULL,
    [riskWeight] FLOAT NOT NULL CONSTRAINT [AcceptanceQuestion_riskWeight_df] DEFAULT 1.0,
    [highRiskAnswers] NVARCHAR(500),  -- JSON array of answers that indicate high risk
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceQuestion_createdAt_df] DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceQuestion_updatedAt_df] DEFAULT GETDATE(),
    CONSTRAINT [AcceptanceQuestion_questionnaireType_questionKey_key] UNIQUE ([questionnaireType], [questionKey])
);

CREATE INDEX [AcceptanceQuestion_questionnaireType_idx] ON [dbo].[AcceptanceQuestion]([questionnaireType]);
CREATE INDEX [AcceptanceQuestion_questionnaireType_sectionKey_idx] ON [dbo].[AcceptanceQuestion]([questionnaireType], [sectionKey]);
CREATE INDEX [AcceptanceQuestion_questionnaireType_order_idx] ON [dbo].[AcceptanceQuestion]([questionnaireType], [order]);

-- ============================================
-- 3. Create AcceptanceAnswer table
-- ============================================
CREATE TABLE [dbo].[AcceptanceAnswer] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [responseId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [answer] NVARCHAR(MAX),
    [comment] NVARCHAR(MAX),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceAnswer_createdAt_df] DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceAnswer_updatedAt_df] DEFAULT GETDATE(),
    CONSTRAINT [FK_AcceptanceAnswer_Response] FOREIGN KEY ([responseId]) REFERENCES [dbo].[ClientAcceptanceResponse]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AcceptanceAnswer_Question] FOREIGN KEY ([questionId]) REFERENCES [dbo].[AcceptanceQuestion]([id]) ON DELETE CASCADE,
    CONSTRAINT [AcceptanceAnswer_responseId_questionId_key] UNIQUE ([responseId], [questionId])
);

CREATE INDEX [AcceptanceAnswer_responseId_idx] ON [dbo].[AcceptanceAnswer]([responseId]);
CREATE INDEX [AcceptanceAnswer_questionId_idx] ON [dbo].[AcceptanceAnswer]([questionId]);

-- ============================================
-- 4. Create AcceptanceDocument table
-- ============================================
CREATE TABLE [dbo].[AcceptanceDocument] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [responseId] INT NOT NULL,
    [documentType] NVARCHAR(50) NOT NULL,  -- WECHECK, PONG, OTHER
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(200) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceDocument_uploadedAt_df] DEFAULT GETDATE(),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AcceptanceDocument_createdAt_df] DEFAULT GETDATE(),
    CONSTRAINT [FK_AcceptanceDocument_Response] FOREIGN KEY ([responseId]) REFERENCES [dbo].[ClientAcceptanceResponse]([id]) ON DELETE CASCADE
);

CREATE INDEX [AcceptanceDocument_responseId_idx] ON [dbo].[AcceptanceDocument]([responseId]);
CREATE INDEX [AcceptanceDocument_documentType_idx] ON [dbo].[AcceptanceDocument]([documentType]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH

