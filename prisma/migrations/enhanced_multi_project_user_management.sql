-- Enhanced Multi-Project User Management Migration
-- This migration adds Client model, project types, tax details, and updated roles

BEGIN TRANSACTION;

-- ============================================
-- 1. Create Client table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Client')
BEGIN
    CREATE TABLE [Client] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [name] NVARCHAR(200) NOT NULL,
        [registrationNumber] NVARCHAR(100),
        [taxNumber] NVARCHAR(100),
        [industry] NVARCHAR(100),
        [legalEntityType] NVARCHAR(100),
        [jurisdiction] NVARCHAR(100),
        [taxRegime] NVARCHAR(100),
        [financialYearEnd] NVARCHAR(10), -- Format: MM-DD
        [baseCurrency] NVARCHAR(10) DEFAULT 'ZAR',
        [primaryContact] NVARCHAR(200),
        [email] NVARCHAR(200),
        [phone] NVARCHAR(50),
        [address] NVARCHAR(MAX),
        [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX [Client_name_idx] ON [Client]([name]);
END;

-- ============================================
-- 2. Add new columns to Project table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Project') AND name = 'projectType')
BEGIN
    ALTER TABLE [Project] ADD [projectType] NVARCHAR(50) DEFAULT 'TAX_CALCULATION' NOT NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Project') AND name = 'taxYear')
BEGIN
    ALTER TABLE [Project] ADD [taxYear] INT NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Project') AND name = 'taxPeriodStart')
BEGIN
    ALTER TABLE [Project] ADD [taxPeriodStart] DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Project') AND name = 'taxPeriodEnd')
BEGIN
    ALTER TABLE [Project] ADD [taxPeriodEnd] DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Project') AND name = 'assessmentYear')
BEGIN
    ALTER TABLE [Project] ADD [assessmentYear] NVARCHAR(50) NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Project') AND name = 'submissionDeadline')
BEGIN
    ALTER TABLE [Project] ADD [submissionDeadline] DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Project') AND name = 'clientId')
BEGIN
    ALTER TABLE [Project] ADD [clientId] INT NULL;
END;

-- ============================================
-- 3. Add indexes for Project table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Project_clientId_idx')
BEGIN
    CREATE INDEX [Project_clientId_idx] ON [Project]([clientId]);
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Project_projectType_idx')
BEGIN
    CREATE INDEX [Project_projectType_idx] ON [Project]([projectType]);
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Project_taxYear_idx')
BEGIN
    CREATE INDEX [Project_taxYear_idx] ON [Project]([taxYear]);
END;

-- ============================================
-- 4. Add foreign key constraint for clientId
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'Project_clientId_fkey')
BEGIN
    ALTER TABLE [Project] 
    ADD CONSTRAINT [Project_clientId_fkey] 
    FOREIGN KEY ([clientId]) 
    REFERENCES [Client]([id]) 
    ON DELETE SET NULL;
END;

-- ============================================
-- 5. Update ProjectUser roles from OWNER to ADMIN
-- ============================================
UPDATE [ProjectUser]
SET [role] = 'ADMIN'
WHERE [role] = 'OWNER';

-- ============================================
-- 6. Set default tax year for existing projects
-- ============================================
UPDATE [Project]
SET [taxYear] = YEAR(GETDATE())
WHERE [taxYear] IS NULL;

-- ============================================
-- 7. Create a default "Unknown Client" for existing projects
-- ============================================
DECLARE @defaultClientId INT;

IF NOT EXISTS (SELECT * FROM [Client] WHERE [name] = 'Unknown Client')
BEGIN
    INSERT INTO [Client] ([name], [createdAt], [updatedAt])
    VALUES ('Unknown Client', GETDATE(), GETDATE());
    
    SET @defaultClientId = SCOPE_IDENTITY();
    
    -- Update existing projects to use the default client
    UPDATE [Project]
    SET [clientId] = @defaultClientId
    WHERE [clientId] IS NULL;
END;

COMMIT TRANSACTION;

PRINT 'Enhanced Multi-Project User Management migration completed successfully!';


