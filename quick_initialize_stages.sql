-- Quick TaskStage Initialization Script
-- This script efficiently initializes all tasks with a DRAFT stage in one SQL statement
-- Run this in SQL Server Management Studio or Azure Data Studio

PRINT 'Starting bulk insert...';

-- Insert stages for all tasks that don't have one yet
INSERT INTO dbo.TaskStage (taskId, stage, movedBy, notes, createdAt)
SELECT 
    t.id,
    'ENGAGE',
    '93bdd18f-1a43-4c77-bca6-d147ca1c82a9.c98c02b7-1480-4cf2-bf51-c12fdf55a9f8',
    'Initial stage set during data migration',
    GETDATE()
FROM dbo.Task t
WHERE NOT EXISTS (
    SELECT 1 
    FROM dbo.TaskStage ts 
    WHERE ts.taskId = t.id
);

-- Show results
DECLARE @InsertedCount INT = @@ROWCOUNT;
PRINT 'Completed! Inserted ' + CAST(@InsertedCount AS NVARCHAR(50)) + ' stage records.';

-- Verify the data
SELECT 
    COUNT(*) as TotalStages,
    stage,
    COUNT(DISTINCT taskId) as UniqueTasks
FROM dbo.TaskStage
GROUP BY stage
ORDER BY stage;

PRINT 'TaskStage initialization complete!';












