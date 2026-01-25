# ClientAcceptanceAnswer Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering index, then safe drops)

## Overview

This migration consolidates 3 indexes on the ClientAcceptanceAnswer table into 2 optimized indexes, reducing write overhead by 33% while maintaining or improving read performance through a covering index.

## Indexes Created

### 1. idx_clientaccanswer_acceptance_covering

```sql
CREATE NONCLUSTERED INDEX [idx_clientaccanswer_acceptance_covering] 
ON [ClientAcceptanceAnswer]([clientAcceptanceId]) 
INCLUDE ([questionId], [answer], [comment], [updatedAt])
```

**Purpose:** Covers all answer retrieval queries for a client acceptance  
**Key Columns:** clientAcceptanceId  
**INCLUDE Columns (4):** questionId, answer, comment, updatedAt

**Query Patterns Covered:**
- Get all answers for acceptance: `WHERE clientAcceptanceId = X`
- Load answers with question data: `WHERE clientAcceptanceId = X` (no lookup needed)

## Indexes Dropped

| Index Name | Reason |
|---|---|
| ClientAcceptanceAnswer_clientAcceptanceId_idx | Replaced by covering index |
| ClientAcceptanceAnswer_questionId_idx | Rarely queried standalone, unique constraint handles specific lookups |

## Indexes Kept

| Index Name | Reason |
|---|---|
| Unique (clientAcceptanceId, questionId) | Uniqueness constraint (prevents duplicate answers) |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE clientAcceptanceId = X | idx_clientaccanswer_acceptance_covering |
| WHERE clientAcceptanceId = X AND questionId = Y | Unique constraint (index seek) |
| WHERE questionId = X (rare) | Unique constraint can support this |

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
