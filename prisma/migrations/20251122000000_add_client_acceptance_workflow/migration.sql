-- Add Client Acceptance and Engagement Letter Workflow Fields
-- This migration adds fields to track client acceptance and continuance,
-- as well as engagement letter generation and upload status.

BEGIN TRY

BEGIN TRANSACTION;

-- Add acceptance workflow fields
ALTER TABLE [dbo].[Project] ADD [acceptanceApproved] BIT NOT NULL CONSTRAINT [Project_acceptanceApproved_df] DEFAULT 0;
ALTER TABLE [dbo].[Project] ADD [acceptanceApprovedBy] NVARCHAR(1000);
ALTER TABLE [dbo].[Project] ADD [acceptanceApprovedAt] DATETIME2;

-- Add engagement letter workflow fields
ALTER TABLE [dbo].[Project] ADD [engagementLetterGenerated] BIT NOT NULL CONSTRAINT [Project_engagementLetterGenerated_df] DEFAULT 0;
ALTER TABLE [dbo].[Project] ADD [engagementLetterUploaded] BIT NOT NULL CONSTRAINT [Project_engagementLetterUploaded_df] DEFAULT 0;
ALTER TABLE [dbo].[Project] ADD [engagementLetterPath] NVARCHAR(1000);
ALTER TABLE [dbo].[Project] ADD [engagementLetterUploadedBy] NVARCHAR(1000);
ALTER TABLE [dbo].[Project] ADD [engagementLetterUploadedAt] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH

















