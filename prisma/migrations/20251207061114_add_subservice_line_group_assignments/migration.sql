-- Migration: Add Sub-Service Line Group Assignments
-- Transform ServiceLineUser from main service lines to sub-service line groups

BEGIN TRY
    BEGIN TRANSACTION;

    -- Step 1: Add new columns to ServiceLineUser
    ALTER TABLE [ServiceLineUser] ADD [subServiceLineGroup] NVARCHAR(1000);
    ALTER TABLE [ServiceLineUser] ADD [assignmentType] NVARCHAR(1000) NOT NULL CONSTRAINT [ServiceLineUser_assignmentType_df] DEFAULT 'SPECIFIC_SUBGROUP';
    ALTER TABLE [ServiceLineUser] ADD [parentAssignmentId] INT;

    -- Step 2: Create temporary table to track new records
    CREATE TABLE #ServiceLineUserTransform (
        oldId INT,
        userId NVARCHAR(1000),
        subServiceLineGroup NVARCHAR(1000),
        role NVARCHAR(1000),
        assignmentType NVARCHAR(1000),
        parentAssignmentId INT,
        createdAt DATETIME2,
        updatedAt DATETIME2
    );

    -- Step 3: For each existing ServiceLineUser, create records for all sub-groups
    -- This cursor will iterate through existing ServiceLineUser records
    DECLARE @userId NVARCHAR(1000);
    DECLARE @serviceLine NVARCHAR(1000);
    DECLARE @role NVARCHAR(1000);
    DECLARE @createdAt DATETIME2;
    DECLARE @updatedAt DATETIME2;
    DECLARE @oldId INT;
    DECLARE @newParentId INT;

    DECLARE service_line_cursor CURSOR FOR
        SELECT id, userId, serviceLine, role, createdAt, updatedAt
        FROM ServiceLineUser;

    OPEN service_line_cursor;
    FETCH NEXT FROM service_line_cursor INTO @oldId, @userId, @serviceLine, @role, @createdAt, @updatedAt;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Get a unique parent assignment ID for this main service line assignment
        SET @newParentId = @oldId;

        -- Insert records for each sub-service line group under this master code
        INSERT INTO #ServiceLineUserTransform (oldId, userId, subServiceLineGroup, role, assignmentType, parentAssignmentId, createdAt, updatedAt)
        SELECT 
            @oldId,
            @userId,
            COALESCE(sle.SubServlineGroupCode, @serviceLine), -- Use SubServlineGroupCode if available, fallback to serviceLine
            @role,
            'MAIN_SERVICE_LINE',
            @newParentId,
            @createdAt,
            @updatedAt
        FROM ServiceLineExternal sle
        WHERE sle.masterCode = @serviceLine
            AND sle.SubServlineGroupCode IS NOT NULL
        GROUP BY sle.SubServlineGroupCode;

        -- If no sub-groups found (unmapped or legacy), create one record with the master code
        IF NOT EXISTS (
            SELECT 1 FROM #ServiceLineUserTransform WHERE oldId = @oldId
        )
        BEGIN
            INSERT INTO #ServiceLineUserTransform (oldId, userId, subServiceLineGroup, role, assignmentType, parentAssignmentId, createdAt, updatedAt)
            VALUES (@oldId, @userId, @serviceLine, @role, 'MAIN_SERVICE_LINE', @newParentId, @createdAt, @updatedAt);
        END

        FETCH NEXT FROM service_line_cursor INTO @oldId, @userId, @serviceLine, @role, @createdAt, @updatedAt;
    END

    CLOSE service_line_cursor;
    DEALLOCATE service_line_cursor;

    -- Step 4: Update existing ServiceLineUser records with first sub-group from transform
    UPDATE slu
    SET 
        slu.subServiceLineGroup = t.subServiceLineGroup,
        slu.assignmentType = t.assignmentType,
        slu.parentAssignmentId = t.parentAssignmentId
    FROM ServiceLineUser slu
    INNER JOIN (
        SELECT oldId, userId, subServiceLineGroup, assignmentType, parentAssignmentId,
               ROW_NUMBER() OVER (PARTITION BY oldId ORDER BY subServiceLineGroup) as rn
        FROM #ServiceLineUserTransform
    ) t ON slu.id = t.oldId
    WHERE t.rn = 1;

    -- Step 5: Insert additional records for remaining sub-groups
    INSERT INTO ServiceLineUser (userId, subServiceLineGroup, role, assignmentType, parentAssignmentId, createdAt, updatedAt)
    SELECT 
        t.userId,
        t.subServiceLineGroup,
        t.role,
        t.assignmentType,
        t.parentAssignmentId,
        t.createdAt,
        t.updatedAt
    FROM (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY oldId ORDER BY subServiceLineGroup) as rn
        FROM #ServiceLineUserTransform
    ) t
    WHERE t.rn > 1; -- Skip first record as it was used in update

    -- Step 6: Drop temporary table
    DROP TABLE #ServiceLineUserTransform;

    -- Step 7: Drop old unique constraint on userId_serviceLine
    ALTER TABLE [ServiceLineUser] DROP CONSTRAINT [ServiceLineUser_userId_serviceLine_key];

    -- Step 8: Drop old index on serviceLine
    DROP INDEX [ServiceLineUser_serviceLine_idx] ON [ServiceLineUser];

    -- Step 9: Drop old serviceLine column
    ALTER TABLE [ServiceLineUser] DROP COLUMN [serviceLine];

    -- Step 10: Create new unique constraint on userId_subServiceLineGroup
    ALTER TABLE [ServiceLineUser] ADD CONSTRAINT [ServiceLineUser_userId_subServiceLineGroup_key] UNIQUE NONCLUSTERED ([userId], [subServiceLineGroup]);

    -- Step 11: Create new indexes
    CREATE INDEX [ServiceLineUser_subServiceLineGroup_idx] ON [ServiceLineUser]([subServiceLineGroup]);
    CREATE INDEX [ServiceLineUser_assignmentType_idx] ON [ServiceLineUser]([assignmentType]);
    CREATE INDEX [ServiceLineUser_parentAssignmentId_idx] ON [ServiceLineUser]([parentAssignmentId]);
    CREATE INDEX [ServiceLineUser_userId_assignmentType_idx] ON [ServiceLineUser]([userId], [assignmentType]);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

