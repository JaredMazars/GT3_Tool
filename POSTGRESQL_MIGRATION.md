# PostgreSQL Migration Guide

This guide walks you through migrating from SQLite (development) to PostgreSQL (production).

## Why PostgreSQL?

PostgreSQL is recommended for production because:
- Better performance for concurrent users
- More robust transaction handling
- Superior indexing capabilities
- Better support for JSON operations
- Industry-standard for production applications

## Prerequisites

- PostgreSQL 12+ installed
- Database user with CREATE DATABASE permissions
- Backup of existing SQLite data (if migrating existing data)

## Step 1: Install PostgreSQL

### macOS (using Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

## Step 2: Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE mapper_production;

# Create user (if needed)
CREATE USER mapper_user WITH ENCRYPTED PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mapper_production TO mapper_user;

# Exit psql
\q
```

## Step 3: Update Environment Variables

Update your `.env` file or production environment:

```bash
# Replace this:
DATABASE_URL="file:./prisma/dev.db"

# With this:
DATABASE_URL="postgresql://mapper_user:your_secure_password@localhost:5432/mapper_production?schema=public"
```

### Connection String Format
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

### For Cloud Providers

#### Heroku
```
DATABASE_URL="<provided by Heroku>"
```

#### Railway
```
DATABASE_URL="<provided by Railway>"
```

#### Supabase
```
DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

#### Azure Database for PostgreSQL
```
DATABASE_URL="postgresql://<user>@<server>:<password>@<server>.postgres.database.azure.com:5432/<database>?ssl=true"
```

#### AWS RDS
```
DATABASE_URL="postgresql://<user>:<password>@<endpoint>:5432/<database>"
```

## Step 4: Update Prisma Schema (if needed)

The `schema.prisma` file is already configured to work with both SQLite and PostgreSQL. However, verify the datasource configuration:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

## Step 5: Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify migrations
npx prisma migrate status
```

## Step 6: Migrate Data (Optional)

If you have existing data in SQLite that you want to migrate:

### Option A: Export/Import via SQL

```bash
# Export from SQLite
sqlite3 prisma/dev.db .dump > export.sql

# Manually edit export.sql to make it PostgreSQL-compatible
# Remove SQLite-specific syntax
# Update data types if needed

# Import to PostgreSQL
psql -U mapper_user -d mapper_production -f export.sql
```

### Option B: Use a migration script

Create `scripts/migrate-data.ts`:

```typescript
import { PrismaClient as PrismaClientSQLite } from '@prisma/client';
import { PrismaClient as PrismaClientPostgres } from '@prisma/client';

const sqlite = new PrismaClientSQLite({
  datasources: { db: { url: 'file:./prisma/dev.db' } }
});

const postgres = new PrismaClientPostgres({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function migrate() {
  // Migrate projects
  const projects = await sqlite.project.findMany();
  for (const project of projects) {
    await postgres.project.create({ data: project });
  }
  
  // Migrate other tables...
  
  console.log('Migration complete!');
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  });
```

Run the script:
```bash
npx ts-node scripts/migrate-data.ts
```

## Step 7: Test the Connection

```bash
# Open Prisma Studio to verify data
npx prisma studio

# Or test with a simple query
npx prisma db execute --stdin <<EOF
SELECT * FROM "Project" LIMIT 1;
EOF
```

## Step 8: Update Application Code

No code changes should be needed if you've been using Prisma correctly. However, verify:

1. All Prisma queries work correctly
2. Test all API endpoints
3. Verify file uploads work
4. Test AI suggestions generation
5. Check export functionality

## Performance Optimization

### Add Indexes

The schema already includes indexes, but you can add more for specific queries:

```sql
-- Add custom indexes
CREATE INDEX idx_project_status_archived ON "Project" (status, archived);
CREATE INDEX idx_adjustment_type_status ON "TaxAdjustment" (type, status);
```

### Configure Connection Pooling

For production, configure connection pooling in your DATABASE_URL:

```
DATABASE_URL="postgresql://user:password@host:5432/database?connection_limit=10"
```

Or use PgBouncer for external connection pooling.

### Vacuum and Analyze

Regularly run maintenance:

```sql
VACUUM ANALYZE;
```

## Backup Strategy

### Automated Backups

```bash
# Daily backup script
pg_dump -U mapper_user mapper_production > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U mapper_user mapper_production < backup_20250114.sql
```

### Continuous Archiving

Enable PostgreSQL WAL archiving for point-in-time recovery:

```bash
# In postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql "postgresql://mapper_user:password@localhost:5432/mapper_production"

# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # macOS

# Check logs
tail -f /var/log/postgresql/postgresql-*.log  # Linux
tail -f /usr/local/var/log/postgres.log  # macOS
```

### Migration Errors

```bash
# Reset migrations (CAUTION: deletes data)
npx prisma migrate reset

# Resolve migration issues
npx prisma migrate resolve --applied <migration-name>

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration-name>
```

### Performance Issues

```sql
-- Check slow queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

## Security Best Practices

1. **Use Strong Passwords**: Generate secure passwords for database users
2. **SSL Connections**: Enable SSL for remote connections
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
   ```
3. **Firewall Rules**: Restrict database access to application servers only
4. **Regular Updates**: Keep PostgreSQL updated with security patches
5. **Audit Logging**: Enable PostgreSQL audit logging for security monitoring

## Rollback Plan

If you need to rollback to SQLite:

1. Update `.env`:
   ```bash
   DATABASE_URL="file:./prisma/dev.db"
   ```

2. Update `schema.prisma`:
   ```prisma
   provider = "sqlite"
   ```

3. Run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

## Production Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created with proper user permissions
- [ ] Environment variables updated
- [ ] Migrations run successfully
- [ ] Data migrated (if applicable)
- [ ] Application tested end-to-end
- [ ] Backup strategy implemented
- [ ] Connection pooling configured
- [ ] SSL enabled for remote connections
- [ ] Monitoring set up
- [ ] Performance optimizations applied

## Additional Resources

- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Connection Pooling with PgBouncer](https://www.pgbouncer.org/)

## Support

If you encounter issues:
1. Check PostgreSQL logs
2. Verify connection string format
3. Ensure PostgreSQL service is running
4. Check firewall/security group settings
5. Review Prisma migration status



