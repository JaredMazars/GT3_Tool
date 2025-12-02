-- AlterTable: Update Client table structure to align with external database

-- Step 1: Add new columns with nullable constraints first
ALTER TABLE [dbo].[Client] ADD 
    [clientNameFull] NVARCHAR(255) NULL,
    [groupCode] NVARCHAR(10) NULL,
    [groupDesc] NVARCHAR(150) NULL,
    [clientPartner] NVARCHAR(10) NULL,
    [clientManager] NVARCHAR(10) NULL,
    [clientIncharge] NVARCHAR(10) NULL,
    [active] VARCHAR(3) NULL,
    [clientDateOpen] DATETIME2 NULL,
    [clientDateTerminate] DATETIME2 NULL,
    [sector] NVARCHAR(255) NULL,
    [forvisMazarsIndustry] NVARCHAR(255) NULL,
    [forvisMazarsSector] NVARCHAR(255) NULL,
    [forvisMazarsSubsector] NVARCHAR(255) NULL,
    [clientOCFlag] BIT NULL,
    [clientTaxFlag] BIT NULL,
    [clientSecFlag] BIT NULL,
    [creditor] BIT NULL,
    [rolePlayer] BIT NULL,
    [typeCode] NVARCHAR(10) NULL,
    [typeDesc] NVARCHAR(50) NULL;

-- Step 2: Migrate existing data from 'name' to 'clientNameFull'
UPDATE [dbo].[Client] 
SET [clientNameFull] = [name];

-- Step 3: Set default values for required fields
UPDATE [dbo].[Client] 
SET 
    [groupCode] = 'DEFAULT',
    [groupDesc] = 'Default Group',
    [clientPartner] = 'TBD',
    [clientManager] = 'TBD',
    [clientIncharge] = 'TBD',
    [active] = 'YES',
    [clientOCFlag] = 0,
    [rolePlayer] = 0,
    [typeCode] = 'DEFAULT',
    [typeDesc] = 'Default Type'
WHERE 
    [groupCode] IS NULL OR
    [groupDesc] IS NULL OR
    [clientPartner] IS NULL OR
    [clientManager] IS NULL OR
    [clientIncharge] IS NULL OR
    [active] IS NULL OR
    [clientOCFlag] IS NULL OR
    [rolePlayer] IS NULL OR
    [typeCode] IS NULL OR
    [typeDesc] IS NULL;

-- Step 4: Alter clientCode to be NOT NULL and enforce unique constraint
UPDATE [dbo].[Client] 
SET [clientCode] = 'CL' + CAST([id] AS NVARCHAR(10))
WHERE [clientCode] IS NULL;

-- Step 5: Modify columns to match new structure constraints
ALTER TABLE [dbo].[Client] ALTER COLUMN [clientCode] NVARCHAR(10) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [groupCode] NVARCHAR(10) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [groupDesc] NVARCHAR(150) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [clientPartner] NVARCHAR(10) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [clientManager] NVARCHAR(10) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [clientIncharge] NVARCHAR(10) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [active] VARCHAR(3) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [clientOCFlag] BIT NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [rolePlayer] BIT NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [typeCode] NVARCHAR(10) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [typeDesc] NVARCHAR(50) NOT NULL;
ALTER TABLE [dbo].[Client] ALTER COLUMN [industry] NVARCHAR(255) NULL;

-- Step 6: Drop the old 'name' column (keeping it as legacy - comment out if you want to remove)
-- Note: Keeping the 'name' column for backward compatibility is NOT recommended
-- Once all data is migrated and application is updated, you can drop it
-- ALTER TABLE [dbo].[Client] DROP COLUMN [name];

-- Step 7: Create indexes for new columns
CREATE INDEX [Client_clientNameFull_idx] ON [dbo].[Client]([clientNameFull]);
CREATE INDEX [Client_groupCode_idx] ON [dbo].[Client]([groupCode]);
CREATE INDEX [Client_active_idx] ON [dbo].[Client]([active]);
CREATE INDEX [Client_clientTaxFlag_idx] ON [dbo].[Client]([clientTaxFlag]);

-- Step 8: Drop old index on 'name' column if it exists
IF EXISTS (SELECT * FROM sys.indexes WHERE name='Client_name_idx' AND object_id = OBJECT_ID('dbo.Client'))
BEGIN
    DROP INDEX [Client_name_idx] ON [dbo].[Client];
END;






