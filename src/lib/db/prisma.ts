import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Connection pool settings for better transaction handling
    // These help prevent transaction timeout issues
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma