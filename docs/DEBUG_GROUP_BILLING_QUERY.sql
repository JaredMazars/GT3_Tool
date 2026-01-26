-- Debug Query: Group Billing Fees Analysis
-- Use this query to investigate why billing fees might not be showing in group graphs

-- Replace 'YOUR_GROUP_CODE' with the actual group code you're testing

DECLARE @GroupCode NVARCHAR(10) = 'YOUR_GROUP_CODE';
DECLARE @StartDate DATETIME2 = DATEADD(MONTH, -24, GETDATE());
DECLARE @EndDate DATETIME2 = GETDATE();

-- ========================================
-- 1. Get Group Info
-- ========================================
SELECT 
    'Group Info' as QueryType,
    groupCode,
    groupDesc,
    COUNT(*) as ClientCount
FROM Client
WHERE groupCode = @GroupCode
GROUP BY groupCode, groupDesc;

-- ========================================
-- 2. Get Clients in Group
-- ========================================
SELECT 
    'Clients in Group' as QueryType,
    GSClientID,
    clientCode,
    clientName
FROM Client
WHERE groupCode = @GroupCode
ORDER BY clientCode;

-- ========================================
-- 3. Get Tasks for Group
-- ========================================
SELECT 
    'Tasks in Group' as QueryType,
    COUNT(*) as TaskCount
FROM Task t
INNER JOIN Client c ON t.GSClientID = c.GSClientID
WHERE c.groupCode = @GroupCode;

-- ========================================
-- 4. Billing Transactions by Link Type
-- ========================================
WITH GroupClients AS (
    SELECT GSClientID 
    FROM Client 
    WHERE groupCode = @GroupCode
),
GroupTasks AS (
    SELECT t.GSTaskID
    FROM Task t
    INNER JOIN GroupClients gc ON t.GSClientID = gc.GSClientID
)
SELECT 
    'Billing by Link Type' as QueryType,
    CASE 
        WHEN wip.GSClientID IS NOT NULL AND wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks) THEN 'Both ClientID and TaskID'
        WHEN wip.GSClientID IS NOT NULL THEN 'Only ClientID'
        WHEN wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks) THEN 'Only TaskID'
        ELSE 'Neither (Should not happen)'
    END as LinkType,
    COUNT(*) as TransactionCount,
    SUM(wip.Amount) as TotalAmount
FROM WIPTransactions wip
WHERE wip.TType = 'F'  -- Billing
  AND wip.TranDate >= @StartDate
  AND wip.TranDate <= @EndDate
  AND (
      wip.GSClientID IN (SELECT GSClientID FROM GroupClients)
      OR wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks)
  )
GROUP BY 
    CASE 
        WHEN wip.GSClientID IS NOT NULL AND wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks) THEN 'Both ClientID and TaskID'
        WHEN wip.GSClientID IS NOT NULL THEN 'Only ClientID'
        WHEN wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks) THEN 'Only TaskID'
        ELSE 'Neither (Should not happen)'
    END
ORDER BY TransactionCount DESC;

-- ========================================
-- 5. All Transaction Types for Group
-- ========================================
WITH GroupClients AS (
    SELECT GSClientID 
    FROM Client 
    WHERE groupCode = @GroupCode
),
GroupTasks AS (
    SELECT t.GSTaskID
    FROM Task t
    INNER JOIN GroupClients gc ON t.GSClientID = gc.GSClientID
)
SELECT 
    'All Transaction Types' as QueryType,
    wip.TType,
    wip.TranType,
    COUNT(*) as TransactionCount,
    SUM(wip.Amount) as TotalAmount
FROM WIPTransactions wip
WHERE wip.TranDate >= @StartDate
  AND wip.TranDate <= @EndDate
  AND (
      wip.GSClientID IN (SELECT GSClientID FROM GroupClients)
      OR wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks)
  )
GROUP BY wip.TType, wip.TranType
ORDER BY TotalAmount DESC;

