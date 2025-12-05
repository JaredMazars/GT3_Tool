#!/usr/bin/env bun

/**
 * Database Schema Synchronization Script
 * 
 * This script enforces that the Azure SQL database structure matches the Prisma schema.
 * 
 * CAUTION: This is a destructive operation in production!
 * - Use `db push` for development (fast, but can lose data)
 * - Use `migrate deploy` for production (safe, preserves data)
 * 
 * Usage:
 *   bun scripts/sync-db-to-schema.ts [--mode=push|migrate] [--force]
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

const args = process.argv.slice(2);
const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'push';
const force = args.includes('--force');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Database Schema Synchronization Script                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  const isProd = dbUrl.includes('prod') || dbUrl.includes('production');
  const serverName = dbUrl.match(/tcp:([^,]+)/)?.[1] || 'unknown';

  console.log(`📊 Database Server: ${serverName}`);
  console.log(`🏷️  Environment: ${isProd ? '⚠️  PRODUCTION' : '🔧 Development'}`);
  console.log(`🔧 Mode: ${mode}\n`);

  if (mode === 'push') {
    console.log('⚙️  DB PUSH MODE');
    console.log('   - Syncs schema directly to database');
    console.log('   - Fast and convenient for development');
    console.log('   - ⚠️  CAN LOSE DATA if schema changes are incompatible\n');

    if (isProd && !force) {
      console.error('❌ ERROR: Cannot use db push on production without --force flag');
      console.error('   Consider using --mode=migrate instead for safe production updates\n');
      process.exit(1);
    }

    if (isProd) {
      console.warn('⚠️  WARNING: You are about to push schema changes to PRODUCTION!');
      const confirm = await question('   Type "CONFIRM PRODUCTION PUSH" to proceed: ');
      if (confirm !== 'CONFIRM PRODUCTION PUSH') {
        console.log('❌ Aborted.');
        rl.close();
        process.exit(0);
      }
    } else {
      const confirm = await question('   Push schema to database? (y/N): ');
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log('❌ Aborted.');
        rl.close();
        process.exit(0);
      }
    }

    console.log('\n🚀 Pushing schema to database...\n');
    
    try {
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('\n✅ Database schema synchronized successfully!');
    } catch (error) {
      console.error('\n❌ Failed to push schema to database');
      process.exit(1);
    }

  } else if (mode === 'migrate') {
    console.log('⚙️  MIGRATION MODE');
    console.log('   - Creates migration files for schema changes');
    console.log('   - Safe for production (preserves data)');
    console.log('   - Tracks history of schema changes\n');

    // Check migration status
    console.log('📋 Checking migration status...\n');
    try {
      execSync('npx prisma migrate status', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.warn('\n⚠️  There are pending migrations or database drift detected');
    }

    console.log('\n');
    const action = await question('Choose action:\n  1) Create new migration\n  2) Deploy pending migrations\n  3) Reset database (⚠️  DESTRUCTIVE)\n  Choice (1-3): ');

    if (action === '1') {
      const migrationName = await question('\nEnter migration name (e.g., "add_new_field"): ');
      if (!migrationName.trim()) {
        console.error('❌ Migration name cannot be empty');
        rl.close();
        process.exit(1);
      }

      console.log(`\n🚀 Creating migration: ${migrationName}...\n`);
      try {
        execSync(`npx prisma migrate dev --name "${migrationName.trim()}"`, {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('\n✅ Migration created and applied successfully!');
      } catch (error) {
        console.error('\n❌ Failed to create migration');
        process.exit(1);
      }

    } else if (action === '2') {
      console.log('\n🚀 Deploying pending migrations...\n');
      try {
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('\n✅ Migrations deployed successfully!');
      } catch (error) {
        console.error('\n❌ Failed to deploy migrations');
        process.exit(1);
      }

    } else if (action === '3') {
      if (isProd && !force) {
        console.error('❌ ERROR: Cannot reset production database without --force flag');
        rl.close();
        process.exit(1);
      }

      const confirm = await question('\n⚠️  WARNING: This will DELETE ALL DATA!\n   Type "CONFIRM RESET" to proceed: ');
      if (confirm !== 'CONFIRM RESET') {
        console.log('❌ Aborted.');
        rl.close();
        process.exit(0);
      }

      console.log('\n🚀 Resetting database...\n');
      try {
        execSync('npx prisma migrate reset --force', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('\n✅ Database reset successfully!');
      } catch (error) {
        console.error('\n❌ Failed to reset database');
        process.exit(1);
      }

    } else {
      console.log('❌ Invalid choice. Aborted.');
      rl.close();
      process.exit(0);
    }

  } else {
    console.error(`❌ ERROR: Invalid mode "${mode}". Use --mode=push or --mode=migrate`);
    process.exit(1);
  }

  // Generate Prisma Client
  console.log('\n🔄 Regenerating Prisma Client...\n');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('\n✅ Prisma Client generated successfully!');
  } catch (error) {
    console.error('\n❌ Failed to generate Prisma Client');
    process.exit(1);
  }

  rl.close();
  console.log('\n✨ All done!\n');
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  rl.close();
  process.exit(1);
});
