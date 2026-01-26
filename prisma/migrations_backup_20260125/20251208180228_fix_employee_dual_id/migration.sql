-- Fix Employee table to follow Dual-ID Convention
-- Add internal ID as primary key, rename GSEmpID to GSEmployeeID for external sync only

BEGIN TRY
    BEGIN TRANSACTION;

    -- Step 1: Drop the existing primary key constraint
    ALTER TABLE [dbo].[Employee] DROP CONSTRAINT [Employee_pkey];

    -- Step 2: Add the new internal id column with auto-increment
    ALTER TABLE [dbo].[Employee] ADD [id] INT NOT NULL IDENTITY(1,1);

    -- Step 3: Rename GSEmpID to GSEmployeeID
    EXEC sp_rename 'dbo.Employee.GSEmpID', 'GSEmployeeID', 'COLUMN';

    -- Step 4: Create new primary key on id column
    ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_pkey] PRIMARY KEY CLUSTERED ([id]);

    -- Step 5: Create unique constraint on GSEmployeeID (for external sync)
    ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_GSEmployeeID_key] UNIQUE NONCLUSTERED ([GSEmployeeID]);

    -- Step 6: Create unique constraint on EmpCode (for display/search)
    ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_EmpCode_key] UNIQUE NONCLUSTERED ([EmpCode]);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
