# Database Schema Management Scripts

This directory contains scripts to manage and enforce your Azure SQL database schema.

## Quick Reference

```bash
# Validate database schema (read-only)
bun run db:validate

# Sync database to match Prisma schema (development)
bun run db:sync

# Push schema directly (fast, for dev only)
bun run db:sync:push

# Use migrations (safe, for production)
bun run db:sync:migrate
```

## Scripts

### 1. `validate-db-schema.ts` ✅

**Purpose:** Validates that your database schema matches your Prisma schema without making changes.

**Usage:**
```bash
bun scripts/validate-db-schema.ts
# OR
bun run db:validate
```

**What it checks:**
- Prisma schema syntax is valid
- Migration status (pending migrations, schema drift)
- Database connection works

**When to use:**
- Before deploying to production
- In CI/CD pipelines
- To detect schema drift

**Safe:** ✅ Read-only, makes no changes

---

### 2. `sync-db-to-schema.ts` 🔄

**Purpose:** Enforces that your Azure SQL database structure matches your Prisma schema.

**Two modes:**

#### Mode 1: DB Push (Development) ⚡

Fast and convenient for local development.

```bash
bun scripts/sync-db-to-schema.ts --mode=push
# OR
bun run db:sync:push
```

**Characteristics:**
- ✅ Fast and simple
- ✅ No migration files needed
- ⚠️ Can lose data if schema changes are incompatible
- ⚠️ Blocked on production (requires `--force`)

**Use when:**
- Rapid prototyping in development
- Local database experiments
- Schema is still changing frequently

#### Mode 2: Migrations (Production) 🛡️

Safe, trackable schema changes with history.

```bash
bun scripts/sync-db-to-schema.ts --mode=migrate
# OR
bun run db:sync:migrate
```

**Options:**
1. **Create new migration** - Generates migration from schema changes
2. **Deploy pending migrations** - Applies unapplied migrations
3. **Reset database** - Drops and recreates (⚠️ DESTRUCTIVE)

**Characteristics:**
- ✅ Safe for production
- ✅ Preserves data
- ✅ Trackable history (`prisma/migrations/`)
- ✅ Reversible (can rollback)

**Use when:**
- Deploying to production
- Team collaboration (share migrations via git)
- Schema needs audit trail

---

## Decision Tree

```
Need to sync database to schema?
│
├─ Development environment?
│  └─ Use: bun run db:sync:push
│     (Fast, no migration files)
│
└─ Production or staging?
   └─ Use: bun run db:sync:migrate
      (Safe, creates migration history)
```

## Safety Features

### Production Protection

Both scripts detect production databases and require extra confirmation:

- **DB Push**: Requires `--force` flag and typing "CONFIRM PRODUCTION PUSH"
- **DB Reset**: Requires `--force` flag and typing "CONFIRM RESET"

### Pre-flight Checks

- DATABASE_URL validation
- Environment detection (prod vs dev)
- Migration status check
- Explicit confirmations

## Common Workflows

### Development Workflow (Fast Iteration)

```bash
# 1. Modify schema.prisma
vim prisma/schema.prisma

# 2. Push changes to local database
bun run db:sync:push

# 3. Regenerate Prisma Client (done automatically)
# Your app now works with new schema
```

### Production Workflow (Safe Deployment)

```bash
# 1. Modify schema.prisma locally
vim prisma/schema.prisma

# 2. Test locally with db push
bun run db:sync:push

# 3. Create migration for production
bun run db:sync:migrate
# Choose option 1: Create new migration
# Enter name: "add_user_roles"

# 4. Commit migration to git
git add prisma/migrations/
git commit -m "Add user roles migration"

# 5. Deploy to production
# Migration runs automatically via:
# npx prisma migrate deploy
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Validate Database Schema
  run: bun run db:validate

- name: Deploy Migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Environment Variables

All scripts require:

```bash
DATABASE_URL="sqlserver://fm-sql-server.database.windows.net:1433;..."
```

The scripts auto-detect production environments by checking for:
- `prod` in the connection string
- `production` in the connection string

## Troubleshooting

### Schema Drift Detected

```bash
# Check what's different
bun run db:validate

# Option 1: Pull database schema to Prisma
npx prisma db pull

# Option 2: Push Prisma schema to database
bun run db:sync:push
```

### Pending Migrations

```bash
# See which migrations are pending
npx prisma migrate status

# Deploy them
bun run db:sync:migrate
# Choose option 2: Deploy pending migrations
```

### Connection Issues

```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin <<< "SELECT 1"
```

## Best Practices

1. **Development:** Use `db:sync:push` for speed
2. **Production:** Always use migrations (`db:sync:migrate`)
3. **Before Deploy:** Run `db:validate` to catch issues
4. **Commit Migrations:** Always commit `prisma/migrations/` to git
5. **Review Changes:** Check migration SQL before applying to prod
6. **Backup First:** Backup production database before major schema changes

## File Locations

- **Scripts:** `/scripts/`
- **Prisma Schema:** `/prisma/schema.prisma`
- **Migrations:** `/prisma/migrations/`
- **Package Scripts:** `package.json`

## Related Commands

```bash
# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Format Prisma schema
npx prisma format

# Validate Prisma schema
npx prisma validate

# Check migration status
npx prisma migrate status

# Pull schema from database
npx prisma db pull
```
