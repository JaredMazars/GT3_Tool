-- Migration: Add Document Version Field
-- Description: Add documentVersion field to store AI-detected internal version numbers from document content

-- =====================================================
-- Add documentVersion Column to VaultDocument
-- =====================================================
ALTER TABLE [dbo].[VaultDocument]
ADD [documentVersion] NVARCHAR(50) NULL;

-- Note: This field stores the internal version number found in the document content
-- (e.g., "1.0", "Rev 3", "Draft 2") which is separate from the system-tracked 
-- version field used for revision history.
