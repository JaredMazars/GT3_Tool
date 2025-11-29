/**
 * Script to check a user's access levels and project memberships
 * Usage: npx tsx scripts/check-user-access.ts <email>
 */

import { prisma } from '../src/lib/db/prisma';

async function checkUserAccess(emailPattern: string) {
  console.log(`\n=== Checking Access for User: ${emailPattern} ===\n`);

  // 1. Find the user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: emailPattern } },
        { email: { equals: emailPattern } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('👤 User Details:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   System Role: ${user.role}`);
  console.log(`   User ID: ${user.id}`);
  console.log();

  // 2. Check service line access
  console.log('📋 Service Line Access:');
  const serviceLines = await prisma.serviceLineUser.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      serviceLine: true,
      role: true,
    },
    orderBy: { serviceLine: 'asc' },
  });

  if (serviceLines.length === 0) {
    console.log('   ❌ No service line access');
  } else {
    serviceLines.forEach(sl => {
      console.log(`   ✓ ${sl.serviceLine}: ${sl.role} (ID: ${sl.id})`);
    });
  }
  console.log();

  // 3. Check project memberships
  console.log('📁 Project Memberships:');
  const projectMemberships = await prisma.projectUser.findMany({
    where: { userId: user.id },
    include: {
      Project: {
        select: {
          id: true,
          name: true,
          serviceLine: true,
        },
      },
    },
    orderBy: {
      Project: {
        serviceLine: 'asc',
      },
    },
  });

  if (projectMemberships.length === 0) {
    console.log('   ❌ Not a member of any projects');
  } else {
    projectMemberships.forEach(pm => {
      console.log(`   ✓ Project ${pm.Project.id}: ${pm.Project.name}`);
      console.log(`     Service Line: ${pm.Project.serviceLine}`);
      console.log(`     Role: ${pm.role}`);
      console.log(`     ProjectUser ID: ${pm.id}`);
      console.log();
    });
  }
  console.log();

  // 4. Show TAX projects they can/cannot access
  console.log('🔍 TAX Projects Analysis:');
  const taxProjects = await prisma.project.findMany({
    where: { serviceLine: 'TAX' },
    select: {
      id: true,
      name: true,
      createdBy: true,
      ProjectUser: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const taxServiceLine = serviceLines.find(sl => sl.serviceLine === 'TAX');
  const isTaxAdmin = taxServiceLine?.role === 'ADMIN' || taxServiceLine?.role === 'PARTNER';
  const isSystemAdmin = user.role === 'SYSTEM_ADMIN';

  console.log(`   Tax Service Line Role: ${taxServiceLine?.role || 'NONE'}`);
  console.log(`   Is Tax Admin/Partner: ${isTaxAdmin ? 'YES' : 'NO'}`);
  console.log(`   Is System Admin: ${isSystemAdmin ? 'YES' : 'NO'}`);
  console.log();

  taxProjects.forEach(project => {
    const isTeamMember = project.ProjectUser.some(pu => pu.userId === user.id);
    const canAccess = isSystemAdmin || isTaxAdmin || isTeamMember;
    const userProjectRole = project.ProjectUser.find(pu => pu.userId === user.id)?.role;

    const status = canAccess ? '✅ CAN ACCESS' : '❌ CANNOT ACCESS';
    const reason = isSystemAdmin
      ? '(System Admin)'
      : isTaxAdmin
      ? '(Tax Admin/Partner)'
      : isTeamMember
      ? `(Team Member: ${userProjectRole})`
      : '(Not a team member)';

    console.log(`   ${status} - Project ${project.id}: ${project.name}`);
    console.log(`     Reason: ${reason}`);
    console.log(`     Team Members: ${project.ProjectUser.length}`);
    console.log();
  });
}

async function main() {
  const email = process.argv[2] || 'walter.taxadmin';

  try {
    await checkUserAccess(email);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


