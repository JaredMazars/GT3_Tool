# Index Cleanup and WIPTransactions Super Covering Indexes

**Date:** 2026-01-25  
**Type:** Performance Optimization

## Overview

This migration performs two operations:
1. Removes 6 redundant/duplicate indexes across DrsTransactions and Task tables
2. Creates 2 super covering indexes on WIPTransactions for query optimization

## Part 1: Indexes Removed

### DrsTransactions (4 indexes)

| Index Dropped | Reason | Superseded By |
|---------------|--------|---------------|
| `idx_drs_biller_trandate` | Same key columns as super covering | `idx_drs_biller_super_covering` |
| `idx_drs_gsclientid_trandate_entrytype` | Covered by super covering index | `idx_drs_gsclientid_super_covering` |
| `idx_drs_servlinecode` | Duplicate of Prisma-managed index | `DrsTransactions_ServLineCode_idx` |
| `idx_drs_trandate` | Duplicate of Prisma-managed index | `DrsTransactions_TranDate_idx` |

### Task (2 indexes)

| Index Dropped | Reason | Superseded By |
|---------------|--------|---------------|
| `idx_task_gsclientid` | Duplicate of Prisma-managed index | `Task_GSClientID_idx` |
| `idx_task_servlinecode_active` | Duplicate of Prisma-managed index | `Task_ServLineCode_Active_idx` |

## Part 2: Indexes Created

### WIPTransactions Super Covering Indexes

**idx_wip_gsclientid_super_covering**
- Key: `(GSClientID, TranDate)`
- Include: `TType, TTypeDesc, Fees, Disbs, ServLineCode, TaskPartner, TaskManager, updatedAt`
- Filter: `WHERE GSClientID IS NOT NULL`
- Covers: Client details page, client WIP summary, balance calculations

**idx_wip_gstaskid_super_covering**
- Key: `(GSTaskID, TranDate)`
- Include: `TType, TTypeDesc, Fees, Disbs, ServLineCode, TaskPartner, TaskManager, updatedAt`
- Filter: `WHERE GSTaskID IS NOT NULL`
- Covers: Task details page, task WIP summary, profitability calculations

## Benefits

### Index Removal
- Reduced storage overhead (~500MB estimated)
- Faster INSERT/UPDATE operations on affected tables
- Simplified index maintenance

### Super Covering Indexes
- Eliminates key lookups for common queries
- Expected 60-80% performance improvement for WIP queries
- Covers most SELECT columns without table access

## Rollback

If needed, the removed indexes can be recreated from the backup in `prisma/migrations_backup_20260125/`.

The super covering indexes can be dropped with:
```sql
DROP INDEX [idx_wip_gsclientid_super_covering] ON [dbo].[WIPTransactions];
DROP INDEX [idx_wip_gstaskid_super_covering] ON [dbo].[WIPTransactions];
```
