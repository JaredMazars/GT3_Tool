-- Add Full-Text Search Index for Client table
-- Purpose: Optimize multi-field search queries across clientNameFull, clientCode, groupDesc, groupCode, industry, sector
-- Performance: Expected 10-50x improvement over LIKE with OR conditions

-- Step 1: Create full-text catalog if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'ClientSearchCatalog')
BEGIN
    CREATE FULLTEXT CATALOG ClientSearchCatalog AS DEFAULT;
END;

-- Step 2: Create full-text index on Client table
IF NOT EXISTS (
    SELECT * 
    FROM sys.fulltext_indexes 
    WHERE object_id = OBJECT_ID('[dbo].[Client]')
)
BEGIN
    -- Create full-text index on search fields
    -- Note: Requires a unique index (PK) to exist on the table
    CREATE FULLTEXT INDEX ON [dbo].[Client]
    (
        clientNameFull LANGUAGE 1033,
        clientCode LANGUAGE 1033,
        groupDesc LANGUAGE 1033,
        groupCode LANGUAGE 1033,
        industry LANGUAGE 1033,
        sector LANGUAGE 1033
    )
    KEY INDEX [Client_pkey]
    ON ClientSearchCatalog
    WITH CHANGE_TRACKING AUTO;
END;
