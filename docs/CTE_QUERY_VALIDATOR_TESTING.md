# CTE Query Validator Testing Guide

**Date:** 2026-01-22  
**Changes:** Updated database query validator to allow WITH (CTE) queries  
**Status:** ✅ Implementation Complete - Ready for Testing

## Summary of Changes

Updated the admin database query executor to accept Common Table Expressions (CTEs) in addition to standard SELECT queries, while maintaining strict security controls.

### Files Modified

1. ✅ **`src/lib/services/admin/databaseService.ts`** (lines 675-685)
   - Updated validation to allow both SELECT and WITH queries
   - Added comment stripping before validation
   - Improved error messaging

2. ✅ **`src/app/dashboard/admin/database/page.tsx`** (line 1952)
   - Updated UI help text to reflect CTE support

---

## Testing Checklist

### 1. Valid Queries (Should Execute Successfully)

#### Test 1.1: Standard SELECT Query
```sql
SELECT TOP 10 
  GSTaskID, 
  TaskCode, 
  TaskDesc 
FROM Task 
WHERE Active = 'Yes'
```

**Expected:** ✅ Query executes successfully  
**Status:** ⏳ Pending manual test

---

#### Test 1.2: Simple CTE Query
```sql
WITH TaskCounts AS (
  SELECT GSClientID, COUNT(*) as TaskCount
  FROM Task
  WHERE Active = 'Yes'
  GROUP BY GSClientID
)
SELECT * FROM TaskCounts
WHERE TaskCount > 5
ORDER BY TaskCount DESC
```

**Expected:** ✅ Query executes successfully  
**Status:** ⏳ Pending manual test

---

#### Test 1.3: CTE with Comments (Leading)
```sql
-- Get task counts by client
-- Only active tasks
WITH TaskCounts AS (
  SELECT GSClientID, COUNT(*) as cnt 
  FROM Task 
  WHERE Active = 'Yes'
  GROUP BY GSClientID
)
SELECT * FROM TaskCounts WHERE cnt > 10
```

**Expected:** ✅ Query executes successfully (comments stripped before validation)  
**Status:** ⏳ Pending manual test

---

#### Test 1.4: CTE with Multi-line Comments
```sql
/*
 * Monthly WIP Aggregation
 * Author: System
 * Date: 2026-01-22
 */
WITH MonthlyWIP AS (
  SELECT 
    YEAR(TranDate) as Year,
    MONTH(TranDate) as Month,
    SUM(Amount) as TotalAmount
  FROM WIPTransactions
  WHERE TranDate >= '2024-01-01'
  GROUP BY YEAR(TranDate), MONTH(TranDate)
)
SELECT * FROM MonthlyWIP
ORDER BY Year, Month
```

**Expected:** ✅ Query executes successfully  
**Status:** ⏳ Pending manual test

---

#### Test 1.5: Multiple CTEs
```sql
WITH ActiveTasks AS (
  SELECT GSTaskID, GSClientID, TaskCode
  FROM Task
  WHERE Active = 'Yes'
),
ClientCounts AS (
  SELECT GSClientID, COUNT(*) as TaskCount
  FROM ActiveTasks
  GROUP BY GSClientID
)
SELECT c.clientCode, cc.TaskCount
FROM ClientCounts cc
JOIN Client c ON cc.GSClientID = c.GSClientID
ORDER BY cc.TaskCount DESC
```

**Expected:** ✅ Query executes successfully  
**Status:** ⏳ Pending manual test

---

#### Test 1.6: Recursive CTE (Safe Read-Only)
```sql
WITH RECURSIVE OrgHierarchy AS (
  SELECT EmpCode, EmpNameFull, ManagerCode, 1 as Level
  FROM Employee
  WHERE ManagerCode IS NULL
  
  UNION ALL
  
  SELECT e.EmpCode, e.EmpNameFull, e.ManagerCode, oh.Level + 1
  FROM Employee e
  INNER JOIN OrgHierarchy oh ON e.ManagerCode = oh.EmpCode
  WHERE oh.Level < 5
)
SELECT * FROM OrgHierarchy
ORDER BY Level, EmpCode
```

**Expected:** ✅ Query executes successfully (recursive CTEs are read-only)  
**Status:** ⏳ Pending manual test

---

### 2. Invalid Queries (Should Be Blocked)

#### Test 2.1: CTE with DROP Statement
```sql
WITH Temp AS (
  SELECT * FROM Task
)
DROP TABLE Task
```

**Expected:** ❌ Blocked with error: "Query contains forbidden keyword: DROP"  
**Status:** ⏳ Pending manual test

---

