-- Migration: Add userId column to ClientAcceptance table
-- Date: 2026-01-17
-- Description: Add missing userId field to track who initiated the acceptance process

-- =============================================================================
-- STEP 1: Add userId column
-- =============================================================================
ALTER TABLE [dbo].[ClientAcceptance]
ADD [userId] NVARCHAR(200) NULL;

-- =============================================================================
-- STEP 2: Create index for performance
-- =============================================================================
CREATE NONCLUSTERED INDEX [IX_ClientAcceptance_userId] 
ON [dbo].[ClientAcceptance]([userId] ASC);

-- =============================================================================
-- STEP 3: Add foreign key constraint
-- =============================================================================
ALTER TABLE [dbo].[ClientAcceptance] 
ADD CONSTRAINT [FK_ClientAcceptance_User] 
FOREIGN KEY([userId]) REFERENCES [dbo].[User] ([id]) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;

-- =============================================================================
-- STEP 4: Verification
-- =============================================================================
-- Verify the column was added successfully
SELECT 
    'ClientAcceptance userId column' as MigrationStep,
    CASE 
        WHEN COL_LENGTH('dbo.ClientAcceptance', 'userId') IS NOT NULL 
        THEN 'Added Successfully' 
        ELSE 'Failed' 
    END as Status;

-- =============================================================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================================================
-- To rollback this migration, execute the following:
/*
-- Drop foreign key constraint
ALTER TABLE [dbo].[ClientAcceptance] DROP CONSTRAINT [FK_ClientAcceptance_User];

-- Drop index
DROP INDEX [IX_ClientAcceptance_userId] ON [dbo].[ClientAcceptance];

-- Drop column
ALTER TABLE [dbo].[ClientAcceptance] DROP COLUMN [userId];
*/
