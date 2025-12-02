/**
 * Apply System Role Constraints
 * 
 * This script applies the database constraint to enforce
 * only SYSTEM_ADMIN and USER roles at the system level.
 * 
 * Run this AFTER migrating legacy roles.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Applying System Role Constraints\n');

  try {
    // 1. Verify no legacy roles remain
    console.log('Checking for remaining legacy roles...');
    
    const legacyRoles = ['ADMIN', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'VIEWER'];
    const usersWithLegacyRoles = await prisma.user.findMany({
      where: {
        role: {
          in: legacyRoles,
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (usersWithLegacyRoles.length > 0) {
      console.error('❌ Error: Found users with legacy system roles:');
      usersWithLegacyRoles.forEach(user => {
        console.error(`   - ${user.email}: ${user.role}`);
      });
      console.error('\nPlease run migrate-legacy-roles.ts first.\n');
      process.exit(1);
    }

    console.log('✅ No legacy roles found.');

    // 2. Read and execute SQL migration
    console.log('\nApplying database constraints...');
    
    const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_system_role_constraints.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by statements (simple approach - assumes ';' separates statements)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
      } catch (error: any) {
        // Ignore errors if constraint already exists
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Constraints applied successfully!');
    console.log('\nSystem roles are now restricted to: SYSTEM_ADMIN, USER');
  } catch (error) {
    console.error('❌ Error applying constraints:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main as applyRoleConstraints };


