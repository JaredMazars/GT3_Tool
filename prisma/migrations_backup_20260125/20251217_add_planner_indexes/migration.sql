-- CreateIndex
-- Employee planner: TaskTeam lookups by task with date range
CREATE NONCLUSTERED INDEX [TaskTeam_taskId_startDate_endDate_idx] 
  ON [dbo].[TaskTeam]([taskId] ASC, [startDate] ASC, [endDate] ASC);

-- CreateIndex
-- Employee planner: Filter by user with start date
CREATE NONCLUSTERED INDEX [TaskTeam_userId_startDate_idx] 
  ON [dbo].[TaskTeam]([userId] ASC, [startDate] ASC);
