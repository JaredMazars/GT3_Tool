-- Update ServiceLineTool to use SubServiceLineGroup instead of serviceLineCode

-- Drop existing constraints and indexes
ALTER TABLE [dbo].[ServiceLineTool] DROP CONSTRAINT [ServiceLineTool_serviceLineCode_toolId_key];
DROP INDEX IF EXISTS [ServiceLineTool_serviceLineCode_idx] ON [dbo].[ServiceLineTool];

-- Rename column
EXEC sp_rename 'dbo.ServiceLineTool.serviceLineCode', 'subServiceLineGroup', 'COLUMN';

-- Recreate unique constraint and indexes with new column name
ALTER TABLE [dbo].[ServiceLineTool] ADD CONSTRAINT [ServiceLineTool_subServiceLineGroup_toolId_key] UNIQUE NONCLUSTERED ([subServiceLineGroup] ASC, [toolId] ASC);
CREATE NONCLUSTERED INDEX [ServiceLineTool_subServiceLineGroup_idx] ON [dbo].[ServiceLineTool]([subServiceLineGroup] ASC);








