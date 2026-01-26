-- Add DPA (Data Processing Agreement) fields to TaskEngagementLetter table
ALTER TABLE [dbo].[TaskEngagementLetter]
ADD [dpaUploaded] BIT NOT NULL CONSTRAINT [DF_TaskEngagementLetter_dpaUploaded] DEFAULT 0;

ALTER TABLE [dbo].[TaskEngagementLetter]
ADD [dpaFilePath] NVARCHAR(MAX) NULL;

ALTER TABLE [dbo].[TaskEngagementLetter]
ADD [dpaUploadedAt] DATETIME2 NULL;

ALTER TABLE [dbo].[TaskEngagementLetter]
ADD [dpaUploadedBy] NVARCHAR(MAX) NULL;



