# Profitability Stored Procedure Migration

**Date:** 2026-01-26  
**Type:** Performance Optimization (POC)  
**Risk:** Low (additive - creates stored procedure, doesn't modify existing code)

## Overview

This migration creates a stored procedure `sp_GetProfitabilityByTasks` to test whether stored procedures can replace elaborate covering indexes for WIP aggregation queries.

## Stored Procedure Created

### sp_GetProfitabilityByTasks

```sql
EXEC sp_GetProfitabilityByTasks 
  @TaskIds = '["guid1", "guid2", ...]',
  @StartDate = '2023-09-01',
  @EndDate = '2024-08-31';
```

**Parameters:**
- `@TaskIds` - JSON array of task GUIDs
- `@StartDate` - Start of date range (DATE)
- `@EndDate` - End of date range (DATE)

**Returns:**
| Column | Type | Description |
|---|---|---|
| GSTaskID | UNIQUEIDENTIFIER | Task identifier |
| ltdTime | DECIMAL | Sum of Time (TType = 'T') amounts |
| ltdHours | DECIMAL | Sum of Time hours |
| ltdDisb | DECIMAL | Sum of Disbursement (TType = 'D') amounts |
| ltdAdj | DECIMAL | Sum of Adjustment (TType = 'ADJ') amounts |
| ltdFee | DECIMAL | Sum of Fee (TType = 'F') amounts |
| ltdProvision | DECIMAL | Sum of Provision (TType = 'P') amounts |
| ltdCost | DECIMAL | Sum of Cost (excluding Provision) |

## Purpose

Test whether stored procedures can:
1. Achieve similar performance to covering indexes
2. Reduce index maintenance overhead
3. Simplify index strategy (use simple indexes instead of 9-column INCLUDE indexes)

## Current vs. Proposed Approach

| Aspect | Current (Covering Index) | Proposed (Stored Procedure) |
|---|---|---|
| Index size | ~320 MB (9 INCLUDE columns) | ~80 MB (simple GSTaskID index) |
| Query execution | Index-only scan | Index seek + table access |
| Maintenance | Rebuild covering index | No special maintenance |
| Logic location | Application code | Database procedure |

## Testing

### 1. Run Validation Script

```bash
sqlcmd -S your-server -d your-database -i scripts/validate_profitability_sp_results.sql
```

Expected: `✅ VALIDATION PASSED: All results match!`

### 2. Run Benchmark Script

```bash
sqlcmd -S your-server -d your-database -i scripts/benchmark_profitability_sp.sql
```

Compare:
- CPU time (should be within 10%)
- Elapsed time (should be within 10%)
- Logical reads (should be similar or lower)

### 3. Analyze Execution Plans

Open `scripts/analyze_profitability_execution_plans.sql` in SSMS and review graphical plans.

## Success Criteria

- [ ] Results match exactly (validation passes)
- [ ] Query performance within 10% of current approach
- [ ] Logical reads similar or lower
- [ ] Execution plan shows efficient index usage

## Rollback

```bash
sqlcmd -S your-server -d your-database -i prisma/migrations/20260126_add_profitability_stored_proc/rollback.sql
```

## Related Files

- `prisma/procedures/sp_GetProfitabilityByTasks.sql` - Source of truth
- `scripts/benchmark_profitability_sp.sql` - Performance testing
- `scripts/validate_profitability_sp_results.sql` - Results validation
- `scripts/analyze_profitability_execution_plans.sql` - Execution plan comparison
