-- Migration: Add Client Acceptance Split
-- Date: 2026-01-17
-- Description: Splits acceptance workflow into Client-level and Engagement-level acceptance

-- =============================================================================
-- STEP 1: Create ClientAcceptance table (client-level acceptance)
-- =============================================================================
CREATE TABLE [dbo].[ClientAcceptance] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientId] INT NOT NULL,
    [riskRating] NVARCHAR(20) NULL,
    [overallRiskScore] FLOAT NULL,
    [riskSummary] NVARCHAR(MAX) NULL,
    [completedAt] DATETIME2 NULL,
    [completedBy] NVARCHAR(200) NULL,
    [approvedAt] DATETIME2 NULL,
    [approvedBy] NVARCHAR(200) NULL,
    [approvalId] INT NULL,
    [validUntil] DATETIME2 NULL,
    [lastReviewedAt] DATETIME2 NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptance_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptance_updatedAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__ClientAc__3213E83F94B62F26] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_ClientAcceptance_clientId] UNIQUE ([clientId])
);

-- Create indexes for ClientAcceptance
CREATE NONCLUSTERED INDEX [IX_ClientAcceptance_approvalId] ON [dbo].[ClientAcceptance]([approvalId] ASC);
CREATE NONCLUSTERED INDEX [IX_ClientAcceptance_clientId] ON [dbo].[ClientAcceptance]([clientId] ASC);
CREATE NONCLUSTERED INDEX [IX_ClientAcceptance_riskRating] ON [dbo].[ClientAcceptance]([riskRating] ASC);
CREATE NONCLUSTERED INDEX [IX_ClientAcceptance_approvedAt] ON [dbo].[ClientAcceptance]([approvedAt] ASC);

-- Add foreign key constraints
ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [FK_ClientAcceptance_Client] 
    FOREIGN KEY([clientId]) REFERENCES [dbo].[Client] ([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ClientAcceptance] ADD CONSTRAINT [FK_ClientAcceptance_Approval] 
    FOREIGN KEY([approvalId]) REFERENCES [dbo].[Approval] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- =============================================================================
-- STEP 2: Create ClientAcceptanceAnswer table
-- =============================================================================
CREATE TABLE [dbo].[ClientAcceptanceAnswer] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientAcceptanceId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [answer] NVARCHAR(MAX) NULL,
    [comment] NVARCHAR(MAX) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptanceAnswer_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientAcceptanceAnswer_updatedAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__ClientAc__3213E83F4AB0FF4C] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_ClientAcceptanceAnswer_clientAcceptanceId_questionId] UNIQUE ([clientAcceptanceId], [questionId])
);

-- Create indexes for ClientAcceptanceAnswer
CREATE NONCLUSTERED INDEX [IX_ClientAcceptanceAnswer_questionId] ON [dbo].[ClientAcceptanceAnswer]([questionId] ASC);
CREATE NONCLUSTERED INDEX [IX_ClientAcceptanceAnswer_clientAcceptanceId] ON [dbo].[ClientAcceptanceAnswer]([clientAcceptanceId] ASC);

