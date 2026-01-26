# AcceptanceQuestion Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering index, then safe drops)

## Overview

This migration consolidates 4 indexes on the AcceptanceQuestion table into 2 optimized indexes, reducing write overhead by 50% while maintaining or improving read performance through a covering index.

## Indexes Created

### 1. idx_accquestion_type_order_covering

```sql
CREATE NONCLUSTERED INDEX [idx_accquestion_type_order_covering] 
ON [AcceptanceQuestion]([questionnaireType], [order]) 
INCLUDE ([sectionKey], [questionKey], [questionText], [fieldType], [required], [riskWeight], [options])
```

**Purpose:** Covers all questionnaire loading queries with no key lookups  
**Key Columns:** questionnaireType, order  
**INCLUDE Columns (7):** sectionKey, questionKey, questionText, fieldType, required, riskWeight, options

**Query Patterns Covered:**
- Load questionnaire: `WHERE questionnaireType = X ORDER BY order`
- Get questions by type: `WHERE questionnaireType = X`
- Filter by section: `WHERE questionnaireType = X AND sectionKey = Y` (via INCLUDE)

## Indexes Dropped

| Index Name | Reason |
|---|---|
| AcceptanceQuestion_questionnaireType_idx | Leftmost column of compound covering index |
| AcceptanceQuestion_questionnaireType_order_idx | Replaced by covering index |
| AcceptanceQuestion_questionnaireType_sectionKey_idx | sectionKey in INCLUDE, less common query pattern |

## Indexes Kept

| Index Name | Reason |
|---|---|
| Unique (questionnaireType, questionKey) | Uniqueness constraint (prevents duplicate questions) |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE questionnaireType = X | idx_accquestion_type_order_covering (leftmost) |
| WHERE questionnaireType = X ORDER BY order | idx_accquestion_type_order_covering |
| WHERE questionnaireType = X AND sectionKey = Y | idx_accquestion_type_order_covering (scan + filter on INCLUDE) |
| WHERE questionnaireType = X AND questionKey = Y | Unique constraint (index seek) |

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
