-- Drop existing unique constraint to allow multiple allocations per user per task
-- This enables users to have multiple non-overlapping allocation periods on the same task
-- Overlap validation is handled at the application layer

ALTER TABLE [dbo].[TaskTeam] DROP CONSTRAINT [TaskTeam_taskId_userId_key];

-- Note: Existing indexes remain intact for query performance
-- See prisma/schema.prisma for full index definitions














