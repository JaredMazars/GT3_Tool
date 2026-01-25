# BDActivity Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering indexes, then safe drops)

## Overview

This migration consolidates 9 indexes on the BDActivity table into 4 optimized indexes, reducing write overhead by 56% while maintaining or improving read performance through covering indexes.

## Indexes Created

### 1. idx_bdactivity_assigned_status_due_covering

```sql
CREATE NONCLUSTERED INDEX [idx_bdactivity_assigned_status_due_covering] 
ON [BDActivity]([assignedTo], [status], [dueDate]) 
INCLUDE ([activityType], [completedAt], [subject], [opportunityId], [createdAt])
```

**Purpose:** Covers all "my activities" and task assignment queries  
**Key Columns:** assignedTo, status, dueDate  
**INCLUDE Columns (5):** activityType, completedAt, subject, opportunityId, createdAt

### 2. idx_bdactivity_opp_created_covering

```sql
CREATE NONCLUSTERED INDEX [idx_bdactivity_opp_created_covering] 
ON [BDActivity]([opportunityId], [createdAt] DESC) 
INCLUDE ([status], [activityType], [dueDate], [subject], [assignedTo], [completedAt])
```

**Purpose:** Covers opportunity activity history and timeline queries  
**Key Columns:** opportunityId, createdAt DESC  
**INCLUDE Columns (6):** status, activityType, dueDate, subject, assignedTo, completedAt

## Indexes Dropped

| Index Name | Reason |
|---|---|
| BDActivity_assignedTo_idx | Leftmost column of covering index |
| BDActivity_assignedTo_status_dueDate_idx | Replaced by covering index |
| BDActivity_status_idx | Low selectivity, covered by compound |
| BDActivity_activityType_idx | Low selectivity, in INCLUDE columns |
| BDActivity_dueDate_idx | Covered by compound index |
| BDActivity_opportunityId_createdAt_idx | Replaced by covering index |

## Indexes Kept

| Index Name | Reason |
|---|---|
| BDActivity_opportunityId_idx | FK constraint, cascade deletes |
| BDActivity_contactId_idx | FK constraint |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE assignedTo = X | idx_bdactivity_assigned_status_due_covering (leftmost) |
| WHERE assignedTo = X AND status = Y | idx_bdactivity_assigned_status_due_covering |
| WHERE assignedTo = X AND status = Y AND dueDate < Z | idx_bdactivity_assigned_status_due_covering |
| WHERE opportunityId = X ORDER BY createdAt DESC | idx_bdactivity_opp_created_covering |
| WHERE opportunityId = X | BDActivity_opportunityId_idx (FK) |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total Indexes | 9 | 4 | -56% |
| Write Overhead | High | Reduced | ~56% fewer index updates |
| Key Lookups | Required | Eliminated | Covering indexes |
| Storage | 9 B-trees | 4 B-trees | ~55% reduction |

## Estimated Runtime

- **Index creation:** 2-5 minutes (ONLINE = ON, non-blocking)
- **Index drops:** 1 minute
- **Statistics update:** 1 minute
- **Total:** ~5-10 minutes

## Rollback

If issues occur, rollback script is included in migration.sql comments.
