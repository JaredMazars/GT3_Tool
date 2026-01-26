-- Migration: Add Bug Report Model
-- Description: Add BugReport table for user-submitted bug reports with screenshots

-- =====================================================
-- Create BugReport Table
-- =====================================================
CREATE TABLE [dbo].[BugReport] (
  [id] INT NOT NULL IDENTITY(1,1),
  [reportedBy] NVARCHAR(450) NOT NULL,
  [reportedAt] DATETIME2 NOT NULL CONSTRAINT [DF_BugReport_reportedAt] DEFAULT CURRENT_TIMESTAMP,
  [url] NVARCHAR(500) NOT NULL,
  [description] NVARCHAR(MAX) NOT NULL,
  [screenshotPath] NVARCHAR(500) NULL,
  [status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_BugReport_status] DEFAULT 'OPEN',
  [testedAt] DATETIME2 NULL,
  [testedBy] NVARCHAR(450) NULL,
  [resolvedAt] DATETIME2 NULL,
  [resolvedBy] NVARCHAR(450) NULL,
  [resolutionNotes] NVARCHAR(MAX) NULL,
  [priority] NVARCHAR(20) NOT NULL CONSTRAINT [DF_BugReport_priority] DEFAULT 'MEDIUM',
  CONSTRAINT [PK_BugReport] PRIMARY KEY CLUSTERED ([id] ASC)
);

-- =====================================================
-- Create Indexes
-- =====================================================
CREATE NONCLUSTERED INDEX [IX_BugReport_reportedBy] ON [dbo].[BugReport]([reportedBy] ASC);
CREATE NONCLUSTERED INDEX [IX_BugReport_status] ON [dbo].[BugReport]([status] ASC);
CREATE NONCLUSTERED INDEX [IX_BugReport_reportedAt] ON [dbo].[BugReport]([reportedAt] DESC);
CREATE NONCLUSTERED INDEX [IX_BugReport_priority] ON [dbo].[BugReport]([priority] ASC);

-- =====================================================
-- Create Foreign Key Constraints
-- =====================================================
ALTER TABLE [dbo].[BugReport]
ADD CONSTRAINT [FK_BugReport_User_reportedBy] FOREIGN KEY ([reportedBy])
REFERENCES [dbo].[User] ([id]) ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE [dbo].[BugReport]
ADD CONSTRAINT [FK_BugReport_User_testedBy] FOREIGN KEY ([testedBy])
REFERENCES [dbo].[User] ([id]) ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE [dbo].[BugReport]
ADD CONSTRAINT [FK_BugReport_User_resolvedBy] FOREIGN KEY ([resolvedBy])
REFERENCES [dbo].[User] ([id]) ON UPDATE NO ACTION ON DELETE NO ACTION;
