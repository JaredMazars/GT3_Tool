#!/bin/bash

# Run Prisma migrations against Azure SQL Database
# This script should be run locally with proper DATABASE_URL set

set -e

echo "========================================="
echo "Running Prisma Migrations"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set DATABASE_URL to your Azure SQL connection string:"
    echo "export DATABASE_URL='sqlserver://...'"
    echo ""
    exit 1
fi

# Show connection info (without password)
echo "Database URL: ${DATABASE_URL%%@*}@[REDACTED]"
echo ""

# Generate Prisma Client
echo "Step 1/2: Generating Prisma Client..."
npx prisma generate

if [[ $? -ne 0 ]]; then
    echo "❌ Prisma generate failed!"
    exit 1
fi
echo "✅ Prisma Client generated"
echo ""

# Run migrations
echo "Step 2/2: Running migrations..."
npx prisma migrate deploy

if [[ $? -ne 0 ]]; then
    echo "❌ Migrations failed!"
    exit 1
fi
echo "✅ Migrations completed successfully"
echo ""

# Verify tables exist
echo "Verifying database schema..."
npx prisma db pull --force 2>&1 | grep -q "Introspection" && echo "✅ Database schema verified" || echo "⚠️  Could not verify schema"
echo ""

echo "========================================="
echo "✅ Migration completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Redeploy the application: ./deploy.sh"
echo "  2. Test login at: https://gt3.lemonsky-25b43da2.southafricanorth.azurecontainerapps.io"
echo ""
















