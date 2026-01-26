# Profitability Report Performance Indexes

## Purpose
This migration adds indexes to optimize the My Reports profitability report API endpoint (`/api/my-reports/profitability`).

## Indexes Added

### Task Table
- `idx_task_partner` - Filtered index on `TaskPartner` (WHERE TaskPartner IS NOT NULL)
  - Supports partner-based task lookups
  
- `idx_task_manager` - Filtered index on `TaskManager` (WHERE TaskManager IS NOT NULL)
  - Supports manager-based task lookups
  
- `idx_task_gsclientid` - Index on `GSClientID`
  - Supports task-to-client relationship lookups

### WIPTransactions Table
- `idx_wip_gstaskid` - Index on `GSTaskID`
  - Enables fast aggregation of WIP transactions by task
  
- `idx_wip_ttype` - Index on `TType`
  - Supports filtering by transaction type (T, D, ADJ, F, P)

### ServiceLineExternal Table
- `idx_servline_code` - Index on `ServLineCode`
  - Enables fast service line lookups

### ServiceLineMaster Table
- `idx_master_sl_code` - Index on `code`
  - Enables fast master service line lookups

## Performance Impact

Expected improvement: **60-80% faster queries** when combined with the optimized API implementation.

### Before Optimization
- Multiple sequential queries
- In-memory WIP aggregation
- Fetches all tasks then filters

### After Optimization
- Database-level filtering with EXISTS
- SQL-based WIP aggregation
- Parallel query execution
- Explicit field selection

## Related Changes
- API Route: `src/app/api/my-reports/profitability/route.ts`
- Uses raw SQL for optimal performance
- Implements parallel execution with `Promise.all()`

## Testing
Test the report with varying dataset sizes:
- Small: 10-50 tasks
- Medium: 100-500 tasks
- Large: 1000+ tasks

Monitor query execution time and memory usage before/after migration.

