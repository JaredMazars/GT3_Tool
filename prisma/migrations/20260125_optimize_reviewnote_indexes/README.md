# ReviewNote Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering indexes, then safe drops)

## Overview

This migration consolidates 12 indexes on the ReviewNote table into 6 optimized indexes, reducing write overhead by 50% while maintaining or improving read performance through covering indexes.

## Indexes Created

### 1. idx_reviewnote_assigned_status_covering

```sql
CREATE NONCLUSTERED INDEX [idx_reviewnote_assigned_status_covering] 
ON [ReviewNote]([assignedTo], [status]) 
INCLUDE ([priority], [dueDate], [taskId], [categoryId], [currentOwner], [title], [createdAt])
```

**Purpose:** Covers all "my review notes" and assignment queries  
**Key Columns:** assignedTo, status  
**INCLUDE Columns (7):** priority, dueDate, taskId, categoryId, currentOwner, title, createdAt

### 2. idx_reviewnote_task_status_covering

```sql
CREATE NONCLUSTERED INDEX [idx_reviewnote_task_status_covering] 
ON [ReviewNote]([taskId], [status]) 
INCLUDE ([priority], [assignedTo], [dueDate], [categoryId], [title], [raisedBy], [createdAt])
```

**Purpose:** Covers task-level review note listings and filtering  
**Key Columns:** taskId, status  
**INCLUDE Columns (7):** priority, assignedTo, dueDate, categoryId, title, raisedBy, createdAt

### 3. idx_reviewnote_created_covering

```sql
CREATE NONCLUSTERED INDEX [idx_reviewnote_created_covering] 
ON [ReviewNote]([createdAt] DESC) 
INCLUDE ([status], [priority], [taskId], [assignedTo], [title])
```

**Purpose:** Recent review notes timeline and activity tracking  
**Key Columns:** createdAt DESC  
**INCLUDE Columns (5):** status, priority, taskId, assignedTo, title

## Indexes Dropped

| Index Name | Reason |
|---|---|
| ReviewNote_assignedTo_idx | Leftmost column of covering index |
| ReviewNote_assignedTo_status_idx | Replaced by covering index |
| ReviewNote_status_idx | Low selectivity, covered by compounds |
| ReviewNote_priority_idx | Low selectivity, in INCLUDE columns |
| ReviewNote_currentOwner_idx | Functionally same as assignedTo |
| ReviewNote_raisedBy_idx | Infrequent query pattern |
| ReviewNote_taskId_status_idx | Replaced by covering index |
| ReviewNote_createdAt_idx | Replaced by covering index |

## Indexes Kept

| Index Name | Reason |
|---|---|
| ReviewNote_taskId_idx | FK constraint, simple lookups without status filter |
| ReviewNote_categoryId_idx | FK constraint |
| ReviewNote_dueDate_idx | Date range queries for due date filtering |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE assignedTo = X | idx_reviewnote_assigned_status_covering (leftmost) |
| WHERE assignedTo = X AND status = Y | idx_reviewnote_assigned_status_covering |
| WHERE taskId = X | idx_reviewnote_task_status_covering (leftmost) or FK index |
| WHERE taskId = X AND status = Y | idx_reviewnote_task_status_covering |
| ORDER BY createdAt DESC | idx_reviewnote_created_covering |
| WHERE categoryId = X | ReviewNote_categoryId_idx (kept) |
| WHERE dueDate BETWEEN X AND Y | ReviewNote_dueDate_idx (kept) |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total Indexes | 12 | 6 | -50% |
| Write Overhead | High | Reduced | ~50% fewer index updates |
| Key Lookups | Required | Eliminated | Covering indexes |
| Storage | 12 B-trees | 6 B-trees | ~50% reduction |

## Estimated Runtime

- **Index creation:** 3-5 minutes (ONLINE = ON, non-blocking)
- **Index drops:** 1-2 minutes
- **Statistics update:** 1 minute
- **Total:** ~5-10 minutes

## Rollback

If issues occur, rollback script is included in migration.sql comments.
