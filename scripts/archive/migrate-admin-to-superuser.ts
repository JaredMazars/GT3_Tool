/**
 * ARCHIVED Migration Script: Update ADMIN users to SUPERUSER
 * 
 * NOTE: This script is archived and historical. SUPERUSER has been renamed to SYSTEM_ADMIN.
 * This script was used to migrate existing User records with role='ADMIN' to role='SUPERUSER'
 * to align with the three-level permission model. The current role name is SYSTEM_ADMIN.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting migration: ADMIN -> SUPERUSER (Now called SYSTEM_ADMIN)');
  console.log('=======================================================================\n');

  try {
    // Find all users with ADMIN role
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log(`Found ${adminUsers.length} user(s) with ADMIN role:\n`);

    if (adminUsers.length === 0) {
      console.log('✅ No users to migrate. All users are already up to date.\n');
      return;
    }

    // Display users to be migrated
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'N/A'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Current role: ${user.role}`);
      console.log('');
    });

    console.log('Updating users to SUPERUSER role...\n');

    // Update all ADMIN users to SUPERUSER
    const updateResult = await prisma.user.updateMany({
      where: {
        role: 'ADMIN',
      },
      data: {
        role: 'SUPERUSER',
      },
    });

    console.log(`✅ Successfully updated ${updateResult.count} user(s) to SUPERUSER role\n`);

    // Verify the migration
    const verifyUsers = await prisma.user.findMany({
      where: {
        id: {
          in: adminUsers.map(u => u.id),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log('Verification:');
    verifyUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'N/A'} (${user.email})`);
      console.log(`   New role: ${user.role}`);
      console.log('');
    });

    console.log('=====================================');
    console.log('✅ Migration completed successfully!');
    console.log('=====================================\n');

    console.log('Summary:');
    console.log(`- Users migrated: ${updateResult.count}`);
    console.log('- All former ADMIN users are now SUPERUSER (now called SYSTEM_ADMIN)');
    console.log('- SYSTEM_ADMIN: System-wide access to all features and service lines');
    console.log('- These users will bypass service line access checks');
    console.log('- They can approve all acceptance and engagement letters\n');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });



