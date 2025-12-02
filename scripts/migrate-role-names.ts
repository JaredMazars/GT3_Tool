/**
 * Migration Script: Rename Roles
 * 
 * Updates existing database values:
 * - User.role: SUPERUSER → SYSTEM_ADMIN
 * - ServiceLineUser.role: ADMIN → ADMINISTRATOR
 * - RolePermission.role: ADMIN → ADMINISTRATOR, SUPERUSER → SYSTEM_ADMIN
 * 
 * Run with: npm run tsx scripts/migrate-role-names.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting role name migration...\n');

  // 1. Update User.role from SUPERUSER to SYSTEM_ADMIN
  console.log('📝 Updating User.role from SUPERUSER to SYSTEM_ADMIN...');
  const userResult = await prisma.$executeRaw`
    UPDATE "User"
    SET role = 'SYSTEM_ADMIN'
    WHERE role = 'SUPERUSER'
  `;
  console.log(`✅ Updated ${userResult} users\n`);

  // 2. Update ServiceLineUser.role from ADMIN to ADMINISTRATOR
  console.log('📝 Updating ServiceLineUser.role from ADMIN to ADMINISTRATOR...');
  const serviceLineUserResult = await prisma.$executeRaw`
    UPDATE "ServiceLineUser"
    SET role = 'ADMINISTRATOR'
    WHERE role = 'ADMIN'
  `;
  console.log(`✅ Updated ${serviceLineUserResult} service line users\n`);

  // 3. Update RolePermission.role from ADMIN to ADMINISTRATOR
  console.log('📝 Updating RolePermission.role from ADMIN to ADMINISTRATOR...');
  const rolePermAdminResult = await prisma.$executeRaw`
    UPDATE "RolePermission"
    SET role = 'ADMINISTRATOR'
    WHERE role = 'ADMIN'
  `;
  console.log(`✅ Updated ${rolePermAdminResult} role permissions (ADMIN → ADMINISTRATOR)\n`);

  // 4. Update RolePermission.role from SUPERUSER to SYSTEM_ADMIN
  console.log('📝 Updating RolePermission.role from SUPERUSER to SYSTEM_ADMIN...');
  const rolePermSuperuserResult = await prisma.$executeRaw`
    UPDATE "RolePermission"
    SET role = 'SYSTEM_ADMIN'
    WHERE role = 'SUPERUSER'
  `;
  console.log(`✅ Updated ${rolePermSuperuserResult} role permissions (SUPERUSER → SYSTEM_ADMIN)\n`);

  // 5. Verify the changes
  console.log('🔍 Verifying migration...\n');
  
  const systemAdminCount = await prisma.user.count({
    where: { role: 'SYSTEM_ADMIN' },
  });
  console.log(`   Users with SYSTEM_ADMIN role: ${systemAdminCount}`);
  
  const superuserCount = await prisma.user.count({
    where: { role: 'SUPERUSER' },
  });
  console.log(`   Users with legacy SUPERUSER role (should be 0): ${superuserCount}`);
  
  const administratorCount = await prisma.serviceLineUser.count({
    where: { role: 'ADMINISTRATOR' },
  });
  console.log(`   ServiceLineUsers with ADMINISTRATOR role: ${administratorCount}`);
  
  const adminCount = await prisma.serviceLineUser.count({
    where: { role: 'ADMIN' },
  });
  console.log(`   ServiceLineUsers with ADMIN role (should be 0): ${adminCount}`);

  const rolePermAdminCount = await prisma.rolePermission.count({
    where: { role: 'ADMINISTRATOR' },
  });
  console.log(`   RolePermissions with ADMINISTRATOR role: ${rolePermAdminCount}`);

  const rolePermSystemAdminCount = await prisma.rolePermission.count({
    where: { role: 'SYSTEM_ADMIN' },
  });
  console.log(`   RolePermissions with SYSTEM_ADMIN role: ${rolePermSystemAdminCount}`);

  const rolePermLegacyAdminCount = await prisma.rolePermission.count({
    where: { role: 'ADMIN' },
  });
  console.log(`   RolePermissions with ADMIN role (should be 0): ${rolePermLegacyAdminCount}`);

  const rolePermLegacySuperuserCount = await prisma.rolePermission.count({
    where: { role: 'SUPERUSER' },
  });
  console.log(`   RolePermissions with legacy SUPERUSER role (should be 0): ${rolePermLegacySuperuserCount}\n`);

  if (superuserCount === 0 && adminCount === 0 && rolePermLegacyAdminCount === 0 && rolePermLegacySuperuserCount === 0) {
    console.log('✅ Migration completed successfully!\n');
  } else {
    console.warn('⚠️  Migration completed but some legacy roles remain. Please review.\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

