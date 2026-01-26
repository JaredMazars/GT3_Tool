-- Add CHECK constraint to enforce valid stage values
-- This ensures data integrity at the database level

-- First, drop the constraint if it already exists (idempotent)
IF EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE name = 'CK_TaskStage_ValidStage' 
    AND parent_object_id = OBJECT_ID('dbo.TaskStage')
)
BEGIN
    ALTER TABLE [dbo].[TaskStage] DROP CONSTRAINT [CK_TaskStage_ValidStage];
END

-- Add the CHECK constraint for valid stage values
ALTER TABLE [dbo].[TaskStage]
ADD CONSTRAINT [CK_TaskStage_ValidStage]
CHECK (stage IN ('ENGAGE', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'));

