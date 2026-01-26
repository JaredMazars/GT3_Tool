-- Add allocation fields to TaskTeam table
ALTER TABLE [dbo].[TaskTeam] ADD 
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [allocatedHours] DECIMAL(10,2),
    [allocatedPercentage] INT,
    [actualHours] DECIMAL(10,2);

-- Add indexes for date-based queries
CREATE INDEX [TaskTeam_startDate_idx] ON [dbo].[TaskTeam]([startDate]);
CREATE INDEX [TaskTeam_endDate_idx] ON [dbo].[TaskTeam]([endDate]);
CREATE INDEX [TaskTeam_userId_startDate_endDate_idx] ON [dbo].[TaskTeam]([userId], [startDate], [endDate]);






















