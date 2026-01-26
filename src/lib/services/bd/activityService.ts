/**
 * Business Development Activity Service
 * Handles activity management and reminders
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export interface ActivityWithRelations {
  id: number;
  opportunityId: number;
  contactId: number | null;
  activityType: string;
  subject: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
  duration: number | null;
  location: string | null;
  assignedTo: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  BDOpportunity: {
    id: number;
    title: string;
    companyName: string | null;
  };
  BDContact: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
}

/**
 * Get activities with filters
 */
export async function getActivities(filters: {
  opportunityId?: number;
  activityType?: string;
  status?: string;
  assignedTo?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}): Promise<{ activities: ActivityWithRelations[]; total: number }> {
  const {
    opportunityId,
    activityType,
    status,
    assignedTo,
    fromDate,
    toDate,
    page = 1,
    pageSize = 20,
  } = filters;

  const where: Prisma.BDActivityWhereInput = {
    ...(opportunityId && { opportunityId }),
    ...(activityType && { activityType }),
    ...(status && { status }),
    ...(assignedTo && { assignedTo }),
    ...(fromDate && { createdAt: { gte: fromDate } }),
    ...(toDate && { createdAt: { lte: toDate } }),
  };

  const [activities, total] = await Promise.all([
    prisma.bDActivity.findMany({
      where,
      include: {
        BDOpportunity: {
          select: {
            id: true,
            title: true,
            companyName: true,
          },
        },
        BDContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bDActivity.count({ where }),
  ]);

  return { activities: activities as ActivityWithRelations[], total };
}

/**
 * Get upcoming activities for a user
 */
export async function getUpcomingActivities(
  userId: string,
  days: number = 7
): Promise<ActivityWithRelations[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const activities = await prisma.bDActivity.findMany({
    where: {
      assignedTo: userId,
      status: 'SCHEDULED',
      dueDate: {
        gte: now,
        lte: futureDate,
      },
    },
    include: {
      BDOpportunity: {
        select: {
          id: true,
          title: true,
          companyName: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 100,
  });

  return activities as ActivityWithRelations[];
}

/**
 * Get overdue activities for a user
 */
export async function getOverdueActivities(userId: string): Promise<ActivityWithRelations[]> {
  const now = new Date();

  const activities = await prisma.bDActivity.findMany({
    where: {
      assignedTo: userId,
      status: 'SCHEDULED',
      dueDate: {
        lt: now,
      },
    },
    include: {
      BDOpportunity: {
        select: {
          id: true,
          title: true,
          companyName: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 100,
  });

  return activities as ActivityWithRelations[];
}

/**
 * Get activity timeline for an opportunity
 */
export async function getOpportunityTimeline(
  opportunityId: number
): Promise<ActivityWithRelations[]> {
  const activities = await prisma.bDActivity.findMany({
    where: {
      opportunityId,
    },
    include: {
      BDOpportunity: {
        select: {
          id: true,
          title: true,
          companyName: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return activities as ActivityWithRelations[];
}

/**
 * Create a new activity
 */
export async function createActivity(data: {
  opportunityId: number;
  contactId?: number;
  activityType: string;
  subject: string;
  description?: string;
  status?: string;
  dueDate?: Date;
  duration?: number;
  location?: string;
  assignedTo: string;
  createdBy: string;
}): Promise<ActivityWithRelations> {
  const activity = await prisma.bDActivity.create({
    data: {
      opportunityId: data.opportunityId,
      contactId: data.contactId,
      activityType: data.activityType,
      subject: data.subject,
      description: data.description,
      status: data.status || 'SCHEDULED',
      dueDate: data.dueDate,
      duration: data.duration,
      location: data.location,
      assignedTo: data.assignedTo,
      createdBy: data.createdBy,
      updatedAt: new Date(),
    },
    include: {
      BDOpportunity: {
        select: {
          id: true,
          title: true,
          companyName: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return activity as ActivityWithRelations;
}

/**
 * Update an activity
 */
export async function updateActivity(
  activityId: number,
  data: Partial<{
    contactId: number | null;
    activityType: string;
    subject: string;
    description: string | null;
    status: string;
    dueDate: Date | null;
    completedAt: Date | null;
    duration: number | null;
    location: string | null;
    assignedTo: string;
  }>
): Promise<ActivityWithRelations> {
  const activity = await prisma.bDActivity.update({
    where: { id: activityId },
    data,
    include: {
      BDOpportunity: {
        select: {
          id: true,
          title: true,
          companyName: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return activity as ActivityWithRelations;
}

/**
 * Mark activity as completed
 */
export async function completeActivity(activityId: number): Promise<ActivityWithRelations> {
  return updateActivity(activityId, {
    status: 'COMPLETED',
    completedAt: new Date(),
  });
}

/**
 * Cancel an activity
 */
export async function cancelActivity(activityId: number): Promise<ActivityWithRelations> {
  return updateActivity(activityId, {
    status: 'CANCELLED',
  });
}

/**
 * Delete an activity
 */
export async function deleteActivity(activityId: number): Promise<void> {
  await prisma.bDActivity.delete({
    where: { id: activityId },
  });
}

/**
 * Get activity count for an opportunity
 */
export async function getActivityCountByOpportunity(
  opportunityId: number
): Promise<{
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}> {
  const [total, scheduled, completed, cancelled] = await Promise.all([
    prisma.bDActivity.count({ where: { opportunityId } }),
    prisma.bDActivity.count({ where: { opportunityId, status: 'SCHEDULED' } }),
    prisma.bDActivity.count({ where: { opportunityId, status: 'COMPLETED' } }),
    prisma.bDActivity.count({ where: { opportunityId, status: 'CANCELLED' } }),
  ]);

  return { total, scheduled, completed, cancelled };
}

/**
 * Get last activity for an opportunity
 */
export async function getLastActivity(
  opportunityId: number
): Promise<ActivityWithRelations | null> {
  const activity = await prisma.bDActivity.findFirst({
    where: {
      opportunityId,
      status: 'COMPLETED',
    },
    include: {
      BDOpportunity: {
        select: {
          id: true,
          title: true,
          companyName: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  return activity as ActivityWithRelations | null;
}

/**
 * Get next scheduled activity for an opportunity
 */
export async function getNextActivity(
  opportunityId: number
): Promise<ActivityWithRelations | null> {
  const now = new Date();

  const activity = await prisma.bDActivity.findFirst({
    where: {
      opportunityId,
      status: 'SCHEDULED',
      dueDate: { gte: now },
    },
    include: {
      BDOpportunity: {
        select: {
          id: true,
          title: true,
          companyName: true,
        },
      },
      BDContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  return activity as ActivityWithRelations | null;
}


