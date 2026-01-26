import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { HealthCheckResult } from '@/types/api';
import { logError } from '@/lib/utils/logger';

/**
 * GET /api/health
 * Health check endpoint for monitoring system status
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const healthCheck: HealthCheckResult = {
    status: 'healthy',
    timestamp,
    services: {
      database: {
        status: 'up',
      },
      openai: {
        status: 'up',
      },
    },
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    
    healthCheck.services.database = {
      status: 'up',
      latency: dbLatency,
    };
  } catch (error) {
    logError('Database health check failed', error);
    healthCheck.services.database = {
      status: 'down',
      message: 'Database connection failed',
    };
    healthCheck.status = 'degraded';
  }

  // Check Azure OpenAI API key is configured
  if (!process.env.AZURE_OPENAI_API_KEY) {
    healthCheck.services.openai = {
      status: 'down',
      message: 'Azure OpenAI API key not configured',
    };
    healthCheck.status = 'degraded';
  }

  // Determine overall status
  const allServicesUp = Object.values(healthCheck.services).every(
    service => service.status === 'up'
  );
  
  if (!allServicesUp) {
    const anyServiceDown = Object.values(healthCheck.services).some(
      service => service.status === 'down'
    );
    healthCheck.status = anyServiceDown ? 'unhealthy' : 'degraded';
  }

  // Return appropriate status code
  const statusCode = healthCheck.status === 'healthy' ? 200 :
                     healthCheck.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthCheck, { status: statusCode });
}

























