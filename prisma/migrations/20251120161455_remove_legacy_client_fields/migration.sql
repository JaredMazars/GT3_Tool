-- Remove legacy fields from Client table

-- Drop columns that are no longer needed
ALTER TABLE [dbo].[Client] DROP COLUMN [registrationNumber];
ALTER TABLE [dbo].[Client] DROP COLUMN [taxNumber];
ALTER TABLE [dbo].[Client] DROP COLUMN [legalEntityType];
ALTER TABLE [dbo].[Client] DROP COLUMN [jurisdiction];
ALTER TABLE [dbo].[Client] DROP COLUMN [taxRegime];
ALTER TABLE [dbo].[Client] DROP COLUMN [financialYearEnd];
ALTER TABLE [dbo].[Client] DROP COLUMN [baseCurrency];
ALTER TABLE [dbo].[Client] DROP COLUMN [primaryContact];
ALTER TABLE [dbo].[Client] DROP COLUMN [email];
ALTER TABLE [dbo].[Client] DROP COLUMN [phone];
ALTER TABLE [dbo].[Client] DROP COLUMN [address];

