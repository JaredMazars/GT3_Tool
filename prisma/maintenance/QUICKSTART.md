# Quick Start: Enable Azure SQL Automatic Maintenance

## ✅ Step 1: Run the Enable Script (5 minutes)

You need to execute `enable-automatic-features.sql` on your **gt3-db** database.

### Option A: Azure Portal Query Editor (Recommended - Easiest)

1. **Open Azure Portal**: https://portal.azure.com
2. **Navigate to your database**:
   - Click "SQL databases" in the left menu
   - Click "gt3-db"
3. **Open Query Editor**:
   - Click "Query editor" in the left menu
   - Authenticate with your database credentials
4. **Run the script**:
   - Open this file: `prisma/maintenance/enable-automatic-features.sql`
   - Copy all contents
   - Paste into Query Editor
   - Click "Run"
5. **Review output**:
   - You should see confirmation messages
   - Verify all features show as "ON"

### Option B: Azure Data Studio (If you have it installed)

1. **Download Azure Data Studio** (if not installed):
   - https://docs.microsoft.com/sql/azure-data-studio/download
2. **Connect to database**:
   - Server: `gt3-sql-server.database.windows.net`
   - Database: `gt3-db`
   - Authentication: Azure Active Directory or SQL Authentication
3. **Run the script**:
   - Open: `prisma/maintenance/enable-automatic-features.sql`
   - Press F5 or click "Run"
4. **Review output** in the Results pane

### Option C: Using sqlcmd (If installed)

```bash
# First, install sqlcmd if not available:
# brew install sqlcmd  # macOS
# Or download from: https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility

# Then run:
sqlcmd -S gt3-sql-server.database.windows.net \
  -d gt3-db \
  -U <your-username> \
  -P <your-password> \
  -i /Users/walter.blake/Documents/development/mapper/prisma/maintenance/enable-automatic-features.sql
```

---

## ✅ Step 2: Verify in Azure Portal (2 minutes)

1. **Go to Azure Portal** → SQL databases → gt3-db
2. **Click "Automatic Tuning"** in the left menu
3. **Verify settings**:
   - Force last good plan: ✓ ON
   - Create index: ✓ ON
   - Drop index: ✓ ON

**Note:** It may take 24-48 hours for Azure to analyze your workload and show first recommendations.

---

## ✅ Step 3: Schedule Quarterly Health Checks

Add to your calendar (every 3 months):
- **January 15** - Run health check
- **April 15** - Run health check
- **July 15** - Run health check
- **October 15** - Run health check

**What to do:**
1. Run `check-database-health.sql` via Azure Portal Query Editor
2. Review fragmentation levels
3. If >30% fragmentation exists, schedule index rebuild during maintenance window

---

## Database Connection Details

- **Server:** gt3-sql-server.database.windows.net
- **Database:** gt3-db
- **Resource Group:** rg-fmza-gt3
- **Location:** South Africa North
- **Tier:** GeneralPurpose (Gen5, 1 vCore)

---

## What Happens After Enabling?

### Immediately:
- ✅ Query Store starts tracking query performance
- ✅ Statistics updates happen in background (no query blocking)
- ✅ Query plan regressions are automatically reverted

### Within 24-48 hours:
- ✅ Azure analyzes your workload patterns
- ✅ Automatic Tuning recommendations appear in Azure Portal
- ✅ Beneficial indexes are identified

### Within 1 week:
- ✅ Azure may auto-create first recommended indexes
- ✅ Index performance is validated automatically
- ✅ Poor-performing indexes are auto-removed

---

## Need Help?

See full documentation: `prisma/maintenance/README.md`

**Common Issues:**
- **Can't connect?** Check firewall rules in Azure Portal → SQL Server → Firewalls and virtual networks
- **Authentication failed?** Verify you have db_owner or db_ddladmin role
- **Script timeout?** Try Azure Portal Query Editor instead of Azure Data Studio

---

## Summary

**Created Files:**
- ✅ `enable-automatic-features.sql` - Run once to enable automatic tuning
- ✅ `check-database-health.sql` - Run quarterly to monitor health
- ✅ `rebuild-fragmented-indexes.sql` - Run only if health check shows >30% fragmentation
- ✅ `README.md` - Complete documentation

**Next Action:**
👉 **Run `enable-automatic-features.sql` via Azure Portal Query Editor**

After enabling, your Azure SQL Database will automatically handle most maintenance tasks!
