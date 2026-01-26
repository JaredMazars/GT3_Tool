# InAppNotification Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering indexes, then safe drops)

## Overview

This migration consolidates 5 indexes on the InAppNotification table into 2 optimized indexes, reducing write overhead by 60% while maintaining or improving read performance through covering indexes.

## Indexes Created

### 1. idx_notification_user_read_covering

```sql
CREATE NONCLUSTERED INDEX [idx_notification_user_read_covering] 
ON [InAppNotification]([userId], [isRead]) 
INCLUDE ([createdAt], [type], [taskId], [title], [message], [actionUrl])
```

**Purpose:** Covers all user notification queries (unread count, notification list)  
**Key Columns:** userId, isRead  
**INCLUDE Columns (6):** createdAt, type, taskId, title, message, actionUrl

**Query Patterns Covered:**
- Get user's notifications: `WHERE userId = X`
- Get user's unread: `WHERE userId = X AND isRead = false`
- Get user's read: `WHERE userId = X AND isRead = true`

### 2. idx_notification_created_covering

```sql
CREATE NONCLUSTERED INDEX [idx_notification_created_covering] 
ON [InAppNotification]([createdAt] DESC) 
INCLUDE ([userId], [isRead], [type], [title])
```

**Purpose:** Covers recent notifications queries (admin view, global timeline)  
**Key Columns:** createdAt DESC  
**INCLUDE Columns (4):** userId, isRead, type, title

## Indexes Dropped

| Index Name | Reason |
|---|---|
| InAppNotification_userId_idx | Leftmost column of compound covering index |
| InAppNotification_userId_isRead_idx | Replaced by covering index |
| InAppNotification_taskId_idx | Low-frequency FK queries (task in INCLUDE) |
| InAppNotification_fromUserId_idx | Low-frequency "sent by" queries |
| InAppNotification_createdAt_idx | Replaced by covering index |

## Indexes Kept

None - all original indexes replaced by more efficient covering indexes.

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE userId = X | idx_notification_user_read_covering (leftmost) |
| WHERE userId = X AND isRead = false | idx_notification_user_read_covering |
| ORDER BY createdAt DESC | idx_notification_created_covering |
| WHERE userId = X ORDER BY createdAt DESC | idx_notification_user_read_covering (createdAt in INCLUDE) |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total Indexes | 5 | 2 | -60% |
| Write Overhead | 5 index updates | 2 index updates | ~60% reduction |
| Key Lookups | Required | Eliminated | Covering indexes |
| Storage | 5 B-trees | 2 B-trees | ~60% reduction |

## Estimated Runtime

- **Index creation:** 1-2 minutes (ONLINE = ON)
- **Index drops:** < 1 minute
- **Statistics update:** < 1 minute
- **Total:** ~2-5 minutes

## Rollback

If issues occur, rollback script is included in migration.sql comments.
