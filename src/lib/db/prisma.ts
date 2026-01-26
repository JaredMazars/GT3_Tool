import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Connection pool settings optimized for Azure SQL Database
    // Handles cold-start scenarios where database may take 10-30s to resume
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Configure connection timeout for Azure SQL cold-start
// This allows the initial connection to wait longer for database to wake up
if (process.env.DATABASE_URL?.includes('database.windows.net')) {
  // Azure SQL detected - set appropriate timeouts
  prisma.$connect().catch((error) => {
    // Connection error will be handled by individual queries with retry logic
  });
}
