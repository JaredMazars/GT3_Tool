-- AlterTable: Add clientId column to BDOpportunity
ALTER TABLE [dbo].[BDOpportunity] ADD [clientId] INT NULL;

-- AlterTable: Make companyName nullable
ALTER TABLE [dbo].[BDOpportunity] ALTER COLUMN [companyName] NVARCHAR(1000) NULL;

-- CreateIndex: Add index for clientId
CREATE NONCLUSTERED INDEX [BDOpportunity_clientId_idx] ON [dbo].[BDOpportunity]([clientId]);

-- AddForeignKey: Link BDOpportunity to Client
ALTER TABLE [dbo].[BDOpportunity] ADD CONSTRAINT [BDOpportunity_clientId_fkey] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;







