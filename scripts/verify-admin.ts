import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAdmin() {
  const email = 'walter.blake@forvismazars.co.za';
  
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ServiceLineUser: true,
      },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📋 User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   System Admin: ${user.role === 'ADMIN' ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🔐 Service Line Access:');
    user.ServiceLineUser.forEach(slu => {
      console.log(`   - ${slu.serviceLine}: ${slu.role}`);
    });

    if (user.role === 'ADMIN') {
      console.log('\n✅ You are a SYSTEM ADMIN');
      console.log('\n💡 To activate your admin access:');
      console.log('   1. Log out of the application');
      console.log('   2. Clear your browser cache/cookies (optional but recommended)');
      console.log('   3. Log back in');
      console.log('   4. Your session will now have admin privileges');
    } else {
      console.log('\n❌ Not a system admin - updating now...');
      
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      });
      
      console.log('✅ Updated to ADMIN role - please log out and back in');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdmin();




