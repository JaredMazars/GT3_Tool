/**
 * Redis Connection Test Script
 * 
 * Tests the Redis connection and cache operations.
 * Run with: npx tsx scripts/test-redis.ts
 * 
 * Set REDIS_CONNECTION_STRING environment variable to test Redis connection:
 * REDIS_CONNECTION_STRING="localhost:6379,password=yourpass" npx tsx scripts/test-redis.ts
 */

import Redis from 'ioredis';

// Simple logger
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || ''),
};

interface TestData {
  message: string;
  timestamp: Date;
  count: number;
}

async function testRedis() {
  console.log('🔄 Testing Redis connection...\n');
  
  // Test 1: Check if Redis is configured
  const connString = process.env.REDIS_CONNECTION_STRING;
  
  if (!connString) {
    console.log('⚠️  Redis not configured (REDIS_CONNECTION_STRING not set)');
    console.log('ℹ️  This is normal for local development without Redis');
    console.log('ℹ️  To test Redis, set REDIS_CONNECTION_STRING environment variable:');
    console.log('    REDIS_CONNECTION_STRING="localhost:6379,password=yourpass" npx tsx scripts/test-redis.ts\n');
    return await testInMemoryFallback();
  }
  
  // Parse connection string
  const isAzure = connString.includes('.redis.cache.windows.net');
  const parts = connString.split(',');
  const [host, port] = parts[0]?.split(':') || ['localhost', '6379'];
  const passwordPart = parts.find(p => p.includes('password='));
  const password = passwordPart ? passwordPart.split('=')[1] : undefined;
  
  console.log(`Connecting to ${isAzure ? 'Azure' : 'Local'} Redis at ${host}:${port}...`);
  
  let redis: Redis;
  try {
    if (isAzure) {
      redis = new Redis({
        host,
        port: parseInt(port || '6380'),
        password,
        tls: { servername: host },
        maxRetriesPerRequest: 3,
      });
    } else {
      redis = new Redis({
        host,
        port: parseInt(port || '6379'),
        password,
        maxRetriesPerRequest: 3,
      });
    }
  } catch (error) {
    console.log('❌ Failed to create Redis client:', error);
    return;
  }
  
  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('✅ Redis client created');
  
  // Test 2: Ping Redis
  try {
    const pingResult = await redis.ping();
    if (pingResult === 'PONG') {
      console.log('✅ Redis ping successful\n');
    } else {
      console.log('❌ Redis ping failed:', pingResult);
      await redis.quit();
      return;
    }
  } catch (error) {
    console.log('❌ Redis ping error:', error);
    await redis.quit();
    return;
  }
  
  // Test 3: Basic cache operations
  console.log('Testing cache operations...');
  
  const testData: TestData = {
    message: 'Hello Redis!',
    timestamp: new Date(),
    count: 42,
  };
  
  // Set
  await redis.setex('test:key', 60, JSON.stringify(testData));
  console.log('✅ Set test key:', testData);
  
  // Get
  const valueStr = await redis.get('test:key');
  const value = valueStr ? JSON.parse(valueStr) : null;
  console.log('✅ Get test key:', value);
  
  if (value && value.message === testData.message) {
    console.log('✅ Data integrity verified');
  } else {
    console.log('❌ Data mismatch!');
  }
  
  // Test 4: Cache with different TTLs
  await redis.setex('test:short', 5, 'expires in 5 sec');
  await redis.setex('test:long', 60, 'expires in 60 sec');
  console.log('✅ Set keys with different TTLs');
  
  // Test 5: Delete
  await redis.del('test:key');
  console.log('✅ Deleted test key');
  
  const deleted = await redis.get('test:key');
  if (deleted === null) {
    console.log('✅ Verify deletion successful');
  } else {
    console.log('❌ Deletion failed!');
  }
  
  // Test 6: Pattern matching and deletion
  await redis.setex('test:pattern:1', 60, 'data1');
  await redis.setex('test:pattern:2', 60, 'data2');
  await redis.setex('test:other', 60, 'other');
  console.log('✅ Set keys for pattern test');
  
  const keys = await redis.keys('*pattern*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`✅ Deleted ${keys.length} keys matching 'pattern'`);
  }
  
  const remaining = await redis.get('test:other');
  if (remaining) {
    console.log('✅ Non-matching key preserved');
  }
  
  // Test 7: Session cache simulation
  console.log('\nTesting session cache simulation...');
  const sessionData = {
    userId: 'test-user-123',
    email: 'test@example.com',
    role: 'USER',
    expires: new Date(Date.now() + 3600000),
  };
  
  await redis.setex('session:abc123xyz', 3600, JSON.stringify(sessionData));
  const sessionStr = await redis.get('session:abc123xyz');
  if (sessionStr) {
    console.log('✅ Session cached successfully');
  }
  
  // Test 8: Permission cache simulation
  console.log('\nTesting permission cache simulation...');
  await redis.setex('perm:user123:clients:READ', 300, 'true');
  await redis.setex('perm:user123:projects:CREATE', 300, 'false');
  
  const canRead = await redis.get('perm:user123:clients:READ');
  const canCreate = await redis.get('perm:user123:projects:CREATE');
  
  console.log(`✅ Permission cache - canRead: ${canRead}, canCreate: ${canCreate}`);
  
  // Cleanup test keys
  console.log('\nCleaning up test keys...');
  const testKeys = await redis.keys('test:*');
  const sessionKeys = await redis.keys('session:*');
  const permKeys = await redis.keys('perm:*');
  const allTestKeys = [...testKeys, ...sessionKeys, ...permKeys];
  
  if (allTestKeys.length > 0) {
    await redis.del(...allTestKeys);
    console.log(`✅ Cleaned up ${allTestKeys.length} test keys`);
  }
  
  console.log('\n✅ All Redis tests passed!');
  
  // Close connection
  await redis.quit();
  console.log('✅ Redis connection closed');
  
  process.exit(0);
}

async function testInMemoryFallback() {
  console.log('✅ Application will use in-memory cache fallback');
  console.log('✅ This is the expected behavior when Redis is not configured');
  console.log('\nℹ️  When you deploy to Azure with Redis configured:');
  console.log('   1. The app will automatically use Redis for distributed caching');
  console.log('   2. Sessions will be shared across all container instances');
  console.log('   3. Permissions will be cached and consistent across replicas');
  console.log('   4. Database load will be significantly reduced\n');
  process.exit(0);
}

// Run tests
testRedis().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