#### Test 2.2: CTE with INSERT Statement
```sql
WITH NewData AS (
  SELECT 'TEST001' as TaskCode, 'Test Task' as TaskDesc
)
INSERT INTO Task (TaskCode, TaskDesc)
SELECT TaskCode, TaskDesc FROM NewData
```

**Expected:** ❌ Blocked with error: "Query contains forbidden keyword: INSERT"  
**Status:** ⏳ Pending manual test

---

#### Test 2.3: CTE with UPDATE Statement
```sql
WITH TasksToUpdate AS (
  SELECT GSTaskID FROM Task WHERE Active = 'No'
)
UPDATE Task 
SET Active = 'Yes' 
WHERE GSTaskID IN (SELECT GSTaskID FROM TasksToUpdate)
```

**Expected:** ❌ Blocked with error: "Query contains forbidden keyword: UPDATE"  
**Status:** ⏳ Pending manual test

---

#### Test 2.4: CTE with DELETE Statement
```sql
WITH OldTasks AS (
  SELECT GSTaskID FROM Task WHERE Active = 'No'
)
DELETE FROM Task WHERE GSTaskID IN (SELECT GSTaskID FROM OldTasks)
```

**Expected:** ❌ Blocked with error: "Query contains forbidden keyword: DELETE"  
**Status:** ⏳ Pending manual test

---

#### Test 2.5: CTE with EXECUTE/EXEC
```sql
WITH Params AS (
  SELECT 'Test' as Value
)
EXEC sp_executesql 'SELECT * FROM Task'
```

**Expected:** ❌ Blocked with error: "Query contains forbidden keyword: EXEC"  
**Status:** ⏳ Pending manual test

---

#### Test 2.6: Non-SELECT/WITH Query
```sql
UPDATE Task SET Active = 'No' WHERE Active = 'Yes'
```

**Expected:** ❌ Blocked with error: "Only SELECT and WITH (CTE) queries are allowed"  
**Status:** ⏳ Pending manual test

---

#### Test 2.7: CREATE Statement
```sql
CREATE TABLE TestTable (
  id INT PRIMARY KEY,
  name VARCHAR(100)
)
```

**Expected:** ❌ Blocked with error: "Query contains forbidden keyword: CREATE"  
**Status:** ⏳ Pending manual test

---

#### Test 2.8: ALTER Statement
```sql
ALTER TABLE Task ADD NewColumn VARCHAR(50)
```

**Expected:** ❌ Blocked with error: "Query contains forbidden keyword: ALTER"  
**Status:** ⏳ Pending manual test

---

#### Test 2.9: TRUNCATE Statement
```sql
TRUNCATE TABLE Task
```

**Expected:** ❌ Blocked with error: "Query contains forbidden keyword: TRUNCATE"  
**Status:** ⏳ Pending manual test

---

### 3. Edge Cases

#### Test 3.1: Query with Dangerous Keywords in Comments
```sql
-- This query will UPDATE nothing, just SELECT
WITH Tasks AS (
  SELECT * FROM Task
)
SELECT * FROM Tasks
```

**Expected:** ✅ Query executes (keyword in comment is stripped before validation)  
**Status:** ⏳ Pending manual test

---

#### Test 3.2: Query with Dangerous Keywords in String Literals
```sql
WITH Messages AS (
  SELECT 'DELETE is a dangerous operation' as Message
)
SELECT * FROM Messages
```

**Expected:** ❌ Currently blocked (keyword scanner checks entire query text)  
**Known Limitation:** String literals containing dangerous keywords will be blocked  
**Status:** ⏳ Pending manual test  
**Note:** This is acceptable for security - safer to be overly restrictive

---

#### Test 3.3: Mixed Case Keywords
```sql
WiTh TaskCounts As (
  sElEcT GSClientID, COUNT(*) as cnt
  fRoM Task
  gRoUp By GSClientID
)
SeLeCt * FrOm TaskCounts
```

**Expected:** ✅ Query executes (case-insensitive validation)  
**Status:** ⏳ Pending manual test

---

## Security Verification

### What CTEs Can Do (Safe)
- ✅ Read data from any table user has access to
- ✅ Perform complex joins and aggregations
- ✅ Create temporary result sets for query duration only
- ✅ Use recursive queries (still read-only)
- ✅ Filter, sort, and transform data

### What CTEs Cannot Do (Blocked)
- ❌ Modify data (INSERT, UPDATE, DELETE)
- ❌ Modify schema (CREATE, ALTER, DROP, TRUNCATE)
- ❌ Execute stored procedures (EXEC, EXECUTE)
- ❌ Change permissions or security settings
- ❌ Persist beyond query execution

### Validation Logic Flow

