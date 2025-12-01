-- Migration: Rename SUPERUSER to SYSTEM_ADMIN
-- This migration renames the SUPERUSER role to SYSTEM_ADMIN for clarity

BEGIN TRY
  BEGIN TRANSACTION;

  -- Update existing User records with SUPERUSER role to SYSTEM_ADMIN
  UPDATE [User] 
  SET role = 'SYSTEM_ADMIN' 
  WHERE role = 'SUPERUSER';

  -- Add check constraint to ensure only valid system roles (SYSTEM_ADMIN or USER)
  -- First, check if constraint exists and drop it if it does
  IF EXISTS (
    SELECT 1 
    FROM sys.check_constraints 
    WHERE name = 'CK_User_SystemRole' AND parent_object_id = OBJECT_ID('[User]')
  )
  BEGIN
    ALTER TABLE [User] DROP CONSTRAINT CK_User_SystemRole;
  END;

  -- Add the constraint
  ALTER TABLE [User]
  ADD CONSTRAINT CK_User_SystemRole 
  CHECK (role IN ('SYSTEM_ADMIN', 'USER'));

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;
  THROW;
END CATCH;









