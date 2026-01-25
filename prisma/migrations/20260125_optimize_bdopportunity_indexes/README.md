# BDOpportunity Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering indexes, then safe drops)

## Overview

This migration consolidates 12 indexes on the BDOpportunity table into 7 optimized indexes, reducing write overhead by 42% while maintaining or improving read performance through covering indexes.

## Indexes Created

### 1. idx_bdopp_assigned_status_covering

```sql
CREATE NONCLUSTERED INDEX [idx_bdopp_assigned_status_covering] 
ON [BDOpportunity]([assignedTo], [status]) 
INCLUDE ([createdAt], [updatedAt], [serviceLine], [title], [value], [stageId])
```

**Purpose:** Covers all "my opportunities" and "user assignments" queries  
**Key Columns:** assignedTo, status  
**INCLUDE Columns (6):** createdAt, updatedAt, serviceLine, title, value, stageId

### 2. idx_bdopp_serviceline_status_covering

```sql
CREATE NONCLUSTERED INDEX [idx_bdopp_serviceline_status_covering] 
ON [BDOpportunity]([serviceLine], [status]) 
INCLUDE ([assignedTo], [expectedCloseDate], [value], [title], [stageId], [createdAt])
```

**Purpose:** Covers all service line filtering and pipeline queries  
**Key Columns:** serviceLine, status  
**INCLUDE Columns (6):** assignedTo, expectedCloseDate, value, title, stageId, createdAt

### 3. idx_bdopp_created_covering

```sql
CREATE NONCLUSTERED INDEX [idx_bdopp_created_covering] 
ON [BDOpportunity]([createdAt] DESC) 
INCLUDE ([status], [assignedTo], [serviceLine], [title], [value])
```

**Purpose:** Recent opportunities listing with no key lookups  
**Key Columns:** createdAt DESC  
**INCLUDE Columns (5):** status, assignedTo, serviceLine, title, value

### 4. idx_bdopp_updated_covering

```sql
CREATE NONCLUSTERED INDEX [idx_bdopp_updated_covering] 
ON [BDOpportunity]([updatedAt] DESC) 
INCLUDE ([status], [assignedTo], [title], [serviceLine])
```

**Purpose:** Activity tracking, recently modified opportunities  
**Key Columns:** updatedAt DESC  
**INCLUDE Columns (4):** status, assignedTo, title, serviceLine

## Indexes Dropped

| Index Name | Reason |
|---|---|
| BDOpportunity_assignedTo_idx | Leftmost column of idx_bdopp_assigned_status_covering |
| BDOpportunity_assignedTo_status_idx | Replaced by covering index |
| BDOpportunity_serviceLine_idx | Leftmost column of idx_bdopp_serviceline_status_covering |
| BDOpportunity_serviceLine_status_idx | Replaced by covering index |
| BDOpportunity_status_idx | Low selectivity, covered by compound indexes |
| BDOpportunity_convertedToClientId_idx | Rarely queried (conversion lookup only) |
| BDOpportunity_createdAt_idx | Replaced by covering index |
| BDOpportunity_updatedAt_idx | Replaced by covering index |

## Indexes Kept

| Index Name | Reason |
|---|---|
| BDOpportunity_clientId_idx | FK constraint, frequent Client joins |
| BDOpportunity_stageId_idx | FK constraint, pipeline stage filtering |
| BDOpportunity_expectedCloseDate_idx | Date range queries for forecasting |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE assignedTo = X | idx_bdopp_assigned_status_covering (leftmost) |
| WHERE assignedTo = X AND status = Y | idx_bdopp_assigned_status_covering |
| WHERE serviceLine = X | idx_bdopp_serviceline_status_covering (leftmost) |
| WHERE serviceLine = X AND status = Y | idx_bdopp_serviceline_status_covering |
| ORDER BY createdAt DESC | idx_bdopp_created_covering |
| ORDER BY updatedAt DESC | idx_bdopp_updated_covering |
| WHERE clientId = X | BDOpportunity_clientId_idx (kept) |
| WHERE stageId = X | BDOpportunity_stageId_idx (kept) |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total Indexes | 12 | 7 | -42% |
| Write Overhead | High | Reduced | ~42% fewer index updates |
| Key Lookups | Required | Eliminated | Covering indexes |
| Storage | 12 B-trees | 7 B-trees | ~40% reduction |

## Estimated Runtime

- **Index creation:** 5-10 minutes (ONLINE = ON, non-blocking)
- **Index drops:** 1-2 minutes
- **Statistics update:** 1-2 minutes
- **Total:** ~10-15 minutes

## Rollback

If issues occur, rollback script is included in migration.sql comments.

## Testing

After migration, verify with:

```sql
-- Check covering index usage (should show Index Seek, 0 lookups)
SET STATISTICS IO ON;
SELECT title, status, serviceLine FROM BDOpportunity WHERE assignedTo = 'user123';
-- Expected: Index Seek on idx_bdopp_assigned_status_covering
```
