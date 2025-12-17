-- Add performance indexes for query optimization

-- Employee table: Index on EmpCatCode
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Employee_EmpCatCode_idx' AND object_id = OBJECT_ID('[dbo].[Employee]'))
BEGIN
    CREATE NONCLUSTERED INDEX [Employee_EmpCatCode_idx] ON [dbo].[Employee]([EmpCatCode] ASC);
END;

-- Task table: Composite indexes for filter queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Task_ServLineCode_SLGroup_idx' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [Task_ServLineCode_SLGroup_idx] ON [dbo].[Task]([ServLineCode] ASC, [SLGroup] ASC);
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Task_TaskPartner_Active_idx' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [Task_TaskPartner_Active_idx] ON [dbo].[Task]([TaskPartner] ASC, [Active] ASC);
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Task_TaskManager_Active_idx' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [Task_TaskManager_Active_idx] ON [dbo].[Task]([TaskManager] ASC, [Active] ASC);
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Task_GSClientID_Active_updatedAt_idx' AND object_id = OBJECT_ID('[dbo].[Task]'))
BEGIN
    CREATE NONCLUSTERED INDEX [Task_GSClientID_Active_updatedAt_idx] ON [dbo].[Task]([GSClientID] ASC, [Active] ASC, [updatedAt] DESC);
END;

-- TaskTeam table: Composite indexes for date range queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'TaskTeam_taskId_startDate_endDate_idx' AND object_id = OBJECT_ID('[dbo].[TaskTeam]'))
BEGIN
    CREATE NONCLUSTERED INDEX [TaskTeam_taskId_startDate_endDate_idx] ON [dbo].[TaskTeam]([taskId] ASC, [startDate] ASC, [endDate] ASC);
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'TaskTeam_userId_startDate_idx' AND object_id = OBJECT_ID('[dbo].[TaskTeam]'))
BEGIN
    CREATE NONCLUSTERED INDEX [TaskTeam_userId_startDate_idx] ON [dbo].[TaskTeam]([userId] ASC, [startDate] ASC);
END;
