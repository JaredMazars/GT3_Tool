# Cleanup Duplicate WIPTransactions Indexes

**Date:** 2026-01-25  
**Type:** Index Cleanup  
**Risk:** Low (drops only redundant indexes after super covering indexes verified)

## Prerequisites

**MUST run BEFORE this migration:**

1. ✅ `20260125_add_super_covering_wip_indexes` - Creates super covering indexes
2. ✅ `scripts/test_super_covering_indexes.sql` - Verifies new indexes work correctly

This migration will **FAIL** if super covering indexes don't exist (safety check).

## Indexes Dropped (8)

| Index Name | Type | Reason for Removal |
|---|---|---|
| `idx_wip_gsclientid_covering` | Covering (3 INCLUDE) | Superseded by super covering (9 INCLUDE) |
| `idx_wip_gstaskid_covering` | Covering (3 INCLUDE) | Superseded by super covering (9 INCLUDE) |
| `idx_WIPTransactions_Aggregation_COVERING` | Covering (3 INCLUDE) | Absorbed by super covering |
| `idx_wip_gsclientid` | Simple | Duplicate of covering index |
| `idx_wiptransactions_gsclientid` | Simple | Duplicate of covering index |
| `idx_wip_gstaskid` | Simple | Duplicate of covering index |
| `idx_wiptransactions_gstaskid` | Simple | Duplicate of covering index |
| `WIPTransactions_TType_idx` | Single-column | TType now in INCLUDE columns |

## Conditional Drops (Commented Out)

These are kept by default but can be dropped if `check_wip_indexes.sql` shows 0 usage:

- `WIPTransactions_EmpCode_idx`
- `WIPTransactions_OfficeCode_idx`
- `WIPTransactions_ServLineGroup_idx`

## Indexes Kept (7)

| Index Name | Type | Purpose |
|---|---|---|
| `idx_wip_gsclientid_super_covering` | Super Covering | All client-level queries |
| `idx_wip_gstaskid_super_covering` | Super Covering | All task-level queries |
| `WIPTransactions_GSClientID_TranDate_TType_idx` | Composite | Analytics date ranges |
| `WIPTransactions_GSTaskID_TranDate_TType_idx` | Composite | Analytics date ranges |
| `WIPTransactions_TaskPartner_TranDate_idx` | Composite | My Reports partner view |
| `WIPTransactions_TaskManager_TranDate_idx` | Composite | My Reports manager view |
| `WIPTransactions_TranDate_idx` | Single | Fiscal period queries |

## Results

| Metric | Before | After | Improvement |
|---|---|---|---|
| Total indexes | 14+ | **7** | 50% reduction |
| Duplicate indexes | 4 | **0** | 100% eliminated |
| Covering indexes | 3 specialized | **2 comprehensive** | 33% fewer, 3x coverage |

## Rollback

If issues occur, run the rollback script at the bottom of migration.sql to recreate dropped indexes.

## Related Files

- `20260125_add_super_covering_wip_indexes/` - Creates super covering indexes (run first)
- `scripts/test_super_covering_indexes.sql` - Test script
- `scripts/check_wip_indexes.sql` - Verification script
- `docs/WIP_SUPER_COVERING_INDEX_ANALYSIS.md` - Full analysis
