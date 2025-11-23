import { prisma } from '@/lib/db/prisma';
import { withRetry, RetryPresets } from '@/lib/utils/retryUtils';

export interface ClientFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClientListResult {
  clients: Array<{
    id: number;
    clientCode: string;
    clientNameFull: string | null;
    groupCode: string;
    groupDesc: string;
    clientPartner: string;
    clientManager: string;
    clientIncharge: string;
    industry: string | null;
    sector: string | null;
    active: string;
    typeCode: string;
    typeDesc: string;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      Project: number;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClientDetailFilters {
  projectPage?: number;
  projectLimit?: number;
  serviceLine?: string;
  includeArchived?: boolean;
}

/**
 * Get paginated and filtered list of clients
 */
export async function getClientsWithPagination(
  filters: ClientFilters = {}
): Promise<ClientListResult> {
  return withRetry(
    async () => {
      const {
        search = '',
        page = 1,
        limit = 50,
        sortBy = 'clientNameFull',
        sortOrder = 'asc',
      } = filters;

      const skip = (page - 1) * Math.min(limit, 100);
      const take = Math.min(limit, 100);

      // Build where clause with improved search
      const where: any = {};
      if (search) {
        where.OR = [
          { clientNameFull: { contains: search, mode: 'insensitive' } },
          { clientCode: { contains: search, mode: 'insensitive' } },
          { groupDesc: { contains: search, mode: 'insensitive' } },
          { groupCode: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } },
          { sector: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy clause
      const orderBy: any = {};
      const validSortFields = ['clientNameFull', 'clientCode', 'groupDesc', 'createdAt', 'updatedAt'];
      if (validSortFields.includes(sortBy)) {
        orderBy[sortBy] = sortOrder;
      } else {
        orderBy.clientNameFull = 'asc';
      }

      // Get total count
      const total = await prisma.client.count({ where });

      // Get clients with project count
      const clients = await prisma.client.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          clientCode: true,
          clientNameFull: true,
          groupCode: true,
          groupDesc: true,
          clientPartner: true,
          clientManager: true,
          clientIncharge: true,
          industry: true,
          sector: true,
          active: true,
          typeCode: true,
          typeDesc: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              Project: true,
            },
          },
        },
      });

      return {
        clients,
        pagination: {
          page,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      };
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get clients with pagination'
  );
}

/**
 * Get a single client with paginated projects
 */
export async function getClientWithProjects(
  clientId: number,
  filters: ClientDetailFilters = {}
) {
  return withRetry(
    async () => {
      const {
        projectPage = 1,
        projectLimit = 20,
        serviceLine,
        includeArchived = false,
      } = filters;

      const projectSkip = (projectPage - 1) * Math.min(projectLimit, 50);
      const projectTake = Math.min(projectLimit, 50);

      // Build project where clause
      const projectWhere: any = {};
      if (!includeArchived) {
        projectWhere.archived = false;
      }
      if (serviceLine) {
        projectWhere.serviceLine = serviceLine;
      }

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          Project: {
            where: projectWhere,
            orderBy: { updatedAt: 'desc' },
            skip: projectSkip,
            take: projectTake,
            select: {
              id: true,
              name: true,
              description: true,
              projectType: true,
              serviceLine: true,
              taxYear: true,
              status: true,
              archived: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  MappedAccount: true,
                  TaxAdjustment: true,
                },
              },
            },
          },
          _count: {
            select: {
              Project: true,
            },
          },
        },
      });

      if (!client) {
        return null;
      }

      // Get total project count with filters
      const totalProjects = await prisma.project.count({
        where: {
          clientId,
          ...projectWhere,
        },
      });

      return {
        client,
        totalProjects,
        projectPagination: {
          page: projectPage,
          limit: projectTake,
          total: totalProjects,
          totalPages: Math.ceil(totalProjects / projectTake),
        },
      };
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get client with projects'
  );
}


