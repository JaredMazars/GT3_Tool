-- Remove elementType column and restore original schema

-- Drop the index on elementType if it exists
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PagePermission_elementType_active_idx' AND object_id = OBJECT_ID('PagePermission'))
BEGIN
    DROP INDEX [PagePermission_elementType_active_idx] ON [PagePermission];
END

-- Drop the unique constraint that includes elementType
IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PagePermission_elementType_pathname_role_key')
BEGIN
    ALTER TABLE [PagePermission] DROP CONSTRAINT [PagePermission_elementType_pathname_role_key];
END

-- Recreate the original unique constraint (pathname, role only)
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PagePermission_pathname_role_key')
BEGIN
    ALTER TABLE [PagePermission] ADD CONSTRAINT [PagePermission_pathname_role_key] UNIQUE ([pathname], [role]);
END

-- Drop elementType column (SQL Server will automatically drop the default constraint)
IF EXISTS (SELECT * FROM sys.columns WHERE name = 'elementType' AND object_id = OBJECT_ID('PagePermission'))
BEGIN
    -- First drop the default constraint
    DECLARE @ConstraintName nvarchar(200)
    SELECT @ConstraintName = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE c.object_id = OBJECT_ID('PagePermission') AND c.name = 'elementType'
    
    IF @ConstraintName IS NOT NULL
        EXEC('ALTER TABLE [PagePermission] DROP CONSTRAINT [' + @ConstraintName + ']')
    
    -- Now drop the column
    ALTER TABLE [PagePermission] DROP COLUMN [elementType];
END
