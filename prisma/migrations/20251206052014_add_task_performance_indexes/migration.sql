-- Add composite indexes for Task table to improve query performance
CREATE INDEX [Task_ServLineCode_Active_idx] ON [dbo].[Task]([ServLineCode], [Active]);
CREATE INDEX [Task_updatedAt_idx] ON [dbo].[Task]([updatedAt] DESC);

-- Add composite index for TaskTeam table to improve team membership lookups
CREATE INDEX [TaskTeam_userId_taskId_idx] ON [dbo].[TaskTeam]([userId], [taskId]);


