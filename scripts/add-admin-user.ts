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

    // Create or update user with admin role
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
      },
      create: {
        id: email, // Use email as ID for Azure AD users
        email,
        name: email.split('@')[0],
        role: 'ADMIN',
      },
    });

    console.log(`✓ User created/updated: ${user.email} (Role: ${user.role})`);

    // Add user to all service lines with ADMIN role
    const serviceLines = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY'];
    
    for (const serviceLine of serviceLines) {
      await prisma.serviceLineUser.upsert({
        where: {
          userId_serviceLine: {
            userId: user.id,
            serviceLine,
          },
        },
        update: {
          role: 'ADMIN',
        },
        create: {
          userId: user.id,
          serviceLine,
          role: 'ADMIN',
        },
      });
      console.log(`✓ Added to ${serviceLine} service line as ADMIN`);
    }

    console.log('\n✅ Admin user setup complete!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Service Lines: ${serviceLines.join(', ')} (ADMIN)`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addAdminUser();




