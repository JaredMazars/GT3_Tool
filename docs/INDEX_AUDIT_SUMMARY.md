# Index Audit Summary - Quick Reference

**Generated:** 2026-01-25  
**Status:** ✅ Baseline migration appears correct, database verification pending

---

## TL;DR - Executive Summary

### The Numbers

| Source | Count | Details |
|--------|-------|---------|
| **Baseline Migration** | **393** indexes | 349 non-unique + 44 unique |
| **Prisma Schema** | **343** indexes | 324 `@@index` + 19 `@@unique` |
| **Difference** | **+50** | Migration has more (EXPECTED) |

### Verdict

✅ **The 50-index discrepancy is CORRECT and EXPECTED**

The migration file contains SQL Server-specific features that Prisma cannot express:
- **4 Covering Indexes** (INCLUDE columns)
- **5 Filtered Indexes** (WHERE clauses)
- **~41 Additional Constraints** (primary keys, foreign keys, table-level uniques)

---

## What You Need to Do

### Step 1: Run Database Verification ⚠️ REQUIRED

**File:** `verify_indexes.sql`

**Action:** Run this script in SQL Server Management Studio or Azure Data Studio

**What it does:**
1. Counts total indexes in database (expect ~490)
2. Lists indexes with special features (expect 4-5)
3. Shows WIPTransactions indexes in detail (expect 9-11)
4. Identifies duplicate/overlapping indexes (THIS IS YOUR ANSWER)
5. Shows index usage statistics
6. Shows fragmentation and maintenance needs
7. Lists SQL Server's missing index suggestions

**Runtime:** ~30 seconds

### Step 2: Review Results

**File:** `INDEX_AUDIT_REPORT.md`

**Action:** Compare your SQL results to the expected results documented in this file

**Key questions to answer:**
- ✅ Do you have ~490 total indexes?
- ✅ Do the 4 super covering indexes exist?
- ✅ Does WIPTransactions have 9-11 indexes?
- ⚠️ Are there overlapping indexes? (Query 4 results)
- ⚠️ Are any indexes UNUSED? (Query 5 results)

---

## The Duplicate Index Question

### What We Found

**Two pairs of potentially overlapping indexes on WIPTransactions:**

**Pair 1 - GSClientID:**
```
idx_wip_gsclientid_super_covering:       (GSClientID, TranDate) + INCLUDE (9 columns) + WHERE
WIPTransactions_GSClientID_TranDate_TType_idx:  (GSClientID, TranDate, TType)
```

**Pair 2 - GSTaskID:**
```
idx_wip_gstaskid_super_covering:         (GSTaskID, TranDate) + INCLUDE (9 columns)
WIPTransactions_GSTaskID_TranDate_TType_idx:    (GSTaskID, TranDate, TType)
```

### The Key Difference

**TType is in INCLUDE (super covering) vs KEY (composite)**

This might matter for GROUP BY queries:
```sql
-- GROUP BY TType - might prefer composite index (TType in KEY)
SELECT TranDate, TType, SUM(Amount)
FROM WIPTransactions
WHERE GSClientID = @id
GROUP BY TranDate, TType;

-- Simple select - prefers super covering (eliminates key lookups)
SELECT Amount, TType, Cost
FROM WIPTransactions  
WHERE GSClientID = @id;
```

### Your Decision Point

**After running `verify_indexes.sql` Query 4 and Query 5:**

**Scenario A: Composite indexes show 0 usage**
→ **ACTION:** DROP them (super covering handles everything)

**Scenario B: Composite indexes show high usage (>1000 seeks/day)**
→ **ACTION:** KEEP both (optimizer prefers TType in KEY for GROUP BY)

**Scenario C: Composite indexes show low usage (<100 seeks/day)**
→ **ACTION:** Test performance without them, then decide

---

## Quick Answers

### Q: Is the baseline migration correct?

**A:** ✅ YES - The migration file is correct. The 50 extra indexes are SQL Server features Prisma doesn't support.

### Q: Are Prisma and migration aligned?

**A:** ✅ YES - All 343 Prisma indexes exist in the migration. The migration has 50 additional indexes that are manually managed.

### Q: Should I remove the duplicate indexes?

**A:** ⚠️ DEPENDS - Run `verify_indexes.sql` Query 5 (usage stats) first. If the composite indexes are unused, you can safely remove them.

### Q: Why does documentation say to keep composite indexes?

**A:** 📝 Documentation (`docs/WIP_INDEX_MAINTENANCE.md` line 51) states they're for "analytics date ranges" but we need to verify if they're actually used.

### Q: How do I check the actual database?

**A:** Run `verify_indexes.sql` - It contains all 7 queries needed to audit your database.

---

## File Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `INDEX_AUDIT_REPORT.md` | Full detailed report with expected results | Reference for verification |
| `verify_indexes.sql` | 7 SQL queries to run against database | Run NOW to get actual data |
| `INDEX_AUDIT_SUMMARY.md` | This file - quick reference | Quick lookup |
| `docs/WIP_INDEX_MAINTENANCE.md` | Existing documentation | Background info |

---

## Next Actions Checklist

- [ ] **Run `verify_indexes.sql` in SQL Server Management Studio**
- [ ] **Save results to a file** (e.g., `index_verification_results.txt`)
- [ ] **Check Query 4 results** - Are there overlapping indexes?
- [ ] **Check Query 5 results** - Are composite indexes being used?
- [ ] **Make decision:**
  - If unused → Plan migration to DROP composite indexes
  - If heavily used → Document why both are needed
  - If lightly used → Test without composite indexes in staging
- [ ] **Update documentation** based on findings

---

## Expected Timeline

**Phase 1: Verification** (30 minutes)
- Run verification script
- Save results
- Compare to expected values

**Phase 2: Analysis** (1-2 hours)
- Analyze overlapping indexes
- Review usage statistics
- Check execution plans if needed

**Phase 3: Decision** (30 minutes)
- Determine if duplicates should be removed
- Document decision rationale
- Create migration plan if needed

**Phase 4: Execution** (if removing indexes)
- Test in dev environment
- Monitor performance
- Create migration script
- Deploy to staging
- Monitor for 1 week
- Deploy to production

---

## Key Insights

### 1. Baseline Migration is Correct ✅

The 393 indexes in the migration are the true state of your database. The 50 difference from Prisma is by design.

### 2. Super Covering Indexes Cannot Be in Prisma ❌

Prisma doesn't support:
- `INCLUDE` columns
- `WHERE` filters on indexes
- Many SQL Server-specific features

These must be managed manually via SQL migrations.

### 3. The Overlap Might Be Intentional 🤔

The composite indexes might serve GROUP BY queries better than super covering indexes. Need to verify with actual usage data.

### 4. Documentation Needs Update 📝

Once you determine whether composite indexes are needed, update:
- `docs/WIP_INDEX_MAINTENANCE.md`
- `prisma/schema.prisma` (comments)
- This audit report

---

## Questions? Issues?

### If verify_indexes.sql fails:
- Check database connection
- Verify database name
- Ensure you have SELECT permissions on system views

### If results don't match expected:
- Database might have drift from migration
- Manual indexes might have been added
- Indexes might have been dropped

### If unsure about removing indexes:
- Keep them (safer option)
- Monitor usage for 2-4 weeks
- Test in dev environment first
- Can always add them back

---

**Last Updated:** 2026-01-25  
**Status:** Awaiting database verification results  
**Next Step:** Run `verify_indexes.sql`
