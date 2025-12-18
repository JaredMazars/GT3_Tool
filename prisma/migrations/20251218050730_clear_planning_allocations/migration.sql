-- Clear planning allocation tables for ServiceLineRole migration
-- This preserves all core data (Clients, Tasks, Employees, Users, etc.)
-- and removes only planning assignments and non-client allocations

-- Delete all task team assignments
DELETE FROM [dbo].[TaskTeam];

-- Delete all non-client allocations  
DELETE FROM [dbo].[NonClientAllocation];
