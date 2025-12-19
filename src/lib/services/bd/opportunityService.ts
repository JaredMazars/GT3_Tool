/**
 * Business Development Opportunity Service
 * Handles business logic for BD opportunities
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export interface OpportunityWithRelations {
  id: number;
  title: string;
  description: string | null;
  clientId: number | null;  // Renamed from GSClientID for clarity
  companyName: string | null;
  serviceLine: string;
  value: number | null;
  probability: number | null;
  expectedCloseDate: Date | null;
  source: string | null;
  status: string;
  lostReason: string | null;
  assignedTo: string;
  convertedToClientId: number | null;  // Renamed for clarity
  convertedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  Client: {
    id: number;
    clientCode: string;
    clientNameFull: string | null;
  } | null;
  BDContact: {
    id: number;
    companyName: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  BDStage: {
    id: number;
    name: string;
    probability: number;
    color: string | null;
  };
}

/**
 * Get all opportunities with filters
 */
export async function getOpportunities(filters: {
  serviceLine?: string;
  stageId?: number;
  status?: string;
  assignedTo?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}): Promise<{ opportunities: OpportunityWithRelations[]; total: number }> {
  const {
    serviceLine,
    stageId,
    status = 'OPEN',
    assignedTo,
    search,
    fromDate,
    toDate,
    page = 1,
    pageSize = 20,
  } = filters;

  const where: Prisma.BDOpportunityWhereInput = {
    ...(serviceLine && { serviceLine }),
    ...(stageId && { stageId }),
    ...(status && { status }),
    ...(assignedTo && { assignedTo }),
    ...(search && {
      OR: [
        { title: { contains: search } },
        { companyName: { contains: search } },
        { description: { contains: search } },
      ],
    }),
    ...(fromDate && { createdAt: { gte: fromDate } }),
    ...(toDate && { createdAt: { lte: toDate } }),
  };

  const [opportunities, total] = await Promise.all([
    prisma.bDOpportunity.findMany({
      where,
      include: {
        Client: {
          select: {
            id: true,
            clientCode: true,
            clientNameFull: true,
          },
        },
        BDContact: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        BDStage: {
          select: {
            id: true,
            name: true,
            probability: true,
            color: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bDOpportunity.count({ where }),
  ]);

  return { opportunities: opportunities as OpportunityWithRelations[], total };
}

/**
 * Get a single opportunity by ID with all relations
 */
export async function getOpportunityById(
  opportunityId: number
): Promise<OpportunityWithRelations | null> {
  const opportunity = await prisma.bDOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      Client: {
        select: {
          id: true,
          clientCode: true,
          clientNameFull: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      BDStage: {
        select: {
          id: true,
          name: true,
          probability: true,
          color: true,
        },
      },
    },
  });

  return opportunity as OpportunityWithRelations | null;
}

/**
 * Get opportunities grouped by stage (pipeline view)
 */
export async function getPipelineView(filters: {
  serviceLine?: string;
  assignedTo?: string;
}): Promise<Record<string, OpportunityWithRelations[]>> {
  const { serviceLine, assignedTo } = filters;

  const where: Prisma.BDOpportunityWhereInput = {
    status: 'OPEN',
    ...(serviceLine && { serviceLine }),
    ...(assignedTo && { assignedTo }),
  };

  const opportunities = await prisma.bDOpportunity.findMany({
    where,
    include: {
      Client: {
        select: {
          id: true,
          clientCode: true,
          clientNameFull: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      BDStage: {
        select: {
          id: true,
          name: true,
          probability: true,
          color: true,
        },
      },
    },
    orderBy: [{ BDStage: { order: 'asc' } }, { updatedAt: 'desc' }],
    take: 500, // Limit for performance
  });

  // Group by stage name
  const pipeline: Record<string, OpportunityWithRelations[]> = {};
  for (const opp of opportunities as OpportunityWithRelations[]) {
    const stageName = opp.BDStage.name;
    if (!pipeline[stageName]) {
      pipeline[stageName] = [];
    }
    pipeline[stageName].push(opp);
  }

  return pipeline;
}

/**
 * Create a new opportunity
 */
export async function createOpportunity(data: {
  title: string;
  description?: string;
  clientId?: number;  // Renamed for clarity
  companyName?: string;
  contactId?: number;
  serviceLine: string;
  stageId: number;
  value?: number;
  probability?: number;
  expectedCloseDate?: Date;
  source?: string;
  assignedTo: string;
  createdBy: string;
}): Promise<OpportunityWithRelations> {
  const opportunity = await prisma.bDOpportunity.create({
    data: {
      title: data.title,
      description: data.description,
      clientId: data.clientId,
      companyName: data.companyName,
      contactId: data.contactId,
      serviceLine: data.serviceLine,
      stageId: data.stageId,
      value: data.value,
      probability: data.probability,
      expectedCloseDate: data.expectedCloseDate,
      source: data.source,
      status: 'OPEN',
      assignedTo: data.assignedTo,
      createdBy: data.createdBy,
    },
    include: {
      Client: {
        select: {
          id: true,
          clientCode: true,
          clientNameFull: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      BDStage: {
        select: {
          id: true,
          name: true,
          probability: true,
          color: true,
        },
      },
    },
  });

  return opportunity as OpportunityWithRelations;
}

/**
 * Update an opportunity
 */
export async function updateOpportunity(
  opportunityId: number,
  data: Partial<{
    title: string;
    description: string | null;
    clientId: number | null;  // Renamed for clarity
    companyName: string | null;
    contactId: number | null;
    stageId: number;
    value: number | null;
    probability: number | null;
    expectedCloseDate: Date | null;
    source: string | null;
    status: string;
    lostReason: string | null;
    assignedTo: string;
  }>
): Promise<OpportunityWithRelations> {
  const opportunity = await prisma.bDOpportunity.update({
    where: { id: opportunityId },
    data,
    include: {
      Client: {
        select: {
          id: true,
          clientCode: true,
          clientNameFull: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      BDStage: {
        select: {
          id: true,
          name: true,
          probability: true,
          color: true,
        },
      },
    },
  });

  return opportunity as OpportunityWithRelations;
}

/**
 * Move opportunity to a different stage
 */
export async function moveToStage(
  opportunityId: number,
  stageId: number
): Promise<OpportunityWithRelations> {
  return updateOpportunity(opportunityId, { stageId });
}

/**
 * Mark opportunity as won
 */
export async function markAsWon(opportunityId: number): Promise<OpportunityWithRelations> {
  // Find the "Won" stage
  const wonStage = await prisma.bDStage.findFirst({
    where: {
      name: 'Won',
      isActive: true,
    },
  });

  if (!wonStage) {
    throw new Error('Won stage not found');
  }

  return updateOpportunity(opportunityId, {
    stageId: wonStage.id,
    status: 'WON',
  });
}

/**
 * Mark opportunity as lost
 */
export async function markAsLost(
  opportunityId: number,
  lostReason?: string
): Promise<OpportunityWithRelations> {
  // Find the "Lost" stage
  const lostStage = await prisma.bDStage.findFirst({
    where: {
      name: 'Lost',
      isActive: true,
    },
  });

  if (!lostStage) {
    throw new Error('Lost stage not found');
  }

  return updateOpportunity(opportunityId, {
    stageId: lostStage.id,
    status: 'LOST',
    lostReason,
  });
}

/**
 * Delete an opportunity
 */
export async function deleteOpportunity(opportunityId: number): Promise<void> {
  await prisma.bDOpportunity.delete({
    where: { id: opportunityId },
  });
}

/**
 * Get opportunity count by status
 */
export async function getOpportunityCountByStatus(filters: {
  serviceLine?: string;
  assignedTo?: string;
}): Promise<Record<string, number>> {
  const { serviceLine, assignedTo } = filters;

  const where: Prisma.BDOpportunityWhereInput = {
    ...(serviceLine && { serviceLine }),
    ...(assignedTo && { assignedTo }),
  };

  const counts = await prisma.bDOpportunity.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  const result: Record<string, number> = {};
  for (const count of counts) {
    result[count.status] = count._count;
  }

  return result;
}

/**
 * Calculate weighted pipeline value
 */
export async function getWeightedPipelineValue(filters: {
  serviceLine?: string;
  assignedTo?: string;
}): Promise<number> {
  const { serviceLine, assignedTo } = filters;

  const where: Prisma.BDOpportunityWhereInput = {
    status: 'OPEN',
    value: { not: null },
    ...(serviceLine && { serviceLine }),
    ...(assignedTo && { assignedTo }),
  };

  const opportunities = await prisma.bDOpportunity.findMany({
    where,
    include: {
      BDStage: {
        select: {
          probability: true,
        },
      },
    },
    take: 1000, // Limit for performance
  });

  let weightedValue = 0;
  for (const opp of opportunities) {
    const value = opp.value || 0;
    const probability = (opp.probability || opp.BDStage.probability) / 100;
    weightedValue += value * probability;
  }

  return weightedValue;
}


