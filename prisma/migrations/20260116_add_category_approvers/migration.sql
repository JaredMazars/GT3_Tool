-- CreateTable: CategoryApprover
-- Purpose: Links document vault categories to approving users with sequential ordering
-- This enables category-based approval workflows where documents must be approved by assigned users

BEGIN TRY
    BEGIN TRANSACTION;

    -- Create CategoryApprover table
    CREATE TABLE [dbo].[CategoryApprover] (
        [id] INT NOT NULL IDENTITY(1,1),
        [categoryId] INT NOT NULL,
        [userId] NVARCHAR(450) NOT NULL,
        [stepOrder] INT NOT NULL CONSTRAINT [DF__CategoryA__stepO__01] DEFAULT 1,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF__CategoryA__creat__02] DEFAULT CURRENT_TIMESTAMP,
        [createdBy] NVARCHAR(450) NOT NULL,
        
        CONSTRAINT [PK_CategoryApprover] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_CategoryApprover_CategoryId_UserId] UNIQUE ([categoryId], [userId])
    );

    -- Add foreign key constraints
    ALTER TABLE [dbo].[CategoryApprover] 
    ADD CONSTRAINT [FK_CategoryApprover_Category] 
    FOREIGN KEY ([categoryId]) 
    REFERENCES [dbo].[VaultDocumentCategory]([id]) 
    ON DELETE CASCADE;

    ALTER TABLE [dbo].[CategoryApprover] 
    ADD CONSTRAINT [FK_CategoryApprover_User] 
    FOREIGN KEY ([userId]) 
    REFERENCES [dbo].[User]([id]) 
    ON DELETE CASCADE;

    ALTER TABLE [dbo].[CategoryApprover] 
    ADD CONSTRAINT [FK_CategoryApprover_CreatedBy] 
    FOREIGN KEY ([createdBy]) 
    REFERENCES [dbo].[User]([id]);

    -- Create indexes for performance
    CREATE NONCLUSTERED INDEX [IX_CategoryApprover_CategoryId] 
    ON [dbo].[CategoryApprover]([categoryId] ASC);

    CREATE NONCLUSTERED INDEX [IX_CategoryApprover_UserId] 
    ON [dbo].[CategoryApprover]([userId] ASC);

    CREATE NONCLUSTERED INDEX [IX_CategoryApprover_CategoryId_StepOrder] 
    ON [dbo].[CategoryApprover]([categoryId] ASC, [stepOrder] ASC);

    COMMIT TRANSACTION;
    PRINT 'CategoryApprover table created successfully';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
