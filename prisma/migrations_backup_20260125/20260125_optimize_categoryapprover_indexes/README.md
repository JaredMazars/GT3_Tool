# CategoryApprover Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering index, then safe drops)

## Overview

This migration consolidates 3 indexes on the CategoryApprover table into 2 optimized indexes, reducing write overhead by 33% while maintaining or improving read performance through a covering index.

## Indexes Created

### 1. idx_categoryapprover_category_steporder_covering

```sql
CREATE NONCLUSTERED INDEX [idx_categoryapprover_category_steporder_covering] 
ON [CategoryApprover]([categoryId], [stepOrder]) 
INCLUDE ([userId], [createdAt], [createdBy])
```

**Purpose:** Covers all category approver listing and ordering queries  
**Key Columns:** categoryId, stepOrder  
**INCLUDE Columns (3):** userId, createdAt, createdBy

## Indexes Dropped

| Index Name | Reason |
|---|---|
| IX_CategoryApprover_CategoryId | Leftmost column of compound covering index |
| IX_CategoryApprover_CategoryId_StepOrder | Replaced by covering index |

## Indexes Kept

| Index Name | Reason |
|---|---|
| IX_CategoryApprover_UserId | FK constraint, user's approver assignments lookup |
| UQ_CategoryApprover_CategoryId_UserId | Unique constraint (prevents duplicate assignments) |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE categoryId = X | idx_categoryapprover_category_steporder_covering (leftmost) |
| WHERE categoryId = X ORDER BY stepOrder | idx_categoryapprover_category_steporder_covering |
| WHERE userId = X | IX_CategoryApprover_UserId (kept) |
| WHERE categoryId = X AND userId = Y | UQ_CategoryApprover_CategoryId_UserId (unique) |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total Indexes | 3 | 2 | -33% |
| Write Overhead | 3 index updates | 2 index updates | ~33% reduction |
| Key Lookups | Required | Eliminated | Covering index |
| Storage | 3 B-trees | 2 B-trees | ~33% reduction |

## Estimated Runtime

- **Index creation:** < 1 minute (small table, ONLINE = ON)
- **Index drops:** < 1 minute
- **Statistics update:** < 1 minute
- **Total:** ~1-2 minutes

## Rollback

If issues occur, rollback script is included in migration.sql comments.
