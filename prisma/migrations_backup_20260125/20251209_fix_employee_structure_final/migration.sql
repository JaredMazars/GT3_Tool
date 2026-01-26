-- Fix Employee table to follow Dual-ID Convention
-- This migration is idempotent - it checks current state before applying changes

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @hasIdColumn BIT = 0;
    DECLARE @hasGSEmpID BIT = 0;
    DECLARE @hasGSEmployeeID BIT = 0;
    DECLARE @pkName NVARCHAR(200);

    -- Check which columns exist
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employee' AND COLUMN_NAME = 'id')
        SET @hasIdColumn = 1;

    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employee' AND COLUMN_NAME = 'GSEmpID')
        SET @hasGSEmpID = 1;

    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employee' AND COLUMN_NAME = 'GSEmployeeID')
        SET @hasGSEmployeeID = 1;

    -- Get primary key name
    SELECT @pkName = CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_NAME = 'Employee' AND CONSTRAINT_TYPE = 'PRIMARY KEY';

    -- Case 1: Table has GSEmpID (old structure) - need to migrate
    IF @hasGSEmpID = 1 AND @hasIdColumn = 0
    BEGIN
        PRINT 'Migrating from old structure (GSEmpID) to new structure (id + GSEmployeeID)';

        -- Drop existing primary key
        IF @pkName IS NOT NULL
        BEGIN
            EXEC('ALTER TABLE [dbo].[Employee] DROP CONSTRAINT [' + @pkName + ']');
        END

        -- Add new id column with IDENTITY
        ALTER TABLE [dbo].[Employee] ADD [id] INT NOT NULL IDENTITY(1,1);

        -- Rename GSEmpID to GSEmployeeID
        EXEC sp_rename 'dbo.Employee.GSEmpID', 'GSEmployeeID', 'COLUMN';

        -- Create new primary key on id
        ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_pkey] PRIMARY KEY CLUSTERED ([id]);

        -- Create unique constraint on GSEmployeeID
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                      WHERE TABLE_NAME = 'Employee' AND CONSTRAINT_NAME = 'Employee_GSEmployeeID_key')
        BEGIN
            ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_GSEmployeeID_key] UNIQUE NONCLUSTERED ([GSEmployeeID]);
        END

        PRINT 'Migration completed successfully';
    END
    -- Case 2: Table already has id column (migration already applied or partial)
    ELSE IF @hasIdColumn = 1
    BEGIN
        PRINT 'Table already has id column - verifying structure';

        -- Ensure primary key is on id
        IF @pkName IS NULL OR @pkName != 'Employee_pkey'
        BEGIN
            IF @pkName IS NOT NULL
            BEGIN
                EXEC('ALTER TABLE [dbo].[Employee] DROP CONSTRAINT [' + @pkName + ']');
            END
            ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_pkey] PRIMARY KEY CLUSTERED ([id]);
        END

        -- Ensure GSEmployeeID has unique constraint
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                      WHERE TABLE_NAME = 'Employee' AND CONSTRAINT_NAME = 'Employee_GSEmployeeID_key')
        BEGIN
            ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_GSEmployeeID_key] UNIQUE NONCLUSTERED ([GSEmployeeID]);
        END

        PRINT 'Structure verification completed';
    END
    ELSE
    BEGIN
        PRINT 'Unknown Employee table structure - manual intervention required';
        THROW 50000, 'Employee table structure is not in expected state', 1;
    END

    COMMIT TRANSACTION;
    PRINT 'Employee table migration successful';
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


























