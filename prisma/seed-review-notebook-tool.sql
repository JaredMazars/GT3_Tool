-- Seed Review Notebook Tool
-- Inserts the Review Notebook tool into the Tool table

-- Check if tool already exists
IF NOT EXISTS (SELECT 1 FROM [dbo].[Tool] WHERE [code] = 'review-notebook')
BEGIN
    -- Insert the Review Notebook tool
    INSERT INTO [dbo].[Tool] (
        [name],
        [code],
        [description],
        [icon],
        [componentPath],
        [active],
        [sortOrder],
        [createdAt],
        [updatedAt]
    )
    VALUES (
        'Review Notebook',
        'review-notebook',
        'Track and manage review notes on files and resources with full workflow, assignments, comments, and reporting',
        'ClipboardCheck',
        '/tools/ReviewNotebookTool',
        1,
        100,
        GETDATE(),
        GETDATE()
    );

    PRINT 'Review Notebook tool created successfully';
END
ELSE
BEGIN
    PRINT 'Review Notebook tool already exists';
END

-- Optional: Associate tool with all service lines (make it available everywhere)
-- Get the tool ID
DECLARE @toolId INT;
SELECT @toolId = id FROM [dbo].[Tool] WHERE [code] = 'review-notebook';

-- Add associations for all sub-service line groups
-- Note: You may want to customize this based on your specific service line structure
IF @toolId IS NOT NULL
BEGIN
    -- Get all unique sub-service line groups from ServiceLineExternal
    DECLARE @subServiceLineGroup NVARCHAR(50);
    
    DECLARE subgroup_cursor CURSOR FOR
    SELECT DISTINCT SubServlineGroupCode
    FROM [dbo].[ServiceLineExternal]
    WHERE SubServlineGroupCode IS NOT NULL;

    OPEN subgroup_cursor;
    FETCH NEXT FROM subgroup_cursor INTO @subServiceLineGroup;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Check if association already exists
        IF NOT EXISTS (
            SELECT 1 
            FROM [dbo].[ServiceLineTool] 
            WHERE [subServiceLineGroup] = @subServiceLineGroup 
            AND [toolId] = @toolId
        )
        BEGIN
            INSERT INTO [dbo].[ServiceLineTool] (
                [subServiceLineGroup],
                [toolId],
                [active],
                [createdAt],
                [updatedAt]
            )
            VALUES (
                @subServiceLineGroup,
                @toolId,
                1,
                GETDATE(),
                GETDATE()
            );
        END;

        FETCH NEXT FROM subgroup_cursor INTO @subServiceLineGroup;
    END;

    CLOSE subgroup_cursor;
    DEALLOCATE subgroup_cursor;

    PRINT 'Service line associations created';
END;

PRINT 'Review Notebook tool setup complete';

