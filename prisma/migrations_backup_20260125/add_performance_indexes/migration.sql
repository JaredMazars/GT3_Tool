-- Performance Optimization Indexes
-- Phase 1: Critical indexes for task queries and WIP calculations
-- SQL Server compatible syntax

-- Task queries optimization
-- Covers common query patterns: filtering by service line and active status
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_task_servlinecode_active' AND object_id = OBJECT_ID('Task'))
BEGIN
    CREATE INDEX idx_task_servlinecode_active 
    ON Task(ServLineCode, Active) 
    INCLUDE (TaskPartner, TaskManager);
END;

-- Client task lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_task_gsclientid' AND object_id = OBJECT_ID('Task'))
BEGIN
    CREATE INDEX idx_task_gsclientid 
    ON Task(GSClientID);
END;

-- Task team member lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_taskteam_userid_taskid' AND object_id = OBJECT_ID('TaskTeam'))
BEGIN
    CREATE INDEX idx_taskteam_userid_taskid 
    ON TaskTeam(userId, taskId);
END;

-- WIP transactions - CRITICAL for SQL-based WIP aggregation
-- Primary lookup index
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wiptransactions_gstaskid' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    CREATE INDEX idx_wiptransactions_gstaskid 
    ON WIPTransactions(GSTaskID);
END;

-- Composite index for WIP aggregation with TType filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wiptransactions_gstaskid_ttype' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    CREATE INDEX idx_wiptransactions_gstaskid_ttype 
    ON WIPTransactions(GSTaskID, TType) 
    INCLUDE (Amount);
END;

-- Client-level WIP aggregation
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wiptransactions_gsclientid' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    CREATE INDEX idx_wiptransactions_gsclientid 
    ON WIPTransactions(GSClientID);
END;

-- Employee lookups for partner/manager name resolution
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_employee_empcode_active' AND object_id = OBJECT_ID('Employee'))
BEGIN
    CREATE INDEX idx_employee_empcode_active 
    ON Employee(EmpCode, Active) 
    INCLUDE (EmpName);
END;

-- TaskStage optimization for latest stage detection
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_taskstage_taskid_created' AND object_id = OBJECT_ID('TaskStage'))
BEGIN
    CREATE INDEX idx_taskstage_taskid_created 
    ON TaskStage(taskId, createdAt DESC);
END;

-- Employee WinLogon lookup for user matching (with filtered index)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_employee_winlogon' AND object_id = OBJECT_ID('Employee'))
BEGIN
    CREATE INDEX idx_employee_winlogon 
    ON Employee(WinLogon) 
    WHERE WinLogon IS NOT NULL;
END;

