-- AddForeignKey: ReviewNote currentOwner and lastRespondedBy to User
-- Purpose: Add foreign key constraints for currentOwner and lastRespondedBy fields to enable user data queries
-- These constraints ensure referential integrity and allow Prisma to load user relations
--
-- Note: Changes column types from NVARCHAR(450) to NVARCHAR(1000) to match User.id

BEGIN TRY

BEGIN TRAN;

-- Step 1: Drop existing index on currentOwner to allow column modification
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_currentOwner_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_currentOwner_idx] ON [dbo].[ReviewNote];
END;

-- Step 2: Alter column types to NVARCHAR(1000) to match User.id
ALTER TABLE [dbo].[ReviewNote] ALTER COLUMN [currentOwner] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[ReviewNote] ALTER COLUMN [lastRespondedBy] NVARCHAR(1000) NULL;

-- Step 3: Recreate index on currentOwner
CREATE NONCLUSTERED INDEX [ReviewNote_currentOwner_idx] ON [dbo].[ReviewNote]([currentOwner] ASC);

-- Step 4: Add foreign key constraints
-- Add foreign key constraint for currentOwner field
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_currentOwner_fkey] 
FOREIGN KEY ([currentOwner]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Add foreign key constraint for lastRespondedBy field  
ALTER TABLE [dbo].[ReviewNote] ADD CONSTRAINT [ReviewNote_lastRespondedBy_fkey] 
FOREIGN KEY ([lastRespondedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
