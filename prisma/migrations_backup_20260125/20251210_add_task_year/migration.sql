-- Add taskYear column to Task table
-- This migration adds a required year field to track the applicable year for each task

BEGIN TRY
    BEGIN TRANSACTION;

    -- Step 1: Add taskYear column as nullable
    IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[Task]') 
        AND name = 'taskYear'
    )
    BEGIN
        ALTER TABLE [dbo].[Task] ADD [taskYear] INT NULL;
        PRINT 'Added taskYear column to Task table';
    END
    ELSE
    BEGIN
        PRINT 'taskYear column already exists';
    END

    -- Step 2: Set default values for existing tasks (extract year from TaskDateOpen)
    UPDATE [dbo].[Task] 
    SET [taskYear] = YEAR([TaskDateOpen]);
    PRINT 'Set default taskYear values from TaskDateOpen';

    -- Step 3: Make column NOT NULL
    ALTER TABLE [dbo].[Task] ALTER COLUMN [taskYear] INT NOT NULL;
    PRINT 'Changed taskYear to NOT NULL';

    -- Step 4: Add index on taskYear
    IF NOT EXISTS (
        SELECT * FROM sys.indexes 
        WHERE name = 'Task_taskYear_idx' 
        AND object_id = OBJECT_ID(N'[dbo].[Task]')
    )
    BEGIN
        CREATE INDEX [Task_taskYear_idx] ON [dbo].[Task]([taskYear]);
        PRINT 'Created index on taskYear';
    END
    ELSE
    BEGIN
        PRINT 'Index on taskYear already exists';
    END

    COMMIT TRANSACTION;
    PRINT 'Migration completed successfully';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    PRINT 'ERROR: ' + @ErrorMessage;
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;

























