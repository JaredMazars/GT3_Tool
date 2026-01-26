-- Remove duplicate TaskTeam entries, keeping the entry with the highest id (most recent)
-- This uses a CTE to identify duplicates and deletes all but the latest entry per taskId+userId

WITH DuplicateCTE AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY taskId, userId 
    ORDER BY id DESC
  ) AS rn
  FROM TaskTeam
)
DELETE FROM TaskTeam WHERE id IN (
  SELECT id FROM DuplicateCTE WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX TaskTeam_taskId_userId_key ON TaskTeam(taskId, userId);

































