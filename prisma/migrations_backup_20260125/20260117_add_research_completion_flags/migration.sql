-- Add research completion flags to ClientAcceptance table

-- Check if researchCompleted column exists, add if it doesn't
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[ClientAcceptance]') 
    AND name = 'researchCompleted'
)
BEGIN
    ALTER TABLE [dbo].[ClientAcceptance]
    ADD [researchCompleted] BIT NOT NULL CONSTRAINT [DF_ClientAcceptance_researchCompleted] DEFAULT 0;
    PRINT 'Added researchCompleted column';
END
ELSE
BEGIN
    PRINT 'Column researchCompleted already exists';
END;

-- Check if researchSkipped column exists, add if it doesn't
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[ClientAcceptance]') 
    AND name = 'researchSkipped'
)
BEGIN
    ALTER TABLE [dbo].[ClientAcceptance]
    ADD [researchSkipped] BIT NOT NULL CONSTRAINT [DF_ClientAcceptance_researchSkipped] DEFAULT 0;
    PRINT 'Added researchSkipped column';
END
ELSE
BEGIN
    PRINT 'Column researchSkipped already exists';
END;

-- Backfill researchCompleted flag for existing records that have research data
IF EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[ClientAcceptance]') 
    AND name = 'researchCompleted'
)
BEGIN
    UPDATE [dbo].[ClientAcceptance]
    SET [researchCompleted] = 1
    WHERE [researchData] IS NOT NULL AND [researchData] != '';
    
    PRINT 'Backfilled ' + CAST(@@ROWCOUNT AS VARCHAR) + ' records with research data';
END;
