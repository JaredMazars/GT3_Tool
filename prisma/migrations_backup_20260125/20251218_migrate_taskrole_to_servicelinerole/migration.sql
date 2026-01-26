-- Migration: Convert TaskRole to ServiceLineRole
-- This migration updates all TaskTeam.role values from TaskRole enum (ADMIN, REVIEWER, EDITOR, VIEWER)
-- to ServiceLineRole values based on each user's ServiceLineRole in the task's sub-service line group.

BEGIN TRANSACTION;

-- Step 1: Create a temporary table to store the mapping
CREATE TABLE #TaskTeamRoleMapping (
    taskTeamId INT,
    newRole NVARCHAR(50)
);

-- Step 2: For each TaskTeam record, determine the new role based on user's ServiceLineRole
-- This maps the task's ServLineCode to SubServlineGroupCode and finds the user's role
INSERT INTO #TaskTeamRoleMapping (taskTeamId, newRole)
SELECT 
    tt.id AS taskTeamId,
    COALESCE(slu.role, 'USER') AS newRole
FROM TaskTeam tt
INNER JOIN Task t ON tt.taskId = t.id
LEFT JOIN ServiceLineExternal sle ON t.ServLineCode = sle.ServLineCode
LEFT JOIN ServiceLineUser slu ON tt.userId = slu.userId 
    AND sle.SubServlineGroupCode = slu.subServiceLineGroup
WHERE tt.role IN ('ADMIN', 'REVIEWER', 'EDITOR', 'VIEWER');

-- Step 3: Update TaskTeam roles with the mapped ServiceLineRole values
UPDATE tt
SET tt.role = m.newRole
FROM TaskTeam tt
INNER JOIN #TaskTeamRoleMapping m ON tt.id = m.taskTeamId;

-- Step 4: Log the migration results
DECLARE @updatedCount INT;
SELECT @updatedCount = COUNT(*) FROM #TaskTeamRoleMapping;
PRINT 'TaskRole to ServiceLineRole Migration Complete';
PRINT 'Updated ' + CAST(@updatedCount AS NVARCHAR(10)) + ' TaskTeam records';

-- Step 5: Clean up temporary table
DROP TABLE #TaskTeamRoleMapping;

COMMIT TRANSACTION;





















