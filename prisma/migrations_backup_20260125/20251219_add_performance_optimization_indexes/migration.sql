-- Performance optimization indexes based on query analysis
-- These indexes improve performance for commonly executed queries identified during code review

-- Task table: Composite index for service line + active filtering
-- Used by: workspace-counts, task list queries, service line filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Task_ServLineCode_Active_idx' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [Task_ServLineCode_Active_idx] ON [dbo].[Task]([ServLineCode] ASC, [Active] ASC);
END;

-- ServiceLineExternal table: Composite index for SubServlineGroupCode + masterCode lookups
-- Used by: getServLineCodesBySubGroup, getSubServiceLineGroupsByMaster, service line mapping queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ServiceLineExternal_SubGroup_masterCode_idx' AND object_id = OBJECT_ID('[dbo].[ServiceLineExternal]'))
BEGIN
    CREATE NONCLUSTERED INDEX [ServiceLineExternal_SubGroup_masterCode_idx] ON [dbo].[ServiceLineExternal]([SubServlineGroupCode] ASC, [masterCode] ASC);
END;

-- ServiceLineExternal table: Index for masterCode lookups with SubServlineGroupCode
-- Used by: getExternalServiceLinesByMaster, admin service line mapping
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ServiceLineExternal_masterCode_SubGroup_idx' AND object_id = OBJECT_ID('[dbo].[ServiceLineExternal]'))
BEGIN
    CREATE NONCLUSTERED INDEX [ServiceLineExternal_masterCode_SubGroup_idx] ON [dbo].[ServiceLineExternal]([masterCode] ASC, [SubServlineGroupCode] ASC);
END;

-- Task table: Index for TaskCode prefix queries (used in duplicate checking)
-- Used by: check-duplicate endpoint
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Task_TaskCode_idx' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [Task_TaskCode_idx] ON [dbo].[Task]([TaskCode] ASC);
END;



















