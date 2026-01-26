# Baseline Migration

**Date:** 2026-01-25  
**Type:** Baseline Reset

## Overview

This baseline migration represents the complete database schema as of January 25, 2026, including all optimizations applied during development.

## What's Included

### Tables

All application tables including:
- Client, Task, Group management tables
- WIPTransactions, DrsTransactions (transaction data)
- Wip, Debtors, WIPAging (aggregated data)
- Employee, User, Account management
- Approval, ReviewNote workflow tables
- ServiceLineMaster, ServiceLineExternal, ServiceLineUser
- Tool, TaskTool, ServiceLineTool management
- Notification, EmailLog communication tables
- BDOpportunity, BDActivity, BDContact business development
- VaultDocument, WorkspaceFile document management
- And all other application tables

### Super Covering Indexes

High-performance indexes created for query optimization:

**WIPTransactions:**
- `idx_wip_gsclientid_super_covering` (GSClientID + 9 INCLUDE columns)
- `idx_wip_gstaskid_super_covering` (GSTaskID + 9 INCLUDE columns)

**DrsTransactions:**
- `idx_drs_gsclientid_super_covering` (GSClientID, TranDate + 7 INCLUDE columns)
- `idx_drs_biller_super_covering` (Biller, TranDate + 5 INCLUDE columns)

### Computed Columns

- `TranYearMonth` on WIPTransactions (PERSISTED)
- `TranYearMonth` on DrsTransactions (PERSISTED)

## Previous Migration History

Previous migration history (87 migrations) was backed up to:
- `prisma/migrations_backup_20260125/`

This backup can be restored if needed for reference or rollback purposes.

## Why Baseline?

The migration history was reset to resolve:
- Local/remote migration drift
- Complex history (87+ migrations)
- Simplify future migration management
- Provide clean starting point

## For New Team Members

When setting up a new development environment:

```bash
# Pull the latest code
git pull origin main

# Run migrations (will apply baseline)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## For Existing Team Members

If you have existing migrations locally:

```bash
# Delete your local migrations folder
rm -rf prisma/migrations

# Pull the latest (includes baseline)
git pull origin main

# Run migrations
npx prisma migrate deploy
```

## Schema Changes After Baseline

All future migrations should be created using:

```bash
npx prisma migrate dev --name your_migration_name
```

This will create incremental migrations from this baseline.
