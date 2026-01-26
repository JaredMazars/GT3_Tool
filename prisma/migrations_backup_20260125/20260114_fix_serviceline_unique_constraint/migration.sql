-- Migration to fix ServiceLineUser unique constraint
-- Problem: Current constraint prevents users from having multiple service lines that share the same sub-group
-- Solution: Remove the unique constraint and add a new one that includes a way to differentiate

-- Step 1: Drop the existing unique constraint if it exists
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ServiceLineUser_userId_subServiceLineGroup_key' AND object_id = OBJECT_ID('dbo.ServiceLineUser'))
BEGIN
    DROP INDEX [ServiceLineUser_userId_subServiceLineGroup_key] ON [dbo].[ServiceLineUser];
END

-- Step 2: Add masterCode column if it doesn't exist
IF COL_LENGTH('dbo.ServiceLineUser', 'masterCode') IS NULL
BEGIN
    ALTER TABLE [dbo].[ServiceLineUser]
    ADD masterCode NVARCHAR(50) NULL;
END

-- Step 3: Create new unique constraint on userId + subServiceLineGroup + masterCode
-- This allows the same sub-group to be assigned multiple times if it belongs to different master codes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ServiceLineUser_userId_subServiceLineGroup_masterCode_key' AND object_id = OBJECT_ID('dbo.ServiceLineUser'))
BEGIN
    CREATE UNIQUE INDEX [ServiceLineUser_userId_subServiceLineGroup_masterCode_key]
    ON [dbo].[ServiceLineUser]([userId], [subServiceLineGroup], [masterCode])
    WHERE [masterCode] IS NOT NULL;
END

-- Step 4: Add index for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ServiceLineUser_masterCode' AND object_id = OBJECT_ID('dbo.ServiceLineUser'))
BEGIN
    CREATE INDEX [idx_ServiceLineUser_masterCode]
    ON [dbo].[ServiceLineUser]([masterCode]);
END
