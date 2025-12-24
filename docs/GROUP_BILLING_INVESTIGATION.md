# Group Billing Fees Investigation Guide

**Date:** December 24, 2025  
**Issue:** "All the fees does not show" on group details page graphs  
**Status:** 🔍 Investigation in Progress

## Changes Made

### 1. Restored OR Clause for Complete Data Capture

The API now uses an OR clause to capture transactions linked via either `GSClientID` OR `GSTaskID`:

```typescript
const wipWhereClause = taskIds.length > 0
  ? {
      OR: [
        { GSClientID: { in: clientIds } },
        { GSTaskID: { in: taskIds } },
      ],
      TranDate: { gte: startDate, lte: endDate }
    }
  : { GSClientID: { in: clientIds }, TranDate: { gte: startDate, lte: endDate } };
```

### 2. Removed Data Limits

**Before:** `take: 50000` on transaction queries  
**After:** No limit (fetches all transactions)

This ensures large groups with many transactions don't get cut off.

### 3. Added Comprehensive Logging

The API now logs:
- Client and task counts
- Total transactions fetched
- Transactions by type (T, F, ADJ, D, P)
- Transactions with ClientID vs only TaskID
- Date range being queried

**Check logs at:** `/api/groups/[groupCode]/analytics/graphs`

## How to Investigate

### Step 1: Check the Logs

After loading the group graphs page, check your application logs for entries like:

```
[INFO] Group graphs query started {
  groupCode: "ABC123",
  clientCount: 45,
  taskCount: 1234,
  dateRange: { startDate: "2023-12-24", endDate: "2025-12-24" }
}

[INFO] Group graphs transactions fetched {
  groupCode: "ABC123",
  totalTransactions: 15678,
  openingTransactions: 8901,
  byType: {
    T: 8901,    // Production
    F: 3456,    // Billing ← CHECK THIS NUMBER
    ADJ: 1234,  // Adjustments
    D: 1567,    // Disbursements
    P: 520      // Provisions
  },
  transactionsWithClientID: 14000,
  transactionsOnlyWithTaskID: 1678  // ← Transactions that would be missed without OR
}
```

**Key Questions:**
1. Is `byType.F` (billing) showing a reasonable number?
2. Is `transactionsOnlyWithTaskID` > 0? (If yes, OR clause is working)
3. Does `totalTransactions` seem correct for the group size?

### Step 2: Run the SQL Debug Query

Use the provided SQL query to investigate directly in the database:

**File:** `docs/DEBUG_GROUP_BILLING_QUERY.sql`

**Instructions:**
1. Open the SQL file
2. Replace `'YOUR_GROUP_CODE'` with your actual group code
3. Run the query in SQL Server Management Studio or Azure Data Studio
4. Review the results for each section

**What to Look For:**

#### Query 4: Billing by Link Type
```
LinkType                    | TransactionCount | TotalAmount
----------------------------|------------------|-------------
Both ClientID and TaskID    | 2500             | R 5,000,000
Only ClientID               | 800              | R 1,500,000
Only TaskID                 | 156              | R   300,000  ← Would be MISSED without OR
```

If you see "Only TaskID" with significant amounts, the OR clause is critical.

#### Query 6: With OR vs Without OR
```
QueryType                           | TType | TransactionCount | TotalAmount
------------------------------------|-------|------------------|-------------
With OR Clause                      | F     | 3456             | R 6,800,000
Without OR Clause (ClientID only)   | F     | 3300             | R 6,500,000
                                                    ↑                    ↑
                                            156 missing!         R 300K missing!
```

This shows exactly how many transactions would be missed without the OR clause.

#### Query 8: NULL GSClientID Analysis
```
QueryType                  | BillingWithNullClientID | TotalAmountWithNullClientID
---------------------------|-------------------------|----------------------------
NULL GSClientID Analysis   | 156                     | R 300,000
```

If this returns results, it confirms that some billing transactions have NULL `GSClientID` and are only linked via `GSTaskID`.

### Step 3: Compare with Profitability Tab

The Profitability tab shows total billing from the WIP table (aggregated monthly data).

**Test:**
1. Go to Group Analytics → Profitability tab
2. Note the "Total Billing" amount
3. Go to Group Analytics → Graphs tab
4. Check the "Total Billing" summary card
5. **These should match (or be very close)**

If they don't match:
- Profitability uses WIP table (monthly aggregates)
- Graphs uses WIPTransactions table (daily transactions)
- Discrepancies could indicate:
  - Missing transactions in graphs query
  - Date range differences
  - Data sync issues between WIP and WIPTransactions

