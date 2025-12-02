import { prisma } from '@/lib/db/prisma';
import { withRetry, RetryPresets } from '@/lib/utils/retryUtils';

export interface ProjectFilters {
  userId: string;
  accessibleServiceLines: string[];
  search?: string;
  page?: number;
  limit?: number;
  serviceLine?: string;
  includeArchived?: boolean;
  internalOnly?: boolean;
  clientProjectsOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectListResult {
  projects: Array<{
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
    Client: {
      id: number;
      clientNameFull: string | null;
      clientCode: string | null;
    } | null;
    _count: {
      MappedAccount: number;
      TaxAdjustment: number;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get projects with pagination and filtering
 * Optimized with database-level filtering instead of in-memory
 */
export async function getProjectsWithPagination(
  filters: ProjectFilters
): Promise<ProjectListResult> {
  return withRetry(
    async () => {
      const {
        userId,
        accessibleServiceLines,
        search = '',
        page = 1,
        limit = 50,
        serviceLine,
        includeArchived = false,
        internalOnly = false,
        clientProjectsOnly = false,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * Math.min(limit, 100);
      const take = Math.min(limit, 100);

      // Build where clause for database-level filtering
      const where: any = {
        ProjectUser: {
          some: {
            userId,
          },
        },
        serviceLine: {
          in: accessibleServiceLines,
        },
      };

      // Filter by archived status
      if (!includeArchived) {
        where.archived = false;
      }

      // Filter by specific service line
      if (serviceLine) {
        where.serviceLine = serviceLine;
      }

      // Filter for internal projects only
      if (internalOnly) {
        where.clientId = null;
      }

      // Filter for client projects only
      if (clientProjectsOnly) {
        where.clientId = { not: null };
      }

      // Add search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy
      const orderBy: any = {};
      const validSortFields = ['name', 'updatedAt', 'createdAt', 'taxYear'];
      if (validSortFields.includes(sortBy)) {
        orderBy[sortBy] = sortOrder;
      } else {
        orderBy.updatedAt = 'desc';
      }

      // Get total count
      const total = await prisma.project.count({ where });

      // Get projects with optimized query
      const projects = await prisma.project.findMany({
        where,
        skip,
        take,
        orderBy,
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
          Client: {
            select: {
              id: true,
              clientNameFull: true,
              clientCode: true,
            },
          },
          _count: {
            select: {
              MappedAccount: true,
              TaxAdjustment: true,
            },
          },
        },
      });

      return {
        projects,
        pagination: {
          page,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      };
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get projects with pagination'
  );
}

/**
 * Get projects with counts for a user, optionally filtered by service line
 * Single optimized query with proper includes and field selection
 * @deprecated Use getProjectsWithPagination instead for better performance
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
  Client: {
    id: number;
    clientNameFull: string | null;
    clientCode: string | null;
  } | null;
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
          Client: {
            select: {
              id: true,
              clientNameFull: true,
              clientCode: true,
            },
          },
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

