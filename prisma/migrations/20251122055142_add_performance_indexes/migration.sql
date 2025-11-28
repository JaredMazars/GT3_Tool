-- Add performance indexes for optimized queries

-- Client table indexes for sorting and filtering
CREATE NONCLUSTERED INDEX [Client_groupDesc_idx] ON [dbo].[Client]([groupDesc]);
CREATE NONCLUSTERED INDEX [Client_updatedAt_idx] ON [dbo].[Client]([updatedAt] DESC);

-- Project table indexes for sorting and filtering
CREATE NONCLUSTERED INDEX [Project_updatedAt_idx] ON [dbo].[Project]([updatedAt] DESC);
CREATE NONCLUSTERED INDEX [Project_serviceLine_updatedAt_idx] ON [dbo].[Project]([serviceLine], [updatedAt] DESC);
CREATE NONCLUSTERED INDEX [Project_clientId_updatedAt_idx] ON [dbo].[Project]([clientId], [updatedAt] DESC);
















