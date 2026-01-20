-- Migration: Remove Legacy Template Fields
-- Date: 2026-01-20
-- Description: Remove unused content and projectType fields from Template and TemplateVersion

BEGIN TRY
    BEGIN TRANSACTION;

    -- Remove projectType index from Template if it exists
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'Template_projectType_idx' AND object_id = OBJECT_ID('Template'))
        DROP INDEX [Template_projectType_idx] ON [Template];

    -- Remove projectType column from Template
    IF EXISTS (SELECT * FROM sys.columns WHERE name = 'projectType' AND object_id = OBJECT_ID('Template'))
        ALTER TABLE [Template] DROP COLUMN [projectType];

    -- Remove content column from Template
    IF EXISTS (SELECT * FROM sys.columns WHERE name = 'content' AND object_id = OBJECT_ID('Template'))
        ALTER TABLE [Template] DROP COLUMN [content];

    -- Remove content column from TemplateVersion
    IF EXISTS (SELECT * FROM sys.columns WHERE name = 'content' AND object_id = OBJECT_ID('TemplateVersion'))
        ALTER TABLE [TemplateVersion] DROP COLUMN [content];

    COMMIT TRANSACTION;
    PRINT 'Successfully removed legacy template fields';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
