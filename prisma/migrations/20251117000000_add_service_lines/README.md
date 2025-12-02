# Service Lines Migration

This migration adds multi-service line support to the application.

## What it does

1. **Adds `serviceLine` column to Project table**
   - Default value: 'TAX'
   - All existing projects will be set to TAX service line

2. **Creates `ServiceLineUser` table**
   - Manages user permissions per service line
   - Users can have different roles in different service lines

3. **Adds indexes for performance**
   - Project.serviceLine
   - ServiceLineUser lookups

4. **Migrates existing user permissions**
   - All existing users are granted TAX service line access
   - Their global role is copied to their TAX service line role

## Running the migration

### Using Prisma

```bash
# Generate Prisma client with new schema
npx prisma generate

# Apply the migration
npx prisma db push
```

### Manual SQL Execution

If you need to run the SQL manually:

```bash
# For SQL Server
sqlcmd -S <server> -d <database> -i migration.sql
```

## Post-Migration Verification

Run these queries to verify the migration:

```sql
-- Check all projects have a service line
SELECT COUNT(*) AS projects_with_service_line
FROM [dbo].[Project]
WHERE [serviceLine] IS NOT NULL;

-- Check all users have TAX access
SELECT COUNT(DISTINCT userId) AS users_with_tax_access
FROM [dbo].[ServiceLineUser]
WHERE [serviceLine] = 'TAX';

-- Compare user counts
SELECT 
  (SELECT COUNT(*) FROM [dbo].[User]) AS total_users,
  (SELECT COUNT(DISTINCT userId) FROM [dbo].[ServiceLineUser] WHERE [serviceLine] = 'TAX') AS users_with_tax_access;
```

## Granting Access to Other Service Lines

After migration, to grant users access to other service lines:

```sql
-- Grant a user access to Audit service line
INSERT INTO [dbo].[ServiceLineUser] ([userId], [serviceLine], [role], [updatedAt])
VALUES ('<user-id>', 'AUDIT', 'USER', CURRENT_TIMESTAMP);

-- Grant admin access to all service lines for a user
INSERT INTO [dbo].[ServiceLineUser] ([userId], [serviceLine], [role], [updatedAt])
SELECT '<user-id>', serviceLine, 'ADMIN', CURRENT_TIMESTAMP
FROM (VALUES ('TAX'), ('AUDIT'), ('ACCOUNTING'), ('ADVISORY')) AS ServiceLines(serviceLine)
WHERE NOT EXISTS (
  SELECT 1 FROM [dbo].[ServiceLineUser]
  WHERE userId = '<user-id>' AND serviceLine = ServiceLines.serviceLine
);
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop ServiceLineUser table
DROP TABLE [dbo].[ServiceLineUser];

-- Drop indexes
DROP INDEX [Project_serviceLine_idx] ON [dbo].[Project];
DROP INDEX [Project_serviceLine_status_archived_idx] ON [dbo].[Project];

-- Remove serviceLine column
ALTER TABLE [dbo].[Project] DROP CONSTRAINT [DF_Project_serviceLine];
ALTER TABLE [dbo].[Project] DROP COLUMN [serviceLine];
```

## Notes

- All existing Tax-specific features (AI Tax Report, Tax Adjustments, Trial Balance) remain linked to projects
- These features will only be visible for projects with `serviceLine = 'TAX'`
- Clients remain global across all service lines
- Users can be granted access to multiple service lines with different roles in each

