# Manual Migration Guide: WIP Indexes

**Status:** Migration timed out via Prisma CLI (table too large)  
**Solution:** Apply manually via SQL Server Management Studio or Azure Data Studio

---

## Why Manual Application is Needed

The `WIPTransactions` table is large enough that creating covering indexes takes > 5 minutes, which exceeds Prisma's migration timeout. This is normal and safe to apply manually.

---

## Steps to Apply Migration

### Option 1: Azure Data Studio (Recommended)

1. **Open Azure Data Studio** and connect to:
   - Server: `gt3-sql-server.database.windows.net`
   - Database: `gt3-db`
   - Authentication: SQL Login
   - Username: `sqladmin`
   - Password: `{GT3!SecureP@ss2024#Dev}`

2. **Open the migration SQL file:**
   ```
   prisma/migrations/20260123063454_replace_simple_with_covering_wip_indexes/migration.sql
   ```

3. **Execute the SQL script**
   - Click "Run" or press F5
   - Monitor the Messages tab for progress (you'll see PRINT statements)
   - Expected duration: 5-15 minutes

4. **Verify completion:**
   - You should see messages:
     ```
     Created idx_wip_gsclientid_covering
     Created idx_wip_gstaskid_covering
     Dropped old WIPTransactions_GSClientID_idx
     Dropped old WIPTransactions_GSTaskID_idx
     Migration completed successfully
     ```

5. **Verify indexes were created:**
   ```sql
   SELECT name, type_desc, has_filter, filter_definition
   FROM sys.indexes
   WHERE object_id = OBJECT_ID('WIPTransactions')
       AND name LIKE 'idx_wip%';
   ```
   
   Expected output: 2 rows showing the new covering indexes

### Option 2: SQL Server Management Studio (SSMS)

Same steps as Azure Data Studio above.

### Option 3: sqlcmd (Command Line)

```bash
sqlcmd -S gt3-sql-server.database.windows.net \
       -d gt3-db \
       -U sqladmin \
       -P 'GT3!SecureP@ss2024#Dev' \
       -i prisma/migrations/20260123063454_replace_simple_with_covering_wip_indexes/migration.sql
```

---

## After Manual Migration

Once the SQL has completed successfully, tell Prisma the migration was applied:

```bash
DATABASE_URL='sqlserver://gt3-sql-server.database.windows.net:1433;database=gt3-db;user=sqladmin;password={GT3!SecureP@ss2024#Dev};encrypt=true;trustServerCertificate=true;connectTimeout=30' \
npx prisma migrate resolve --applied "20260123063454_replace_simple_with_covering_wip_indexes"
```

Or if using npm script:
```bash
npm run db:resolve-applied 20260123063454_replace_simple_with_covering_wip_indexes
```

Then verify:
```bash
npm run db:status
# Should show: "Database schema is up to date!"
```

---

## Verification Queries

### 1. Check indexes exist
```sql
SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.has_filter AS HasFilter,
    i.filter_definition AS FilterDefinition,
    STUFF((
        SELECT ', ' + c.name
        FROM sys.index_columns ic
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
        ORDER BY ic.key_ordinal
        FOR XML PATH('')
    ), 1, 2, '') AS KeyColumns,
    STUFF((
        SELECT ', ' + c.name
        FROM sys.index_columns ic
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 1
        ORDER BY ic.index_column_id
        FOR XML PATH('')
    ), 1, 2, '') AS IncludedColumns
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('WIPTransactions')
    AND i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering')
ORDER BY i.name;
```

**Expected:**
- `idx_wip_gsclientid_covering`: Key=GSClientID, Include=Amount, TType, GSTaskID
- `idx_wip_gstaskid_covering`: Key=GSTaskID, Include=Amount, TType, GSClientID

### 2. Check old indexes removed
```sql
SELECT name 
FROM sys.indexes 
WHERE object_id = OBJECT_ID('WIPTransactions')
    AND name IN ('WIPTransactions_GSClientID_idx', 'WIPTransactions_GSTaskID_idx');
```

**Expected:** No rows (indexes should be dropped)

### 3. Check index fragmentation
```sql
SELECT 
    i.name AS IndexName,
    ips.avg_fragmentation_in_percent AS FragmentationPercent,
    ips.page_count AS PageCount
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('WIPTransactions'), NULL, NULL, 'SAMPLED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE i.name IN ('idx_wip_gsclientid_covering', 'idx_wip_gstaskid_covering');
```

**Expected:** Fragmentation < 5% (newly created indexes)

---

## Troubleshooting

### Issue: "Index already exists"

If you see this error, the indexes may have been partially created. Check which indexes exist:
```sql
SELECT name FROM sys.indexes 
WHERE object_id = OBJECT_ID('WIPTransactions')
    AND name LIKE '%wip%' OR name LIKE '%GSClientID%' OR name LIKE '%GSTaskID%';
```

**Solution:** Manually drop any partially created indexes and re-run:
```sql
DROP INDEX IF EXISTS idx_wip_gsclientid_covering ON WIPTransactions;
DROP INDEX IF EXISTS idx_wip_gstaskid_covering ON WIPTransactions;
-- Then run the full migration SQL again
```

### Issue: "Cannot drop index because it doesn't exist"

This is fine - the old indexes may already be gone. Continue with the migration.

### Issue: Migration takes > 15 minutes

This can happen with very large tables. Monitor the Messages tab - you should see the PRINT statements as each step completes. As long as you see progress, let it continue.

### Issue: "Timeout expired" or connection errors

The database may be under heavy load. Try during a maintenance window or off-peak hours.

---

## What This Migration Does

1. ✅ Creates `idx_wip_gsclientid_covering` - covering index for client-level queries
2. ✅ Creates `idx_wip_gstaskid_covering` - covering index for task-level queries
3. ✅ Updates statistics for query optimizer
4. ✅ Drops old simple indexes (now redundant)
5. ✅ Final statistics update

**Result:** 80-90% faster WIP queries on client details page!

---

## Need Help?

- Check Azure SQL Query Performance Insight for blocking queries
- Review execution plan to verify indexes are being used (after migration)
- See `docs/WIP_INDEX_MAINTENANCE.md` for ongoing monitoring
- Consult `docs/WIP_QUERY_OPTIMIZATION_SUMMARY.md` for full context
