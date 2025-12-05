# Quick Start: Enforce Database Schema

## TL;DR

Force your Azure SQL database to match your Prisma schema:

```bash
# Development (fast, may lose data)
bun run db:sync:push

# Production (safe, preserves data)
bun run db:sync:migrate
```

## Step-by-Step

### For Development

1. **Check current status:**
   ```bash
   bun run db:validate
   ```

2. **Push schema to database:**
   ```bash
   bun run db:sync:push
   ```
   
3. **Confirm when prompted**

That's it! Your database now matches your Prisma schema.

### For Production

1. **Check current status:**
   ```bash
   bun run db:validate
   ```

2. **Create migration:**
   ```bash
   bun run db:sync:migrate
   ```
   
3. **Choose option 1** (Create new migration)

4. **Enter migration name** (e.g., "enforce_schema_structure")

5. **Commit migration:**
   ```bash
   git add prisma/migrations/
   git commit -m "Enforce database schema structure"
   ```

6. **Deploy to production** (via your CI/CD or manually)

## What These Scripts Do

### `db:validate` (Read-only)
- Checks if database matches Prisma schema
- Shows any drift or pending migrations
- **Safe:** Makes no changes

### `db:sync:push` (Fast, Development)
- Forces database to match Prisma schema
- No migration files
- **Warning:** Can lose data if changes are incompatible

### `db:sync:migrate` (Safe, Production)
- Creates migration from schema changes
- Preserves existing data
- Creates audit trail in `prisma/migrations/`

## When Things Go Wrong

### "Schema drift detected"

Your database doesn't match your Prisma schema.

**Solution:**
```bash
bun run db:sync:push  # For dev
# OR
bun run db:sync:migrate  # For prod
```

### "Pending migrations"

Some migrations haven't been applied to the database.

**Solution:**
```bash
bun run db:sync:migrate
# Choose option 2: Deploy pending migrations
```

### "Can't reach database server"

Connection issue.

**Check:**
```bash
# Is DATABASE_URL set?
echo $DATABASE_URL

# Can you connect?
npx prisma studio
```

## Need More Info?

See [README.md](./README.md) for full documentation.
