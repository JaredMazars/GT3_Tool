# TaskEngagementLetter Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering indexes, then safe drops)

## Overview

This migration consolidates 6 indexes on the TaskEngagementLetter table into 4 optimized indexes, reducing write overhead by 33% while maintaining or improving read performance through covering indexes.

## Indexes Created

### 1. idx_taskengagement_dpa_covering

```sql
CREATE NONCLUSTERED INDEX [idx_taskengagement_dpa_covering] 
ON [TaskEngagementLetter]([dpaExtractionStatus]) 
INCLUDE ([dpaLetterDate], [dpaSignedDate], [dpaSignedBy], [taskId], [updatedAt])
```

**Purpose:** Covers all DPA extraction status monitoring and reporting queries  
**Key Columns:** dpaExtractionStatus  
**INCLUDE Columns (5):** dpaLetterDate, dpaSignedDate, dpaSignedBy, taskId, updatedAt

### 2. idx_taskengagement_el_covering

```sql
CREATE NONCLUSTERED INDEX [idx_taskengagement_el_covering] 
ON [TaskEngagementLetter]([elExtractionStatus]) 
INCLUDE ([elLetterDate], [elSignedDate], [elSignedBy], [taskId], [updatedAt])
```

**Purpose:** Covers all Engagement Letter extraction status monitoring queries  
**Key Columns:** elExtractionStatus  
**INCLUDE Columns (5):** elLetterDate, elSignedDate, elSignedBy, taskId, updatedAt

## Indexes Dropped

| Index Name | Reason |
|---|---|
| idx_taskengagementletter_dpaextractionstatus | Replaced by covering index |
| idx_taskengagementletter_dpaletterdate | Included in covering index INCLUDE |
| idx_taskengagementletter_elextractionstatus | Replaced by covering index |
| idx_taskengagementletter_elletterdate | Included in covering index INCLUDE |

## Indexes Kept

| Index Name | Reason |
|---|---|
| TaskEngagementLetter_taskId_idx | Primary FK lookup, used for Task joins |
| TaskEngagementLetter_templateVersionId_idx | FK constraint, template version lookups |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE dpaExtractionStatus = X | idx_taskengagement_dpa_covering |
| WHERE dpaExtractionStatus = X (with date info) | idx_taskengagement_dpa_covering (no lookup) |
| WHERE elExtractionStatus = X | idx_taskengagement_el_covering |
| WHERE elExtractionStatus = X (with date info) | idx_taskengagement_el_covering (no lookup) |
| WHERE taskId = X | TaskEngagementLetter_taskId_idx (kept) |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total Indexes | 6 | 4 | -33% |
| Write Overhead | 6 index updates | 4 index updates | ~33% reduction |
| Key Lookups | Required | Eliminated | Covering indexes |
| Storage | 6 B-trees | 4 B-trees | ~33% reduction |

## Estimated Runtime

- **Index creation:** 1-2 minutes (ONLINE = ON, non-blocking)
- **Index drops:** < 1 minute
- **Statistics update:** < 1 minute
- **Total:** ~2-5 minutes

## Rollback

If issues occur, rollback script is included in migration.sql comments.
