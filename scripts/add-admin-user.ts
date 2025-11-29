import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAdminUser() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Please provide an email address: npm run add-admin <email>');
    process.exit(1);
  }

  try {
    console.log(`Adding admin user: ${email}`);

    // Create or update user with SYSTEM_ADMIN role
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'SYSTEM_ADMIN',
      },
      create: {
        id: email, // Use email as ID for Azure AD users
        email,
        name: email.split('@')[0],
        role: 'SYSTEM_ADMIN',
      },
    });

    console.log(`✓ User created/updated: ${user.email} (Role: ${user.role})`);

    // SYSTEM_ADMIN has system-wide access and doesn't need service line assignments
    // They bypass service line checks automatically
    console.log('\n✅ Admin user setup complete!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Access: System-wide (bypasses service line restrictions)`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addAdminUser();






