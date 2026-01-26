-- Add indexes for Client Planner performance optimization
-- These indexes speed up filtering by client name, code, group, and partner

-- Index for clientNameFull searches (case-insensitive)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_client_name_full' AND object_id = OBJECT_ID('Client'))
CREATE INDEX idx_client_name_full ON Client(clientNameFull);

-- Index for clientCode searches (case-insensitive)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_client_code' AND object_id = OBJECT_ID('Client'))
CREATE INDEX idx_client_code ON Client(clientCode);

-- Index for groupDesc filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_client_group_desc' AND object_id = OBJECT_ID('Client'))
CREATE INDEX idx_client_group_desc ON Client(groupDesc);

-- Index for clientPartner filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_client_partner' AND object_id = OBJECT_ID('Client'))
CREATE INDEX idx_client_partner ON Client(clientPartner);

-- Composite index for Task queries by service line and client
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_task_servline_client' AND object_id = OBJECT_ID('Task'))
CREATE INDEX idx_task_servline_client ON Task(ServLineCode, GSClientID);

-- Index for TaskTeam queries by task and date range (for allocation filtering)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_taskteam_task_dates' AND object_id = OBJECT_ID('TaskTeam'))
CREATE INDEX idx_taskteam_task_dates ON TaskTeam(taskId, startDate, endDate) WHERE startDate IS NOT NULL AND endDate IS NOT NULL;










