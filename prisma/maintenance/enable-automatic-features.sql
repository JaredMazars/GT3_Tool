-- ============================================================================
-- Azure SQL Database Automatic Maintenance Configuration
-- ============================================================================
-- This script enables native Azure SQL features for automatic maintenance
-- Run this ONCE on your production database to enable automatic tuning
--
-- Database: gt3-db
-- Server: gt3-sql-server
-- Resource Group: rg-fmza-gt3
-- ============================================================================

PRINT '========================================';
PRINT 'Enabling Azure SQL Automatic Features';
PRINT '========================================';
PRINT '';

-- ============================================================================
-- 1. ENABLE AUTOMATIC TUNING (Index Management & Query Plan Protection)
-- ============================================================================
PRINT '1. Enabling Automatic Tuning...';

ALTER DATABASE CURRENT
SET AUTOMATIC_TUNING = CUSTOM (
    FORCE_LAST_GOOD_PLAN = ON,  -- Auto-revert to last good query plan on regression
    CREATE_INDEX = ON,            -- Auto-create beneficial indexes based on workload
    DROP_INDEX = ON               -- Auto-remove duplicate/unused indexes
);

PRINT '   ✓ Automatic Tuning enabled';
PRINT '     - FORCE_LAST_GOOD_PLAN: ON';
PRINT '     - CREATE_INDEX: ON';
PRINT '     - DROP_INDEX: ON';
PRINT '';

-- ============================================================================
-- 2. ENABLE ASYNCHRONOUS STATISTICS UPDATES
-- ============================================================================
PRINT '2. Enabling Asynchronous Statistics Updates...';

ALTER DATABASE CURRENT
SET AUTO_UPDATE_STATISTICS_ASYNC ON;

PRINT '   ✓ Async statistics updates enabled';
PRINT '     - Queries will not block waiting for statistics updates';
PRINT '';

-- ============================================================================
-- 3. SET LOW PRIORITY FOR STATISTICS UPDATES
-- ============================================================================
PRINT '3. Setting Low Priority for Statistics Updates...';

ALTER DATABASE SCOPED CONFIGURATION
SET ASYNC_STATS_UPDATE_WAIT_AT_LOW_PRIORITY = ON;

PRINT '   ✓ Low priority stats updates enabled';
PRINT '     - Reduces lock contention during stats updates';
PRINT '';

-- ============================================================================
-- 4. ENSURE QUERY STORE IS ENABLED (Required for Automatic Tuning)
-- ============================================================================
PRINT '4. Configuring Query Store...';

-- Check current Query Store status
DECLARE @QueryStoreStatus NVARCHAR(50);
SELECT @QueryStoreStatus = actual_state_desc 
FROM sys.database_query_store_options;

IF @QueryStoreStatus = 'OFF'
BEGIN
    ALTER DATABASE CURRENT
    SET QUERY_STORE = ON (
        OPERATION_MODE = READ_WRITE,
        CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
        QUERY_CAPTURE_MODE = AUTO,
        MAX_STORAGE_SIZE_MB = 1024,
        INTERVAL_LENGTH_MINUTES = 60
    );
    PRINT '   ✓ Query Store enabled';
END
ELSE
BEGIN
    PRINT '   ✓ Query Store already enabled';
    PRINT '     Current status: ' + @QueryStoreStatus;
END
PRINT '';

-- ============================================================================
-- 5. VERIFY CONFIGURATION
-- ============================================================================
PRINT '========================================';
PRINT 'Configuration Verification';
PRINT '========================================';
PRINT '';

-- Check Automatic Tuning settings
PRINT 'Automatic Tuning Settings:';
PRINT '----------------------------------------';
SELECT 
    name AS Feature,
    desired_state_desc AS DesiredState,
    actual_state_desc AS ActualState,
    reason_desc AS Reason
FROM sys.database_automatic_tuning_options;

-- Check Query Store settings
PRINT '';
PRINT 'Query Store Settings:';
PRINT '----------------------------------------';
SELECT 
    actual_state_desc AS Status,
    readonly_reason AS ReadOnlyReason,
    current_storage_size_mb AS CurrentSizeMB,
    max_storage_size_mb AS MaxSizeMB,
    query_capture_mode_desc AS CaptureMode
FROM sys.database_query_store_options;

-- Check statistics settings
PRINT '';
PRINT 'Statistics Settings:';
PRINT '----------------------------------------';
SELECT 
    'AUTO_UPDATE_STATISTICS' AS Setting,
    CASE WHEN is_auto_update_stats_on = 1 THEN 'ON' ELSE 'OFF' END AS Status
FROM sys.databases 
WHERE database_id = DB_ID();

SELECT 
    'AUTO_UPDATE_STATISTICS_ASYNC' AS Setting,
    CASE WHEN is_auto_update_stats_async_on = 1 THEN 'ON' ELSE 'OFF' END AS Status
FROM sys.databases 
WHERE database_id = DB_ID();

PRINT '';
PRINT '========================================';
PRINT '✓ Configuration Complete!';
PRINT '========================================';
PRINT '';
PRINT 'What happens next:';
PRINT '  1. Azure will monitor your workload patterns';
PRINT '  2. Automatic Tuning recommendations will appear in Azure Portal';
PRINT '  3. Beneficial indexes will be auto-created and validated';
PRINT '  4. Poor-performing indexes will be auto-removed';
PRINT '  5. Query plan regressions will be auto-reverted';
PRINT '';
PRINT 'To view recommendations:';
PRINT '  Azure Portal → gt3-db → Automatic Tuning blade';
PRINT '';
PRINT 'To monitor Query Store performance:';
PRINT '  Azure Portal → gt3-db → Query Performance Insight';
PRINT '';
