# ApprovalStep Index Optimization Migration

**Date:** 2026-01-25  
**Type:** Performance Optimization  
**Risk:** Low (additive covering index, then safe drops)

## Overview

This migration consolidates 4 indexes on the ApprovalStep table into 2 optimized indexes, reducing write overhead by 50% while maintaining or improving read performance through a covering index.

## Indexes Created

### 1. idx_approvalstep_approval_order_status_covering

```sql
CREATE NONCLUSTERED INDEX [idx_approvalstep_approval_order_status_covering] 
ON [ApprovalStep]([approvalId], [stepOrder], [status]) 
INCLUDE ([assignedToUserId], [approvedAt], [approvedById], [isDelegated], [stepType], [isRequired], [comment])
```

**Purpose:** Covers all approval workflow step queries  
**Key Columns:** approvalId, stepOrder, status  
**INCLUDE Columns (7):** assignedToUserId, approvedAt, approvedById, isDelegated, stepType, isRequired, comment

**Query Patterns Covered:**
- Get all steps for an approval: `WHERE approvalId = X`
- Get steps in order: `WHERE approvalId = X ORDER BY stepOrder`
- Get pending steps: `WHERE approvalId = X AND status = 'PENDING'`
- Get specific step: `WHERE approvalId = X AND stepOrder = Y`

## Indexes Dropped

| Index Name | Reason |
|---|---|
| ApprovalStep_approvalId_idx | Leftmost column of compound covering index |
| ApprovalStep_approvalId_stepOrder_idx | First two columns of compound covering index |
| ApprovalStep_status_idx | Low selectivity, only useful with approvalId filter |

## Indexes Kept

| Index Name | Reason |
|---|---|
| ApprovalStep_assignedToUserId_idx | User's pending approvals lookup across all approvals |

## Query Coverage

| Query Pattern | Covered By |
|---|---|
| WHERE approvalId = X | idx_approvalstep_approval_order_status_covering (leftmost) |
| WHERE approvalId = X ORDER BY stepOrder | idx_approvalstep_approval_order_status_covering |
| WHERE approvalId = X AND stepOrder = Y | idx_approvalstep_approval_order_status_covering |
| WHERE approvalId = X AND status = Y | idx_approvalstep_approval_order_status_covering |
| WHERE assignedToUserId = X AND status = 'PENDING' | ApprovalStep_assignedToUserId_idx |

## Benefits

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total Indexes | 4 | 2 | -50% |
| Write Overhead | 4 index updates | 2 index updates | ~50% reduction |
| Key Lookups | Required | Eliminated | Covering index |
| Storage | 4 B-trees | 2 B-trees | ~50% reduction |

## Estimated Runtime

- **Index creation:** 1-2 minutes (ONLINE = ON, non-blocking)
- **Index drops:** < 1 minute
- **Statistics update:** < 1 minute
- **Total:** ~2-5 minutes

## Rollback

If issues occur, rollback script is included in migration.sql comments.
