# Client Acceptance Workflow Migration

## Status: ✅ SUCCESSFULLY APPLIED

This migration adds support for the client acceptance and engagement letter workflow.

**Applied on:** November 22, 2025
**Existing projects migrated:** 5 client projects auto-approved

## Database Connection Issue

**The migration could not be automatically applied due to authentication failure:**

```
Error: P1000: Authentication failed against database server at `fm-sql-server.database.windows.net`, 
the provided database credentials for `sqladmin` are not valid.
```

## How to Apply This Migration

### Option 1: Fix Database Credentials and Use Prisma

1. **Update your `.env` file** with valid database credentials
2. **Ensure network access** (VPN connection if required)
3. **Run the migration:**
   ```bash
   npx prisma migrate deploy
   ```

### Option 2: Apply SQL Manually

If you have direct access to the SQL Server database, you can run the SQL script manually:

```sql
-- Run the contents of migration.sql in this directory
```

You can execute it using:
- SQL Server Management Studio (SSMS)
- Azure Data Studio
- Azure Portal Query Editor
- Command line: `sqlcmd`

### Option 3: Use Azure Portal

1. Navigate to your SQL Server database in Azure Portal
2. Go to "Query editor"
3. Authenticate
4. Copy and paste the contents of `migration.sql`
5. Execute

## After Migration Success

Once the migration is successfully applied, you need to:

1. **Update Prisma's migration history:**
   ```bash
   npx prisma migrate resolve --applied 20251122000000_add_client_acceptance_workflow
   ```

2. **Migrate existing projects** (optional but recommended):
   ```bash
   # Preview changes
   npx tsx scripts/approve-existing-projects.ts --dry-run
   
   # Apply to all existing client projects
   npx tsx scripts/approve-existing-projects.ts --auto-approve-all
   ```

## What This Migration Does

Adds the following columns to the `Project` table:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `acceptanceApproved` | BIT | No | 0 | Whether client acceptance is approved |
| `acceptanceApprovedBy` | NVARCHAR(1000) | Yes | NULL | User ID who approved |
| `acceptanceApprovedAt` | DATETIME2 | Yes | NULL | Timestamp of approval |
| `engagementLetterGenerated` | BIT | No | 0 | Whether letter was generated |
| `engagementLetterUploaded` | BIT | No | 0 | Whether signed letter was uploaded |
| `engagementLetterPath` | NVARCHAR(1000) | Yes | NULL | Path to uploaded letter |
| `engagementLetterUploadedBy` | NVARCHAR(1000) | Yes | NULL | User ID who uploaded |
| `engagementLetterUploadedAt` | DATETIME2 | Yes | NULL | Timestamp of upload |

## Rollback

If you need to rollback this migration:

```sql
BEGIN TRANSACTION;

ALTER TABLE [dbo].[Project] DROP CONSTRAINT [Project_acceptanceApproved_df];
ALTER TABLE [dbo].[Project] DROP COLUMN [acceptanceApproved];
ALTER TABLE [dbo].[Project] DROP COLUMN [acceptanceApprovedBy];
ALTER TABLE [dbo].[Project] DROP COLUMN [acceptanceApprovedAt];

ALTER TABLE [dbo].[Project] DROP CONSTRAINT [Project_engagementLetterGenerated_df];
ALTER TABLE [dbo].[Project] DROP CONSTRAINT [Project_engagementLetterUploaded_df];
ALTER TABLE [dbo].[Project] DROP COLUMN [engagementLetterGenerated];
ALTER TABLE [dbo].[Project] DROP COLUMN [engagementLetterUploaded];
ALTER TABLE [dbo].[Project] DROP COLUMN [engagementLetterPath];
ALTER TABLE [dbo].[Project] DROP COLUMN [engagementLetterUploadedBy];
ALTER TABLE [dbo].[Project] DROP COLUMN [engagementLetterUploadedAt];

COMMIT TRANSACTION;
```

