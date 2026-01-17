# Azure SQL Database Maintenance Scripts

Automated maintenance scripts for **gt3-db** Azure SQL Database.

## Overview

This directory contains SQL scripts to enable and maintain Azure SQL Database automatic features:

- **Automatic Index Management** - Azure creates/drops indexes based on workload
- **Query Plan Protection** - Auto-revert bad query plans
- **Background Statistics Updates** - Non-blocking statistics updates
- **Index Fragmentation Monitoring** - Quarterly health checks

## Quick Start

### 1. Enable Automatic Features (Run Once)

**Script:** `enable-automatic-features.sql`  
**When:** Run this once on your production database  
**Duration:** ~30 seconds  
**Impact:** Zero downtime, enables Azure's native automatic tuning

```bash
# Option A: Via Azure Portal Query Editor
# 1. Go to Azure Portal → gt3-db → Query editor
# 2. Paste contents of enable-automatic-features.sql
# 3. Click Run

# Option B: Via Azure CLI
az sql db query \
  --server gt3-sql-server \
  --database gt3-db \
  --resource-group rg-fmza-gt3 \
  --file ./enable-automatic-features.sql

# Option C: Via Azure Data Studio
# 1. Connect to gt3-sql-server → gt3-db
# 2. Open enable-automatic-features.sql
# 3. Execute (F5)
```

**What This Enables:**
- ✅ Automatic index creation/removal based on workload patterns
- ✅ Query plan regression protection (auto-revert bad plans)
- ✅ Asynchronous statistics updates (no query blocking)
- ✅ Query Store for performance monitoring

**Verify:**
After running, check Azure Portal → gt3-db → Automatic Tuning blade to see status and recommendations.

---

### 2. Quarterly Health Check (Every 3 Months)

**Script:** `check-database-health.sql`  
**When:** Run every 3 months (or when investigating performance issues)  
**Duration:** 2-5 minutes  
**Impact:** Read-only queries, no performance impact

```bash
# Run via Azure Portal, CLI, or Azure Data Studio (same as above)
az sql db query \
  --server gt3-sql-server \
  --database gt3-db \
  --resource-group rg-fmza-gt3 \
  --file ./check-database-health.sql
```

**What It Checks:**
1. **Index Fragmentation** - Identifies indexes needing rebuild/reorganize
2. **Statistics Age** - Shows stale statistics (>30 days old)
3. **Automatic Tuning Status** - Verifies automatic features are working
4. **Query Store Health** - Checks Query Store storage and status
5. **Database Size** - Monitors growth and capacity

**Interpreting Results:**

| Fragmentation | Action Needed |
|---------------|---------------|
| < 10% | ✅ No action needed |
| 10-30% | ⚠️ Consider reorganizing if performance issues exist |
| > 30% | ⚠️ Run `rebuild-fragmented-indexes.sql` |

**Recommended Schedule:**
- January 15
- April 15
- July 15
- October 15

---

### 3. Index Rebuild (Only If Needed)

**Script:** `rebuild-fragmented-indexes.sql`  
**When:** Only if health check shows >30% fragmentation  
**Duration:** 10 minutes - 2 hours (depends on database size)  
**Impact:** Runs during maintenance window, may cause brief locks

⚠️ **Important:** Only run this if `check-database-health.sql` shows high fragmentation.

```bash
# Run during off-peak hours (recommended: Sunday 2:00 AM)
az sql db query \
  --server gt3-sql-server \
  --database gt3-db \
  --resource-group rg-fmza-gt3 \
  --file ./rebuild-fragmented-indexes.sql
```

**What It Does:**
- **Rebuilds** indexes with >30% fragmentation (creates new index, removes old one)
- **Reorganizes** indexes with 10-30% fragmentation (defragments in-place)
- **Skips** indexes with <10% fragmentation
- **Provides** detailed progress and timing information

**Best Practices:**
- Run during maintenance window (low traffic period)
- Monitor execution via Azure Portal → Query Performance Insight
- Expected to run 1-2 times per year (fragmentation builds slowly)

---

## Maintenance Schedule

### One-Time Setup
- [ ] Run `enable-automatic-features.sql` (5 minutes)
- [ ] Verify in Azure Portal → Automatic Tuning blade

### Quarterly (Every 3 Months)
- [ ] Run `check-database-health.sql` (5 minutes)
- [ ] Review results for fragmentation and statistics issues
- [ ] If >30% fragmentation: Schedule index rebuild during maintenance window

### As Needed
- [ ] Run `rebuild-fragmented-indexes.sql` (only if health check shows issues)

---

## Connection Methods