-- ========================================
-- 6. Compare: With OR vs Without OR
-- ========================================
WITH GroupClients AS (
    SELECT GSClientID 
    FROM Client 
    WHERE groupCode = @GroupCode
),
GroupTasks AS (
    SELECT t.GSTaskID
    FROM Task t
    INNER JOIN GroupClients gc ON t.GSClientID = gc.GSClientID
),
WithOR AS (
    SELECT 
        'With OR Clause' as QueryType,
        wip.TType,
        COUNT(*) as TransactionCount,
        SUM(wip.Amount) as TotalAmount
    FROM WIPTransactions wip
    WHERE wip.TranDate >= @StartDate
      AND wip.TranDate <= @EndDate
      AND (
          wip.GSClientID IN (SELECT GSClientID FROM GroupClients)
          OR wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks)
      )
    GROUP BY wip.TType
),
WithoutOR AS (
    SELECT 
        'Without OR Clause (ClientID only)' as QueryType,
        wip.TType,
        COUNT(*) as TransactionCount,
        SUM(wip.Amount) as TotalAmount
    FROM WIPTransactions wip
    WHERE wip.TranDate >= @StartDate
      AND wip.TranDate <= @EndDate
      AND wip.GSClientID IN (SELECT GSClientID FROM GroupClients)
    GROUP BY wip.TType
)
SELECT * FROM WithOR
UNION ALL
SELECT * FROM WithoutOR
ORDER BY QueryType, TType;

-- ========================================
-- 7. Sample Billing Transactions
-- ========================================
WITH GroupClients AS (
    SELECT GSClientID 
    FROM Client 
    WHERE groupCode = @GroupCode
),
GroupTasks AS (
    SELECT t.GSTaskID
    FROM Task t
    INNER JOIN GroupClients gc ON t.GSClientID = gc.GSClientID
)
SELECT TOP 20
    'Sample Billing Transactions' as QueryType,
    wip.TranDate,
    wip.ClientCode,
    wip.ClientName,
    wip.TaskCode,
    wip.TaskDesc,
    wip.Amount,
    wip.GSClientID,
    wip.GSTaskID,
    CASE 
        WHEN wip.GSClientID IS NOT NULL THEN 'Has ClientID'
        ELSE 'No ClientID'
    END as ClientIDStatus
FROM WIPTransactions wip
WHERE wip.TType = 'F'  -- Billing
  AND wip.TranDate >= @StartDate
  AND wip.TranDate <= @EndDate
  AND (
      wip.GSClientID IN (SELECT GSClientID FROM GroupClients)
      OR wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks)
  )
ORDER BY wip.TranDate DESC;

-- ========================================
-- 8. Check for NULL GSClientID in Billing
-- ========================================
WITH GroupClients AS (
    SELECT GSClientID 
    FROM Client 
    WHERE groupCode = @GroupCode
),
GroupTasks AS (
    SELECT t.GSTaskID
    FROM Task t
    INNER JOIN GroupClients gc ON t.GSClientID = gc.GSClientID
)
SELECT 
    'NULL GSClientID Analysis' as QueryType,
    COUNT(*) as BillingWithNullClientID,
    SUM(wip.Amount) as TotalAmountWithNullClientID
FROM WIPTransactions wip
WHERE wip.TType = 'F'  -- Billing
  AND wip.TranDate >= @StartDate
  AND wip.TranDate <= @EndDate
  AND wip.GSClientID IS NULL
  AND wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks);

-- ========================================
-- 9. Monthly Billing Breakdown
-- ========================================
WITH GroupClients AS (
    SELECT GSClientID 
    FROM Client 
    WHERE groupCode = @GroupCode
),
GroupTasks AS (
    SELECT t.GSTaskID
    FROM Task t
    INNER JOIN GroupClients gc ON t.GSClientID = gc.GSClientID
)
SELECT 
    'Monthly Billing' as QueryType,
    FORMAT(wip.TranDate, 'yyyy-MM') as YearMonth,
    COUNT(*) as TransactionCount,
    SUM(wip.Amount) as TotalBilling
FROM WIPTransactions wip
WHERE wip.TType = 'F'  -- Billing
  AND wip.TranDate >= @StartDate
  AND wip.TranDate <= @EndDate
  AND (
      wip.GSClientID IN (SELECT GSClientID FROM GroupClients)
      OR wip.GSTaskID IN (SELECT GSTaskID FROM GroupTasks)
  )
GROUP BY FORMAT(wip.TranDate, 'yyyy-MM')
ORDER BY YearMonth DESC;


