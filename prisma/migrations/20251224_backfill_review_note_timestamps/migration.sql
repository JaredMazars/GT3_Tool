-- Backfill Review Note Timestamps
-- Fixes data inconsistency where status transitions were recorded but timestamps were not set

-- Backfill clearedAt for CLEARED notes without timestamp
UPDATE [dbo].[ReviewNote]
SET [clearedAt] = [updatedAt]
WHERE [status] = 'CLEARED' 
  AND [clearedAt] IS NULL;

-- Backfill rejectedAt for REJECTED notes without timestamp
UPDATE [dbo].[ReviewNote]
SET [rejectedAt] = [updatedAt]
WHERE [status] = 'REJECTED' 
  AND [rejectedAt] IS NULL;

-- Backfill addressedAt for ADDRESSED notes without timestamp
UPDATE [dbo].[ReviewNote]
SET [addressedAt] = [updatedAt]
WHERE [status] = 'ADDRESSED' 
  AND [addressedAt] IS NULL;