### Method 1: Azure Portal Query Editor (Easiest)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: SQL databases → gt3-db
3. Click "Query editor" in left menu
4. Authenticate with admin credentials
5. Paste SQL script and click "Run"

**Pros:** No tools needed, web-based  
**Cons:** Large result sets may be truncated

### Method 2: Azure CLI (Automation-Friendly)

```bash
# Prerequisites: Azure CLI installed and logged in
az login

# Run script
az sql db query \
  --server gt3-sql-server \
  --database gt3-db \
  --resource-group rg-fmza-gt3 \
  --file ./script-name.sql
```

**Pros:** Scriptable, good for automation  
**Cons:** Requires Azure CLI installation

### Method 3: Azure Data Studio (Best for Development)

1. Download [Azure Data Studio](https://docs.microsoft.com/sql/azure-data-studio/download)
2. Connect to: `gt3-sql-server.database.windows.net`
3. Database: `gt3-db`
4. Authentication: Azure Active Directory or SQL Authentication
5. Open SQL file and press F5 to execute

**Pros:** Full IDE, great result visualization, IntelliSense  
**Cons:** Requires tool installation

### Method 4: From CI/CD Pipeline

Add to `.github/workflows/azure-deploy.yml`:

```yaml
- name: Run Database Health Check (Monthly)
  if: github.event.schedule == '0 0 1 * *'  # First of every month
  run: |
    az sql db query \
      --server gt3-sql-server \
      --database gt3-db \
      --resource-group rg-fmza-gt3 \
      --file ./prisma/maintenance/check-database-health.sql
```

---

## Monitoring Automatic Tuning

### View Automatic Tuning Recommendations

**Azure Portal:**
1. Go to SQL databases → gt3-db
2. Click "Automatic Tuning" in left menu
3. View recommendations and actions taken

**T-SQL Query:**
```sql
SELECT 
    reason,
    score,
    state_desc,
    last_refresh,
    details
FROM sys.dm_db_tuning_recommendations
WHERE state_desc = 'Active'
ORDER BY score DESC;
```

### Monitor Query Performance

**Azure Portal:**
1. Go to SQL databases → gt3-db
2. Click "Query Performance Insight"
3. View top queries, resource consumption, and trends

---

## Troubleshooting

### Automatic Tuning Not Showing Recommendations

**Possible Causes:**
- Query Store is not enabled → Run `enable-automatic-features.sql`
- Not enough workload data collected → Wait 24-48 hours after enabling
- Database tier doesn't support Automatic Tuning → Verify you're on GeneralPurpose or higher

**Check Status:**
```sql
SELECT * FROM sys.database_automatic_tuning_options;
```

### Health Check Script Times Out

**Solution:** Run script during off-peak hours. Fragmentation analysis can take 5-10 minutes on large databases.

### Index Rebuild Script Fails

**Common Errors:**
- **Insufficient permissions** → Requires `db_ddladmin` role
- **Long-running transactions** → Run during maintenance window
- **Out of space** → Index rebuild requires temp space (ensure sufficient capacity)

**Check Permissions:**
```sql
SELECT * FROM sys.database_principals 
WHERE name = USER_NAME();
```

---

## FAQ

### Q: Do I need to disable Automatic Tuning before running index rebuild?
**A:** No, they work independently. Automatic Tuning creates new indexes; rebuild script maintains existing ones.

### Q: How often should I run the health check?
**A:** Every 3 months is sufficient. Fragmentation builds slowly over time.

### Q: Will Automatic Tuning solve all performance issues?
**A:** No. It helps with index optimization, but you still need to:
- Design proper indexes for complex queries
- Monitor and optimize slow queries
- Review query plans regularly
- Run index maintenance for fragmentation

### Q: Can I automate the index rebuild?
**A:** Yes, but defer until health checks prove it's necessary. Options:
- Azure Functions (Consumption plan)
- Azure Container Apps Scheduled Job
- GitHub Actions cron job

### Q: What's the cost of Automatic Tuning?
**A:** $0 - It's included with GeneralPurpose tier and higher.

---

## Related Documentation

- [Azure SQL Automatic Tuning](https://learn.microsoft.com/azure/azure-sql/database/automatic-tuning-overview)
- [Query Store](https://learn.microsoft.com/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store)
- [Index Maintenance Best Practices](https://learn.microsoft.com/sql/relational-databases/indexes/reorganize-and-rebuild-indexes)

---

## Database Information

- **Server:** gt3-sql-server
- **Database:** gt3-db
- **Resource Group:** rg-fmza-gt3
- **Tier:** GeneralPurpose (Gen5, 1 vCore)
- **Location:** South Africa North