-- Add foreign key constraints
ALTER TABLE [dbo].[ClientAcceptanceAnswer] ADD CONSTRAINT [FK_ClientAcceptanceAnswer_Question] 
    FOREIGN KEY([questionId]) REFERENCES [dbo].[AcceptanceQuestion] ([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ClientAcceptanceAnswer] ADD CONSTRAINT [FK_ClientAcceptanceAnswer_ClientAcceptance] 
    FOREIGN KEY([clientAcceptanceId]) REFERENCES [dbo].[ClientAcceptance] ([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- =============================================================================
-- STEP 3: Update AcceptanceAnswer foreign key constraint name (for clarity)
-- =============================================================================
-- Note: Renaming constraint for clarity - it now points to engagement-level responses
-- This is optional and can be done later if needed
-- ALTER TABLE [dbo].[AcceptanceAnswer] DROP CONSTRAINT [FK_AcceptanceAnswer_Response];
-- ALTER TABLE [dbo].[AcceptanceAnswer] ADD CONSTRAINT [FK_AcceptanceAnswer_EngagementResponse] 
--     FOREIGN KEY([responseId]) REFERENCES [dbo].[ClientAcceptanceResponse] ([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- =============================================================================
-- STEP 4: Data Migration - Create ClientAcceptance from existing data
-- =============================================================================
-- For each client that has task acceptance records, create a ClientAcceptance record
-- using the data from the first completed acceptance for that client

INSERT INTO [dbo].[ClientAcceptance] (
    [clientId],
    [riskRating],
    [overallRiskScore],
    [riskSummary],
    [completedAt],
    [completedBy],
    [approvedAt],
    [approvedBy],
    [createdAt],
    [updatedAt]
)
SELECT 
    c.id as clientId,
    ta.riskRating,
    ta.overallRiskScore,
    NULL as riskSummary, -- Will be populated with engagement-specific summary
    car.completedAt,
    car.completedBy,
    ta.approvedAt,
    ta.approvedBy,
    car.createdAt,
    GETDATE() as updatedAt
FROM (
    -- Get the first completed acceptance for each client
    SELECT 
        t.GSClientID,
        MIN(car.id) as firstAcceptanceId
    FROM [dbo].[Task] t
    INNER JOIN [dbo].[ClientAcceptanceResponse] car ON car.taskId = t.id
    WHERE t.GSClientID IS NOT NULL 
      AND car.completedAt IS NOT NULL
    GROUP BY t.GSClientID
) first_acceptance
INNER JOIN [dbo].[ClientAcceptanceResponse] car ON car.id = first_acceptance.firstAcceptanceId
INNER JOIN [dbo].[Task] t ON t.id = car.taskId
INNER JOIN [dbo].[Client] c ON c.GSClientID = t.GSClientID
LEFT JOIN [dbo].[TaskAcceptance] ta ON ta.taskId = t.id
WHERE NOT EXISTS (
    -- Don't create duplicate if already exists
    SELECT 1 FROM [dbo].[ClientAcceptance] ca2 WHERE ca2.clientId = c.id
);

-- =============================================================================
-- STEP 5: Copy answers to ClientAcceptanceAnswer for migrated records
-- =============================================================================
-- Note: This copies ALL answers from the first acceptance
-- In reality, we'd want to filter to only CLIENT_ACCEPTANCE type questions
-- This can be refined once question types are properly categorized

INSERT INTO [dbo].[ClientAcceptanceAnswer] (
    [clientAcceptanceId],
    [questionId],
    [answer],
    [comment],
    [createdAt],
    [updatedAt]
)
SELECT 
    ca.id as clientAcceptanceId,
    aa.questionId,
    aa.answer,
    aa.comment,
    aa.createdAt,
    GETDATE() as updatedAt
FROM [dbo].[ClientAcceptance] ca
INNER JOIN [dbo].[Client] c ON c.id = ca.clientId
INNER JOIN [dbo].[Task] t ON t.GSClientID = c.GSClientID
INNER JOIN [dbo].[ClientAcceptanceResponse] car ON car.taskId = t.id AND car.clientId = c.id
INNER JOIN [dbo].[AcceptanceAnswer] aa ON aa.responseId = car.id
WHERE car.completedAt = ca.completedAt -- Match the same acceptance record we migrated
  AND NOT EXISTS (
    -- Don't create duplicates
    SELECT 1 FROM [dbo].[ClientAcceptanceAnswer] caa2 
    WHERE caa2.clientAcceptanceId = ca.id AND caa2.questionId = aa.questionId
  );

-- =============================================================================
-- STEP 6: Add validation and cleanup
-- =============================================================================
-- Verify migration results
SELECT 
    'ClientAcceptance Records Created' as MigrationStep,
    COUNT(*) as RecordCount
FROM [dbo].[ClientAcceptance];

SELECT 
    'ClientAcceptanceAnswer Records Created' as MigrationStep,
    COUNT(*) as RecordCount
FROM [dbo].[ClientAcceptanceAnswer];

-- =============================================================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================================================
-- To rollback this migration, execute the following:
/*
-- Drop foreign key constraints first
ALTER TABLE [dbo].[ClientAcceptanceAnswer] DROP CONSTRAINT [FK_ClientAcceptanceAnswer_ClientAcceptance];
ALTER TABLE [dbo].[ClientAcceptanceAnswer] DROP CONSTRAINT [FK_ClientAcceptanceAnswer_Question];
ALTER TABLE [dbo].[ClientAcceptance] DROP CONSTRAINT [FK_ClientAcceptance_Approval];
ALTER TABLE [dbo].[ClientAcceptance] DROP CONSTRAINT [FK_ClientAcceptance_Client];

-- Drop tables
DROP TABLE [dbo].[ClientAcceptanceAnswer];
DROP TABLE [dbo].[ClientAcceptance];
*/
