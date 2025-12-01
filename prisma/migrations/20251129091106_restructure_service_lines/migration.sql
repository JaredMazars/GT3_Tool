-- Migration: Restructure Service Lines
-- Rename ServiceLine to ServiceLineExternal and create ServiceLineMaster

BEGIN TRY
    BEGIN TRANSACTION;

    -- Step 1: Rename ServiceLine table to ServiceLineExternal
    EXEC sp_rename 'ServiceLine', 'ServiceLineExternal';

    -- Step 2: Add masterCode column to ServiceLineExternal
    ALTER TABLE [ServiceLineExternal] ADD [masterCode] NVARCHAR(50);

    -- Step 3: Create index on masterCode
    CREATE INDEX [ServiceLineExternal_masterCode_idx] ON [ServiceLineExternal]([masterCode]);

    -- Step 4: Create ServiceLineMaster table
    CREATE TABLE [ServiceLineMaster] (
        [code] NVARCHAR(50) NOT NULL,
        [name] NVARCHAR(200) NOT NULL,
        [description] NVARCHAR(500),
        [active] BIT NOT NULL CONSTRAINT [ServiceLineMaster_active_df] DEFAULT 1,
        [sortOrder] INT NOT NULL CONSTRAINT [ServiceLineMaster_sortOrder_df] DEFAULT 0,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [ServiceLineMaster_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [ServiceLineMaster_pkey] PRIMARY KEY CLUSTERED ([code])
    );

    -- Step 5: Create indexes on ServiceLineMaster
    CREATE INDEX [ServiceLineMaster_active_idx] ON [ServiceLineMaster]([active]);
    CREATE INDEX [ServiceLineMaster_sortOrder_idx] ON [ServiceLineMaster]([sortOrder]);

    -- Step 6: Populate ServiceLineMaster with default service lines
    INSERT INTO [ServiceLineMaster] ([code], [name], [description], [active], [sortOrder], [createdAt], [updatedAt])
    VALUES
        ('TAX', 'Tax Services', 'Tax consulting, compliance, and advisory services', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('AUDIT', 'Audit & Assurance', 'Financial audit and assurance services', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('ACCOUNTING', 'Accounting', 'Accounting and bookkeeping services', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('ADVISORY', 'Advisory', 'Business advisory and consulting services', 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('QRM', 'Quality & Risk Management', 'Quality assurance and risk management', 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('BUSINESS_DEV', 'Business Development', 'Business development and client relations', 1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('IT', 'Information Technology', 'IT services and support', 1, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('FINANCE', 'Finance', 'Finance and financial management', 1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('HR', 'Human Resources', 'Human resources and people management', 1, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;









