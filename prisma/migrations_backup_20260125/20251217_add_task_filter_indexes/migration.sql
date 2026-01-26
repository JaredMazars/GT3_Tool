-- Add composite indexes for improved filter performance

-- Index for sub-service line group filtering (ServLineCode + SLGroup)
CREATE NONCLUSTERED INDEX [Task_ServLineCode_SLGroup_idx] ON [dbo].[Task]([ServLineCode], [SLGroup]);

-- Index for partner filtering with active status
CREATE NONCLUSTERED INDEX [Task_TaskPartner_Active_idx] ON [dbo].[Task]([TaskPartner], [Active]);

-- Index for manager filtering with active status
CREATE NONCLUSTERED INDEX [Task_TaskManager_Active_idx] ON [dbo].[Task]([TaskManager], [Active]);

-- Index for client task queries with sort (GSClientID + Active + updatedAt)
CREATE NONCLUSTERED INDEX [Task_GSClientID_Active_updatedAt_idx] ON [dbo].[Task]([GSClientID], [Active], [updatedAt] DESC);
























