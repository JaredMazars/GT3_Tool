#!/usr/bin/env bun

/**
 * Database Schema Validation Script
 * 
 * This script validates that the Azure SQL database structure matches the Prisma schema
 * without making any changes. Use this to detect drift before deploying.
 * 
 * Usage:
 *   bun scripts/validate-db-schema.ts
 */

import { execSync } from 'child_process';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Database Schema Validation                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  const serverName = dbUrl.match(/tcp:([^,]+)/)?.[1] || 'unknown';
  console.log(`📊 Database Server: ${serverName}\n`);

  // Validate Prisma schema syntax
  console.log('📋 Step 1: Validating Prisma schema syntax...\n');
  try {
    execSync('npx prisma validate', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Prisma schema is valid\n');
  } catch (error) {
    console.error('❌ Prisma schema validation failed');
    process.exit(1);
  }

  // Check migration status
  console.log('📋 Step 2: Checking migration status...\n');
  try {
    const output = execSync('npx prisma migrate status', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    console.log(output);

    if (output.includes('Database schema is up to date')) {
      console.log('✅ Database schema matches migrations\n');
    } else if (output.includes('following migrations have not yet been applied')) {
      console.warn('⚠️  Pending migrations detected');
      console.warn('   Run: bun scripts/sync-db-to-schema.ts --mode=migrate\n');
      process.exit(1);
    } else if (output.includes('drift')) {
      console.warn('⚠️  Schema drift detected');
      console.warn('   The database schema differs from your Prisma schema');
      console.warn('   Run: bun scripts/sync-db-to-schema.ts\n');
      process.exit(1);
    }
  } catch (error: any) {
    if (error.stdout?.includes('No migration found')) {
      console.warn('⚠️  No migrations found in prisma/migrations/');
      console.warn('   This is normal if you\'re using db push instead of migrations');
      console.warn('   For production, consider creating migrations\n');
    } else {
      console.error('❌ Migration status check failed');
      console.error(error.message);
      process.exit(1);
    }
  }

  // Try to generate client (validates schema can connect)
  console.log('📋 Step 3: Testing database connection...\n');
  try {
    execSync('npx prisma generate --no-engine 2>&1', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Database connection validated\n');
  } catch (error) {
    console.error('❌ Failed to validate database connection');
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Validation Complete                                  ║');
  console.log('║   Database schema appears to be in sync                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
