-- Add SUPERUSER system role
-- This migration updates existing ADMIN users in the User table to SUPERUSER role
-- SUPERUSER: System-wide access to all features and service lines
-- USER: Regular user, requires service line access

BEGIN TRY

BEGIN TRANSACTION;

-- Update existing ADMIN users to SUPERUSER (system administrators)
-- This preserves the intent of system-level administrative access
UPDATE [dbo].[User]
SET [role] = 'SUPERUSER'
WHERE [role] = 'ADMIN';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH

