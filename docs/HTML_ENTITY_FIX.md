# HTML Entity Decoding Fix

**Date:** 2026-01-22  
**Issue:** Queries copied from Performance tab contain HTML entities  
**Status:** ✅ Fix Applied - Requires Server Restart

## Problem

When copying queries from the Azure Performance tab or other HTML sources, the queries contain HTML entities:
- `&lt;` instead of `<`
- `&gt;` instead of `>`
- `&amp;` instead of `&`
- `&quot;` instead of `"`

Example query with HTML entities:
```sql
WITH MonthSeries AS (
  SELECT EOMONTH(@P1) as month
  WHERE month &lt; EOMONTH(@P2)  -- &lt; is HTML entity
)
```

This causes the validator to detect `&` character and reject the query with:
```
SQL Server does not support & operator. Use + for string concatenation or AND for logical operations.
```

## Solution Applied

Added HTML entity decoding at the start of `executeQuery()` function in `databaseService.ts`:

```typescript
// Decode HTML entities (queries copied from Performance tab may be HTML-encoded)
const decodedQuery = query
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");
```

All subsequent validation and execution uses `decodedQuery` instead of the raw `query`.

## Action Required

**RESTART YOUR DEVELOPMENT SERVER** for changes to take effect:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
# or
yarn dev
```

## Testing After Restart

Try your query again. It should now work correctly:

```sql
WITH MonthSeries AS (
  SELECT EOMONTH(@P1) as month
  UNION ALL
  SELECT EOMONTH(DATEADD(MONTH, 1, month))
  FROM MonthSeries
  WHERE month < EOMONTH(@P2)  -- < will work now
)
SELECT * FROM MonthSeries
```

The query will be decoded before validation, so:
- `&lt;` → `<`
- `&gt;` → `>`
- HTML entities handled transparently

## Files Modified

1. ✅ `src/lib/services/admin/databaseService.ts` - Added HTML entity decoding

## Benefits

- ✅ Queries can be copied directly from Performance tab
- ✅ HTML-encoded queries work transparently
- ✅ No manual editing required
- ✅ All comparison operators supported (`<`, `>`, `<=`, `>=`, `<>`)

---

**Status:** Fix complete, server restart required to apply changes
