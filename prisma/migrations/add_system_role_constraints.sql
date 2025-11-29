-- Migration: Enforce strict system roles (SYSTEM_ADMIN, USER only)
-- This migration adds a check constraint to ensure only valid system roles are used

-- Add check constraint to User table
ALTER TABLE [User] ADD CONSTRAINT CHK_User_Role 
  CHECK (role IN ('SYSTEM_ADMIN', 'USER'));

-- Create index for faster role lookups
CREATE INDEX IDX_User_Role_Filtered ON [User](role) 
  WHERE role = 'SYSTEM_ADMIN';


