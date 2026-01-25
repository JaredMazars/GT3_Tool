-- ============================================================================
-- Post-Deployment Verification
-- Run this in SQL Server Management Studio to verify migration success
-- ============================================================================

-- Query 1: Check that duplicate indexes were removed
SELECT 
    name AS IndexName,
    type_desc AS IndexType,
    is_unique AS IsUnique,
    has_filter AS HasFilter
FROM sys.indexes
WHERE object_id = OBJECT_ID('WIPTransactions')
AND (name LIKE '%GSClientID%' OR name LIKE '%GSTaskID%')
ORDER BY name;

-- Expected Results:
-- ✅ idx_wip_gsclientid_super_covering - NONCLUSTERED, HasFilter=1
-- ✅ idx_wip_gstaskid_super_covering - NONCLUSTERED, HasFilter=0
-- ❌ WIPTransactions_GSClientID_TranDate_TType_idx - SHOULD NOT APPEAR
-- ❌ WIPTransactions_GSTaskID_TranDate_TType_idx - SHOULD NOT APPEAR

-- Query 2: Count total indexes on WIPTransactions
SELECT COUNT(*) AS TotalIndexes
FROM sys.indexes
WHERE object_id = OBJECT_ID('WIPTransactions')
AND name IS NOT NULL;

-- Expected: 7-9 indexes (down from 9-11)

-- Query 3: Check index usage for super covering indexes
SELECT 
    i.name AS IndexName,
    s.user_seeks AS Seeks,
    s.user_scans AS Scans,
    s.user_lookups AS Lookups,
    s.last_user_seek AS LastSeek
FROM sys.dm_db_index_usage_stats s
JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE OBJECT_NAME(s.object_id) = 'WIPTransactions'
AND i.name LIKE '%super_covering%'
ORDER BY s.user_seeks DESC;
