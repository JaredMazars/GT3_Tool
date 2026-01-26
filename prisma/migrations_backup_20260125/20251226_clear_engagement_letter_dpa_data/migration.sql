-- Clear existing engagement letter and DPA data for blob storage migration
-- This gives us a clean slate to migrate to Azure Blob Storage

-- Clear engagement letter fields
UPDATE [dbo].[TaskEngagementLetter]
SET 
  [uploaded] = 0,
  [filePath] = NULL,
  [uploadedBy] = NULL,
  [uploadedAt] = NULL,
  [dpaUploaded] = 0,
  [dpaFilePath] = NULL,
  [dpaUploadedBy] = NULL,
  [dpaUploadedAt] = NULL;

-- Log the migration
PRINT 'Cleared all engagement letter and DPA data for blob storage migration';


