-- Add indexes for group analytics performance optimization
-- These indexes improve query performance when aggregating transaction data across all clients in a group

-- Fast group lookup with GSClientID for collecting all clients in a group
-- Supports: SELECT GSClientID FROM Client WHERE groupCode = ?
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_client_groupcode_gsclientid' AND object_id = OBJECT_ID('[dbo].[Client]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_client_groupcode_gsclientid] ON [dbo].[Client]([groupCode] ASC, [GSClientID] ASC);
END;

-- Covering index for active client filtering within groups
-- Supports: SELECT * FROM Client WHERE groupCode = ? AND active = 'Yes'
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_client_groupcode_active' AND object_id = OBJECT_ID('[dbo].[Client]'))
BEGIN
    CREATE NONCLUSTERED INDEX [idx_client_groupcode_active] ON [dbo].[Client]([groupCode] ASC, [active] ASC);
END;