```
Query Input
    ↓
Strip SQL Comments (-- and /* */)
    ↓
Trim & Convert to UPPERCASE
    ↓
Check: Starts with SELECT or WITH?
    ├─ NO → Reject: "Only SELECT and WITH (CTE) queries are allowed"
    └─ YES → Continue
         ↓
Scan for Dangerous Keywords (DROP, DELETE, INSERT, UPDATE, etc.)
    ├─ FOUND → Reject: "Query contains forbidden keyword: X"
    └─ NONE → Continue
         ↓
Check for problematic SQL Server syntax (&)
    ├─ FOUND (not FOR XML) → Reject with helpful message
    └─ OK → Continue
         ↓
Apply TOP limit intelligently
    ↓
Execute Query
```

---

## Performance Testing

### Test Query Performance

Execute the following CTE and compare with equivalent JOIN:

```sql
-- CTE Version
WITH WIPAggregated AS (
  SELECT 
    GSTaskID,
    SUM(CASE WHEN TType = 'T' THEN ISNULL(Amount, 0) ELSE 0 END) as time,
    SUM(CASE WHEN TType = 'ADJ' THEN ISNULL(Amount, 0) ELSE 0 END) as adjustments,
    SUM(CASE WHEN TType = 'D' THEN ISNULL(Amount, 0) ELSE 0 END) as disbursements,
    SUM(CASE WHEN TType = 'F' THEN ISNULL(Amount, 0) ELSE 0 END) as fees,
    SUM(CASE WHEN TType = 'P' THEN ISNULL(Amount, 0) ELSE 0 END) as provision
  FROM WIPTransactions
  WHERE GSTaskID IN (SELECT TOP 50 GSTaskID FROM Task WHERE Active = 'Yes')
  GROUP BY GSTaskID
)
SELECT 
  t.TaskCode,
  t.TaskDesc,
  w.time + w.adjustments + w.disbursements - w.fees + w.provision as netWip
FROM WIPAggregated w
JOIN Task t ON w.GSTaskID = t.GSTaskID
ORDER BY netWip DESC
```

**Expected:** Query executes in <2 seconds with covering index  
**Status:** ⏳ Pending performance test

---

## Manual Testing Steps

### Step 1: Restart Development Server
```bash
# Ensure changes are compiled
npm run dev
# or
yarn dev
```

### Step 2: Navigate to Admin Database Page
1. Login as admin user
2. Go to: `/dashboard/admin/database`
3. Verify UI shows: "⚠️ Read-only mode: Only SELECT and WITH (CTE) queries are allowed"

### Step 3: Test Valid Queries
1. Copy Test 1.1 (Standard SELECT) → Execute → Verify success
2. Copy Test 1.2 (Simple CTE) → Execute → Verify success
3. Copy Test 1.3 (CTE with comments) → Execute → Verify success
4. Copy Test 1.5 (Multiple CTEs) → Execute → Verify success

### Step 4: Test Security (Invalid Queries)
1. Copy Test 2.1 (CTE with DROP) → Execute → Verify blocked
2. Copy Test 2.2 (CTE with INSERT) → Execute → Verify blocked
3. Copy Test 2.6 (Non-SELECT/WITH) → Execute → Verify blocked

### Step 5: Test Edge Cases
1. Copy Test 3.1 (Keywords in comments) → Execute → Verify success
2. Copy Test 3.2 (Keywords in strings) → Execute → Verify blocked (expected)
3. Copy Test 3.3 (Mixed case) → Execute → Verify success

---

## Rollback Procedure

If any security issues are discovered:

### 1. Revert databaseService.ts
```typescript
// Revert to original validation
const trimmedQuery = query.trim().toUpperCase();
if (!trimmedQuery.startsWith('SELECT')) {
  throw new Error('Only SELECT queries are allowed');
}
```

### 2. Revert page.tsx
```tsx
<p className="text-sm text-orange-600 font-medium">
  ⚠️ Read-only mode: Only SELECT queries are allowed
</p>
```

### 3. Restart Server
```bash
npm run dev
```

---

## Success Criteria

- ✅ No linter errors
- ⏳ All Test 1.x queries execute successfully
- ⏳ All Test 2.x queries are properly blocked
- ⏳ UI displays updated help text
- ⏳ No security vulnerabilities introduced
- ⏳ Performance remains acceptable (<2s for complex CTEs)

---

## Known Limitations

1. **String Literals:** Dangerous keywords in string literals will be blocked (overly restrictive but safe)
2. **Comment Syntax:** Only `--` and `/* */` comments supported (standard SQL comments)
3. **Query Length:** Existing TOP limit logic still applies

These limitations are acceptable trade-offs for security.

---

**Testing Status:** Implementation complete, awaiting manual verification  
**Next Step:** Execute manual tests in admin database interface