### Step 4: Check Individual Client Graphs

**Test:**
1. Pick a client from the group
2. Go to that client's individual graphs page
3. Note the billing amounts
4. Verify those amounts are included in the group totals

If a client's billing shows individually but not in the group:
- The group query is missing that client's data
- Check if the client is properly linked to the group
- Check if the client's tasks are being fetched

## Common Issues and Solutions

### Issue 1: "Only seeing some billing fees, not all"

**Possible Causes:**
- ❌ OR clause not working correctly
- ❌ Task query not fetching all tasks for the group
- ❌ Date range mismatch

**Solution:**
1. Check logs for `taskCount` - should match expected number of tasks
2. Run SQL Query #3 to verify task count
3. Verify date range is correct (last 24 months)

### Issue 2: "No billing fees showing at all"

**Possible Causes:**
- ❌ No billing transactions in date range
- ❌ Group code mismatch
- ❌ TType filtering issue

**Solution:**
1. Run SQL Query #5 to see all transaction types
2. Check if TType = 'F' exists for the group
3. Verify group code is correct

### Issue 3: "Billing shows in profitability but not graphs"

**Possible Causes:**
- ❌ WIP vs WIPTransactions data mismatch
- ❌ Date range difference (WIP uses periods, graphs use dates)
- ❌ Aggregation logic difference

**Solution:**
1. Check if WIPTransactions table is properly populated
2. Verify data sync between WIP and WIPTransactions
3. Compare date ranges between the two tabs

### Issue 4: "Some months have billing, others don't"

**Possible Causes:**
- ❌ Downsampling removing data points
- ❌ Sparse data (no transactions on certain dates)
- ❌ Data quality issues

**Solution:**
1. Check resolution parameter (high/standard/low)
2. Use `resolution=high` in URL: `?resolution=high`
3. Review monthly breakdown (SQL Query #9)

## Technical Details

### WIPTransactions Schema

```typescript
model WIPTransactions {
  GSClientID: String?  // ← NULLABLE! Some transactions don't have this
  GSTaskID: String     // ← REQUIRED - all transactions have this
  TType: String        // T=Production, F=Billing, ADJ=Adjustments, D=Disbursements, P=Provisions
  Amount: Float?
  TranDate: DateTime
  // ... other fields
}
```

**Key Insight:** `GSClientID` is nullable, so some transactions are ONLY linked via `GSTaskID`.

### Query Logic

```typescript
// Step 1: Get all clients in group
const clients = await prisma.client.findMany({ where: { groupCode } });

// Step 2: Get all tasks for those clients
const tasks = await prisma.task.findMany({
  where: { client: { groupCode } }
});

// Step 3: Query transactions with OR clause
const transactions = await prisma.wIPTransactions.findMany({
  where: {
    OR: [
      { GSClientID: { in: clientIds } },  // Direct client link
      { GSTaskID: { in: taskIds } },      // Task link (may have NULL GSClientID)
    ],
    TranDate: { gte: startDate, lte: endDate }
  }
});
```

### Why OR Clause is Critical

Without the OR clause:
```typescript
// WRONG - Misses transactions with NULL GSClientID
where: { GSClientID: { in: clientIds }, ... }
```

This would miss:
- Billing fees recorded at task level
- Some adjustments
- Certain types of provisions
- Any transaction where GSClientID is NULL but GSTaskID is valid

## Next Steps

1. **Check Logs:** Look for the INFO messages in your application logs
2. **Run SQL Query:** Execute `DEBUG_GROUP_BILLING_QUERY.sql` with your group code
3. **Compare Results:** Check if profitability and graphs totals match
4. **Report Findings:** Share the log output and SQL results

## Files Modified

- `src/app/api/groups/[groupCode]/analytics/graphs/route.ts`
  - ✅ Restored OR clause
  - ✅ Removed data limits
  - ✅ Added comprehensive logging
  - ✅ Added GSClientID and GSTaskID to select for debugging

## Related Documentation

- [GROUP_GRAPHS_BILLING_FIX.md](./GROUP_GRAPHS_BILLING_FIX.md) - Initial fix documentation
- [GROUP_ANALYTICS_PERFORMANCE_OPTIMIZATION.md](./GROUP_ANALYTICS_PERFORMANCE_OPTIMIZATION.md) - Performance optimization details
- [DEBUG_GROUP_BILLING_QUERY.sql](./DEBUG_GROUP_BILLING_QUERY.sql) - SQL debugging queries

---

**Status:** Ready for testing and investigation  
**Next Action:** Load group graphs page and check logs for transaction counts


