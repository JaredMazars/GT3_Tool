# Manual Migration Instructions

The Prisma migrate tool had issues with the computed column migration. Please run these SQL scripts manually against your database.

## Connection Details

Database: `gt3-sql-server.database.windows.net`
Database Name: `gt3-db`

## Step 1: Add Computed Columns (Run First)

```sql
-- Add TranYearMonth computed column to WIPTransactions
ALTER TABLE [dbo].[WIPTransactions]
ADD TranYearMonth AS DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) PERSISTED;

-- Add TranYearMonth computed column to DrsTransactions  
ALTER TABLE [dbo].[DrsTransactions]
ADD TranYearMonth AS DATEFROMPARTS(YEAR(TranDate), MONTH(TranDate), 1) PERSISTED;

-- Update statistics
UPDATE STATISTICS [dbo].[WIPTransactions] WITH FULLSCAN;
UPDATE STATISTICS [dbo].[DrsTransactions] WITH FULLSCAN;
```

## Step 2: Create Covering Indexes (Run After Step 1 Completes - Takes 5-10 minutes)

```sql
-- Index 1: Partner report queries
CREATE NONCLUSTERED INDEX [idx_wip_taskpartner_yearmonth_covering]
ON [dbo].[WIPTransactions]([TaskPartner] ASC, [TranYearMonth] ASC)
INCLUDE ([TType], [Amount], [Cost])
WHERE [TaskPartner] IS NOT NULL
WITH (ONLINE = ON, SORT_IN_TEMPDB = ON);

-- Index 2: Manager report queries
CREATE NONCLUSTERED INDEX [idx_wip_taskmanager_yearmonth_covering]
ON [dbo].[WIPTransactions]([TaskManager] ASC, [TranYearMonth] ASC)
INCLUDE ([TType], [Amount], [Cost])
WHERE [TaskManager] IS NOT NULL
WITH (ONLINE = ON, SORT_IN_TEMPDB = ON);

-- Index 3: Collections/Net Billings queries
CREATE NONCLUSTERED INDEX [idx_drs_biller_yearmonth_covering]
ON [dbo].[DrsTransactions]([Biller] ASC, [TranYearMonth] ASC)
INCLUDE ([Total], [EntryType])
WHERE [Biller] IS NOT NULL
WITH (ONLINE = ON, SORT_IN_TEMPDB = ON);

-- Update statistics
UPDATE STATISTICS [dbo].[WIPTransactions] WITH FULLSCAN;
UPDATE STATISTICS [dbo].[DrsTransactions] WITH FULLSCAN;
```

## Step 3: Mark Migrations as Applied

After running the SQL above, mark the migrations as applied in Prisma:

```bash
cd /Users/walter.blake/Documents/Development/mapper

# Mark first migration as applied
DATABASE_URL="sqlserver://gt3-sql-server.database.windows.net:1433;database=gt3-db;user=sqladmin;password={GT3!SecureP@ss2024#Dev};encrypt=true;trustServerCertificate=true;connectTimeout=30" npx prisma migrate resolve --applied 20260123_add_tranyearmonth_computed_columns

# Mark second migration as applied
DATABASE_URL="sqlserver://gt3-sql-server.database.windows.net:1433;database=gt3-db;user=sqladmin;password={GT3!SecureP@ss2024#Dev};encrypt=true;trustServerCertificate=true;connectTimeout=30" npx prisma migrate resolve --applied 20260123_add_yearmonth_covering_indexes
```

## How to Run the SQL

### Option 1: Azure Portal
1. Go to Azure Portal
2. Navigate to SQL Databases → gt3-db
3. Click "Query editor" in left menu
4. Login with sqladmin credentials
5. Copy/paste Step 1 SQL and run
6. Wait for completion
7. Copy/paste Step 2 SQL and run (takes 5-10 minutes)

### Option 2: SQL Server Management Studio (SSMS)
1. Connect to gt3-sql-server.database.windows.net
2. Select database gt3-db
3. Open new query window
4. Run Step 1 SQL
5. Run Step 2 SQL

### Option 3: Command Line (sqlcmd)
```bash
# Step 1
sqlcmd -S gt3-sql-server.database.windows.net -d gt3-db -U sqladmin -P '{GT3!SecureP@ss2024#Dev}' -Q "$(cat run_migration_1.sql)"

# Step 2
sqlcmd -S gt3-sql-server.database.windows.net -d gt3-db -U sqladmin -P '{GT3!SecureP@ss2024#Dev}' -Q "$(cat run_migration_2.sql)"
```

## Verification

After running the migrations, verify they worked:

```bash
cd /Users/walter.blake/Documents/Development/mapper
DATABASE_URL="sqlserver://gt3-sql-server.database.windows.net:1433;database=gt3-db;user=sqladmin;password={GT3!SecureP@ss2024#Dev};encrypt=true;trustServerCertificate=true;connectTimeout=30" npx prisma migrate status
```

Should show both migrations as applied with no pending migrations.

## Expected Results

After completing these steps:
- ✅ `TranYearMonth` column added to both tables
- ✅ 3 covering indexes created
- ✅ Query performance improved from 130s to <5s
- ✅ Application code can use new optimized queries
