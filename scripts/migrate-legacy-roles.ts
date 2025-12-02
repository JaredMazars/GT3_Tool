/**
 * Migration Script: Move legacy system roles to ServiceLineUser
 * 
 * This script migrates users who have service-line-specific roles
 * (ADMIN, PARTNER, MANAGER, SUPERVISOR, VIEWER) at the system level
 * to the ServiceLineUser table with appropriate assignments.
 * 
 * WARNING: This is a one-time migration. Review the output carefully
 * before running in production.
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Service lines to assign legacy role users to
const DEFAULT_SERVICE_LINES = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY'];

// Mapping of legacy system roles to service line roles
const ROLE_MAPPING: Record<string, string> = {
  'ADMIN': 'ADMIN',
  'PARTNER': 'PARTNER',
  'MANAGER': 'MANAGER',
  'SUPERVISOR': 'SUPERVISOR',
  'VIEWER': 'VIEWER',
};

interface LegacyUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface MigrationPlan {
  user: LegacyUser;
  newSystemRole: 'USER' | 'SYSTEM_ADMIN';
  serviceLineAssignments: Array<{
    serviceLine: string;
    role: string;
  }>;
}

/**
 * Prompt user for confirmation
 */
async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Find all users with legacy system roles
 */
async function findLegacyUsers(): Promise<LegacyUser[]> {
  const legacyRoles = Object.keys(ROLE_MAPPING);
  
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: legacyRoles,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return users as LegacyUser[];
}

/**
 * Create migration plan for each user
 */
async function createMigrationPlan(users: LegacyUser[]): Promise<MigrationPlan[]> {
  const plans: MigrationPlan[] = [];

  for (const user of users) {
    // Check if user already has service line assignments
    const existingAssignments = await prisma.serviceLineUser.findMany({
      where: { userId: user.id },
      select: { serviceLine: true, role: true },
    });

    let serviceLineAssignments: Array<{ serviceLine: string; role: string }>;

    if (existingAssignments.length > 0) {
      // User already has service line assignments
      // Update their roles to match their system role (if higher)
      const mappedRole = ROLE_MAPPING[user.role] || 'USER';
      
      serviceLineAssignments = existingAssignments.map(assignment => ({
        serviceLine: assignment.serviceLine,
        role: mappedRole, // Upgrade to legacy role level
      }));
    } else {
      // No existing assignments - assign to default service lines
      serviceLineAssignments = DEFAULT_SERVICE_LINES.map(sl => ({
        serviceLine: sl,
        role: ROLE_MAPPING[user.role] || 'USER',
      }));
    }

    plans.push({
      user,
      newSystemRole: 'USER', // All legacy roles become regular users
      serviceLineAssignments,
    });
  }

  return plans;
}

/**
 * Display migration plan for review
 */
function displayMigrationPlan(plans: MigrationPlan[]): void {
  console.log('\n=== MIGRATION PLAN ===\n');
  console.log(`Found ${plans.length} users with legacy system roles:\n`);

  plans.forEach((plan, index) => {
    console.log(`${index + 1}. ${plan.user.name || 'Unknown'} (${plan.user.email})`);
    console.log(`   Current System Role: ${plan.user.role}`);
    console.log(`   New System Role: ${plan.newSystemRole}`);
    console.log(`   Service Line Assignments:`);
    
    plan.serviceLineAssignments.forEach(assignment => {
      console.log(`     - ${assignment.serviceLine}: ${assignment.role}`);
    });
    
    console.log('');
  });

  console.log('======================\n');
}

/**
 * Execute migration plan
 */
async function executeMigration(plans: MigrationPlan[]): Promise<void> {
  console.log('\nExecuting migration...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const plan of plans) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Create/update service line assignments
        for (const assignment of plan.serviceLineAssignments) {
          await tx.serviceLineUser.upsert({
            where: {
              userId_serviceLine: {
                userId: plan.user.id,
                serviceLine: assignment.serviceLine,
              },
            },
            create: {
              userId: plan.user.id,
              serviceLine: assignment.serviceLine,
              role: assignment.role,
              updatedAt: new Date(),
            },
            update: {
              role: assignment.role,
              updatedAt: new Date(),
            },
          });
        }

        // 2. Update user's system role
        await tx.user.update({
          where: { id: plan.user.id },
          data: {
            role: plan.newSystemRole,
            updatedAt: new Date(),
          },
        });
      });

      console.log(`✅ Migrated: ${plan.user.email}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error migrating ${plan.user.email}:`, error);
      errorCount++;
    }
  }

  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`==========================\n`);
}

/**
 * Main migration function
 */
async function main() {
  console.log('🔄 Legacy Role Migration Script\n');

  try {
    // 1. Find users with legacy roles
    console.log('Searching for users with legacy system roles...');
    const legacyUsers = await findLegacyUsers();

    if (legacyUsers.length === 0) {
      console.log('✅ No legacy roles found. Migration not needed.');
      return;
    }

    // 2. Create migration plan
    console.log(`Found ${legacyUsers.length} users with legacy roles.`);
    const plans = await createMigrationPlan(legacyUsers);

    // 3. Display plan
    displayMigrationPlan(plans);

    // 4. Confirm with user
    const confirmed = await promptConfirmation(
      'Do you want to proceed with this migration?'
    );

    if (!confirmed) {
      console.log('❌ Migration cancelled by user.');
      return;
    }

    // 5. Execute migration
    await executeMigration(plans);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review the migrated users in the database');
    console.log('2. Apply the database constraint: node scripts/apply-role-constraints.ts');
    console.log('3. Update seed scripts to remove legacy roles');
    console.log('4. Deploy updated application code\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as migrateLegacyRoles };


