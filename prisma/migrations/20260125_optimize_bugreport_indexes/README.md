# BugReport Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering index, then safe drops)

## Overview

This migration consolidates 4 indexes on the BugReport table into 2 optimized indexes, reducing write overhead by 50% while maintaining or improving read performance through a covering index.

## Indexes Created

### 1. idx_bugreport_status_priority_covering

```sql
CREATE NONCLUSTERED INDEX [idx_bugreport_status_priority_covering] 
ON [BugReport]([status], [priority], [reportedAt] DESC) 
INCLUDE ([reportedBy], [url], [resolvedAt], [resolvedBy])
```

**Purpose:** Covers all bug report listing, filtering, and triage queries  
**Key Columns:** status, priority, reportedAt DESC  
**INCLUDE Columns (4):** reportedBy, url, resolvedAt, resolvedBy

**Query Patterns Covered:**
- List by status: `WHERE status = 'OPEN'`
- List by status and priority: `WHERE status = 'OPEN' AND priority = 'HIGH'`
- List ordered by date: `ORDER BY reportedAt DESC`
- Combined filtering: `WHERE status = 'OPEN' ORDER BY priority, reportedAt DESC`

## Indexes Dropped

| Index Name | Reason |
|---|---|
| BugReport_status_idx | Leftmost column of compound covering index |
| BugReport_priority_idx | Second column of compound covering index |
| BugReport_reportedAt_idx | Third column of compound covering index |

## Indexes Kept

| Index Name | Reason |
|---|---|
| BugReport_reportedBy_idx | FK constraint, user's reported bugs lookup |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE status = X | idx_bugreport_status_priority_covering (leftmost) |
| WHERE status = X AND priority = Y | idx_bugreport_status_priority_covering |
| WHERE status = X ORDER BY reportedAt DESC | idx_bugreport_status_priority_covering |
| WHERE reportedBy = X | BugReport_reportedBy_idx (kept) |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total Indexes | 4 | 2 | -50% |
| Write Overhead | 4 index updates | 2 index updates | ~50% reduction |
| Key Lookups | Required | Eliminated | Covering index |
| Storage | 4 B-trees | 2 B-trees | ~50% reduction |

## Estimated Runtime

- **Index creation:** < 1 minute (small table, ONLINE = ON)
- **Index drops:** < 1 minute
- **Statistics update:** < 1 minute
- **Total:** ~1-2 minutes

## Rollback

If issues occur, rollback script is included in migration.sql comments.
