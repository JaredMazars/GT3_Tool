-- Add performance indexes for filter queries

-- Client table: Composite indexes for common filter combinations
CREATE NONCLUSTERED INDEX [Client_active_groupCode_idx] ON [dbo].[Client]([active] ASC, [groupCode] ASC);

CREATE NONCLUSTERED INDEX [Client_active_industry_idx] ON [dbo].[Client]([active] ASC, [industry] ASC);

CREATE NONCLUSTERED INDEX [Client_industry_clientNameFull_idx] ON [dbo].[Client]([industry] ASC, [clientNameFull] ASC);

-- Employee table: Composite index for employee enrichment queries
CREATE NONCLUSTERED INDEX [Employee_EmpCode_Active_idx] ON [dbo].[Employee]([EmpCode] ASC, [Active] ASC);
