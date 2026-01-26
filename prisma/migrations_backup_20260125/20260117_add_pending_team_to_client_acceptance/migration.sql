-- Add pending team fields to ClientAcceptance table
-- These fields store selected partner/manager/incharge that will be applied when acceptance is approved

BEGIN TRY
    BEGIN TRANSACTION;

    -- Add pending team assignment fields
    ALTER TABLE [dbo].[ClientAcceptance]
    ADD [pendingPartnerCode] NVARCHAR(10) NULL;

    ALTER TABLE [dbo].[ClientAcceptance]
    ADD [pendingManagerCode] NVARCHAR(10) NULL;

    ALTER TABLE [dbo].[ClientAcceptance]
    ADD [pendingInchargeCode] NVARCHAR(10) NULL;

    -- Add tracking fields for when changes are applied
    ALTER TABLE [dbo].[ClientAcceptance]
    ADD [teamChangesApplied] BIT NOT NULL CONSTRAINT [DF_ClientAcceptance_teamChangesApplied] DEFAULT 0;

    ALTER TABLE [dbo].[ClientAcceptance]
    ADD [teamChangesAppliedAt] DATETIME2 NULL;

    -- Create indexes for pending team fields for faster lookups
    CREATE NONCLUSTERED INDEX [IX_ClientAcceptance_pendingPartnerCode]
    ON [dbo].[ClientAcceptance]([pendingPartnerCode] ASC)
    WHERE [pendingPartnerCode] IS NOT NULL;

    CREATE NONCLUSTERED INDEX [IX_ClientAcceptance_teamChangesApplied]
    ON [dbo].[ClientAcceptance]([teamChangesApplied] ASC);

    COMMIT TRANSACTION;
    PRINT 'Successfully added pending team fields to ClientAcceptance table';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
