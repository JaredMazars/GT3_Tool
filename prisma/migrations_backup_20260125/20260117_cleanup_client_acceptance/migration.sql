-- Migration: Cleanup Client Acceptance Data
-- Date: 2026-01-17
-- Description: Clean up migrated client acceptance data to start fresh with new schema

-- =============================================================================
-- STEP 1: Delete ClientAcceptanceAnswer records (will cascade from ClientAcceptance delete)
-- =============================================================================
-- Note: Foreign key cascade will handle this automatically when we delete ClientAcceptance

-- =============================================================================
-- STEP 2: Delete ClientAcceptance records
-- =============================================================================
DELETE FROM [dbo].[ClientAcceptance];

-- =============================================================================
-- STEP 3: Reset identity seed (optional - starts IDs from 1 again)
-- =============================================================================
DBCC CHECKIDENT ('[dbo].[ClientAcceptance]', RESEED, 0);
DBCC CHECKIDENT ('[dbo].[ClientAcceptanceAnswer]', RESEED, 0);

-- =============================================================================
-- STEP 4: Verification
-- =============================================================================
SELECT 
    'ClientAcceptance Records After Cleanup' as Step,
    COUNT(*) as RecordCount
FROM [dbo].[ClientAcceptance];

SELECT 
    'ClientAcceptanceAnswer Records After Cleanup' as Step,
    COUNT(*) as RecordCount
FROM [dbo].[ClientAcceptanceAnswer];

-- =============================================================================
-- Notes:
-- =============================================================================
-- This cleanup removes all existing ClientAcceptance and ClientAcceptanceAnswer records.
-- AcceptanceQuestion records are preserved as they contain the question definitions.
-- Users will need to complete client acceptance questionnaires again.
-- This ensures all new records will have proper userId tracking.
