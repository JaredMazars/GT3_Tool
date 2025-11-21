import { prisma } from '@/lib/db/prisma';
import { withRetry, RetryPresets } from '@/lib/utils/retryUtils';

/**
 * Get projects with counts for a user, optionally filtered by service line
 * Single optimized query with proper includes and field selection
 */
export async function getProjectsWithCounts(
  userId: string,
  serviceLine?: string,
  includeArchived = false
): Promise<Array<{
  id: number;
  name: string;
  description: string | null;
  projectType: string;
  serviceLine: string;
  status: string;
  archived: boolean;
  clientId: number | null;
  taxYear: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    MappedAccount: number;
    TaxAdjustment: number;
  };
}>> {
  return withRetry(
    async () => {
      // Build where clause
      const where: any = {
        ProjectUser: {
          some: {
            userId,
          },
        },
      };

      // Filter by service line if provided
      if (serviceLine) {
        where.serviceLine = serviceLine;
      }

      // Filter archived if not included
      if (!includeArchived) {
        where.archived = false;
      }

      // Single optimized query with counts
      const projects = await prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          projectType: true,
          serviceLine: true,
          status: true,
          archived: true,
          clientId: true,
          taxYear: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              MappedAccount: true,
              TaxAdjustment: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return projects;
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get projects with counts'
  );
}

/**
 * Get a single project with detailed counts
 */
export async function getProjectWithCounts(projectId: number): Promise<{
  id: number;
  name: string;
  description: string | null;
  projectType: string;
  serviceLine: string;
  status: string;
  archived: boolean;
  clientId: number | null;
  taxYear: number | null;
  taxPeriodStart: Date | null;
  taxPeriodEnd: Date | null;
  assessmentYear: string | null;
  submissionDeadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    MappedAccount: number;
    TaxAdjustment: number;
  };
} | null> {
  return withRetry(
    async () => {
      return await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          description: true,
          projectType: true,
          serviceLine: true,
          status: true,
          archived: true,
          clientId: true,
          taxYear: true,
          taxPeriodStart: true,
          taxPeriodEnd: true,
          assessmentYear: true,
          submissionDeadline: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              MappedAccount: true,
              TaxAdjustment: true,
            },
          },
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get project with counts'
  );
}

