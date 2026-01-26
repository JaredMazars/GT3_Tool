-- Migration: Add Template Versioning System
-- Date: 2026-01-20
-- Description: Adds versioning support for templates with complete audit trail

BEGIN TRY
    BEGIN TRANSACTION;

    -- Add currentVersion field to Template table
    ALTER TABLE [Template]
    ADD [currentVersion] INT NOT NULL DEFAULT 1;

    -- Create TemplateVersion table
    CREATE TABLE [TemplateVersion] (
        [id] INT PRIMARY KEY IDENTITY(1,1),
        [templateId] INT NOT NULL,
        [version] INT NOT NULL,
        [name] NVARCHAR(200) NOT NULL,
        [description] NVARCHAR(MAX),
        [type] NVARCHAR(50) NOT NULL,
        [serviceLine] NVARCHAR(50),
        [content] NVARCHAR(MAX),
        [isActive] BIT NOT NULL DEFAULT 0,
        [createdBy] NVARCHAR(450) NOT NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [changeNotes] NVARCHAR(MAX),
        
        CONSTRAINT [FK_TemplateVersion_Template] FOREIGN KEY ([templateId]) 
            REFERENCES [Template]([id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_TemplateVersion_Number] UNIQUE ([templateId], [version])
    );

    -- Create TemplateSectionVersion table
    CREATE TABLE [TemplateSectionVersion] (
        [id] INT PRIMARY KEY IDENTITY(1,1),
        [templateVersionId] INT NOT NULL,
        [sectionKey] NVARCHAR(100) NOT NULL,
        [title] NVARCHAR(200) NOT NULL,
        [content] NVARCHAR(MAX) NOT NULL,
        [isRequired] BIT NOT NULL DEFAULT 1,
        [isAiAdaptable] BIT NOT NULL DEFAULT 0,
        [order] INT NOT NULL,
        [applicableServiceLines] NVARCHAR(MAX),
        [applicableProjectTypes] NVARCHAR(MAX),
        [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_TemplateSectionVersion_TemplateVersion] 
            FOREIGN KEY ([templateVersionId]) 
            REFERENCES [TemplateVersion]([id]) ON DELETE CASCADE
    );

    -- Add version tracking to TaskEngagementLetter
    ALTER TABLE [TaskEngagementLetter]
    ADD [templateVersionId] INT NULL;

    -- Add foreign key constraint for templateVersionId
    ALTER TABLE [TaskEngagementLetter]
    ADD CONSTRAINT [FK_TaskEngagementLetter_TemplateVersion] 
        FOREIGN KEY ([templateVersionId]) 
        REFERENCES [TemplateVersion]([id]) ON DELETE SET NULL;

    -- Create indexes for TemplateVersion
    CREATE INDEX [idx_templateversion_templateid] ON [TemplateVersion]([templateId]);
    CREATE INDEX [idx_templateversion_active] ON [TemplateVersion]([templateId], [isActive]);
    CREATE INDEX [idx_templateversion_createdat] ON [TemplateVersion]([createdAt]);

    -- Create indexes for TemplateSectionVersion
    CREATE INDEX [idx_templatesectionversion_versionid] ON [TemplateSectionVersion]([templateVersionId]);
    CREATE INDEX [idx_templatesectionversion_order] ON [TemplateSectionVersion]([templateVersionId], [order]);

    -- Create index for TaskEngagementLetter.templateVersionId
    CREATE INDEX [idx_taskengagementletter_templateversion] ON [TaskEngagementLetter]([templateVersionId]);

    COMMIT TRANSACTION;
    PRINT 'Template versioning migration completed successfully';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
