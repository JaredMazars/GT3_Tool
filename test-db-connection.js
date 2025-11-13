#!/usr/bin/env node

/**
 * Test Azure SQL Database Connection
 * 
 * This script tests if your DATABASE_URL is configured correctly
 * and can connect to the Azure SQL Server.
 */

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 Testing Azure SQL Server connection...\n');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.log('\nPlease check your .env or .env.local file.');
    process.exit(1);
  }
  
  // Log connection details (without password)
  const dbUrl = process.env.DATABASE_URL;
  const urlWithoutPassword = dbUrl.replace(/password=[^;]+/, 'password=***');
  console.log('📋 Connection String (sanitized):');
  console.log(urlWithoutPassword);
  console.log('');
  
  // Check for required parameters
  console.log('✓ Checking required parameters...');
  const requiredParams = ['encrypt=true', 'database=mapper-tax-db'];
  const missingParams = requiredParams.filter(param => !dbUrl.includes(param));
  
  if (missingParams.length > 0) {
    console.error('❌ Missing required parameters:');
    missingParams.forEach(param => console.error(`   - ${param}`));
    console.log('\nSee CONNECTION_STRING_GUIDE.md for the correct format.');
    process.exit(1);
  }
  console.log('✓ Required parameters present\n');
  
  // Test connection
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  
  try {
    console.log('🔌 Attempting to connect to database...');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful!');
    console.log('✅ Database is reachable and query executed\n');
    
    // Test if we can read from a table
    console.log('📊 Testing table access...');
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible (${userCount} users found)`);
    
    const projectCount = await prisma.project.count();
    console.log(`✅ Project table accessible (${projectCount} projects found)`);
    
    console.log('\n✅ All tests passed! Your database connection is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('\nError details:');
    console.error(error.message);
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Check your DATABASE_URL includes: encrypt=true');
      console.log('   2. Verify your password is correct');
      console.log('   3. Check if password has special characters (wrap in {})');
      console.log('   4. Ensure you\'re using: user=sqladmin');
    } else if (error.message.includes('Login failed')) {
      console.log('\n💡 Authentication issue:');
      console.log('   - Check your username (should be: sqladmin)');
      console.log('   - Verify your password is correct');
      console.log('   - If password has special chars, wrap it: password={YourPass123!}');
    }
    
    console.log('\n📖 See CONNECTION_STRING_GUIDE.md for detailed help.');
    process.exit(1);
    
  } finally {
    await prisma.$disconnect();
  }
}

testConnection().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});


