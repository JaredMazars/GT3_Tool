-- DropForeignKey
ALTER TABLE [dbo].[AgedWip] DROP CONSTRAINT IF EXISTS [AgedWip_GSClientID_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[AgedWip] DROP CONSTRAINT IF EXISTS [AgedWip_GSTaskID_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Debtors] DROP CONSTRAINT IF EXISTS [Debtors_GSClientID_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Wip] DROP CONSTRAINT IF EXISTS [Wip_GSClientID_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Wip] DROP CONSTRAINT IF EXISTS [Wip_GSTaskID_fkey];

-- DropTable
DROP TABLE IF EXISTS [dbo].[AgedWip];

-- DropTable
DROP TABLE IF EXISTS [dbo].[Debtors];

-- DropTable
DROP TABLE IF EXISTS [dbo].[Wip];

























