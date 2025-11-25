/**
 * Business Development Analytics Service
 * Handles analytics calculations for BD pipeline
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export interface PipelineMetrics {
  totalValue: number;
  weightedValue: number;
  opportunityCount: number;
  byStage: {
    stageName: string;
    stageColor: string | null;
    count: number;
    totalValue: number;
    weightedValue: number;
  }[];
}

export interface ConversionMetrics {
  totalOpportunities: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  winRate: number;
  lossRate: number;
  avgDealSize: number;
  avgSalesCycle: number; // Days
}

export interface ForecastMetrics {
  thisMonth: {
    expected: number;
    actual: number;
  };
  nextMonth: {
    expected: number;
  };
  thisQuarter: {
    expected: number;
    actual: number;
  };
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  opportunitiesWon: number;
  totalValue: number;
  avgDealSize: number;
  winRate: number;
}

/**
 * Get pipeline metrics by stage
 */
export async function getPipelineMetrics(filters: {
  serviceLine?: string;
  assignedTo?: string;
}): Promise<PipelineMetrics> {
  const { serviceLine, assignedTo } = filters;

  const where: Prisma.BDOpportunityWhereInput = {
    status: 'OPEN',
    ...(serviceLine && { serviceLine }),
    ...(assignedTo && { assignedTo }),
  };

  const opportunities = await prisma.bDOpportunity.findMany({
    where,
    include: {
      Stage: {
        select: {
          name: true,
          color: true,
          probability: true,
        },
      },
    },
  });

  let totalValue = 0;
  let weightedValue = 0;
  const stageMetrics: Record<
    string,
    {
      stageName: string;
      stageColor: string | null;
      count: number;
      totalValue: number;
      weightedValue: number;
    }
  > = {};

  for (const opp of opportunities) {
    const value = opp.value || 0;
    const probability = (opp.probability || opp.Stage.probability) / 100;

    totalValue += value;
    weightedValue += value * probability;

    const stageName = opp.Stage.name;
    if (!stageMetrics[stageName]) {
      stageMetrics[stageName] = {
        stageName,
        stageColor: opp.Stage.color,
        count: 0,
        totalValue: 0,
        weightedValue: 0,
      };
    }

    stageMetrics[stageName].count++;
    stageMetrics[stageName].totalValue += value;
    stageMetrics[stageName].weightedValue += value * probability;
  }

  return {
    totalValue,
    weightedValue,
    opportunityCount: opportunities.length,
    byStage: Object.values(stageMetrics),
  };
}

/**
 * Get conversion metrics (win/loss rates, etc.)
 */
export async function getConversionMetrics(filters: {
  serviceLine?: string;
  assignedTo?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<ConversionMetrics> {
  const { serviceLine, assignedTo, fromDate, toDate } = filters;

  const where: Prisma.BDOpportunityWhereInput = {
    ...(serviceLine && { serviceLine }),
    ...(assignedTo && { assignedTo }),
    ...(fromDate && { createdAt: { gte: fromDate } }),
    ...(toDate && { createdAt: { lte: toDate } }),
  };

  const [totalOpportunities, wonCount, lostCount, openCount, wonOpportunities] = await Promise.all([
    prisma.bDOpportunity.count({ where }),
    prisma.bDOpportunity.count({ where: { ...where, status: 'WON' } }),
    prisma.bDOpportunity.count({ where: { ...where, status: 'LOST' } }),
    prisma.bDOpportunity.count({ where: { ...where, status: 'OPEN' } }),
    prisma.bDOpportunity.findMany({
      where: { ...where, status: 'WON' },
      select: {
        value: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;
  const lossRate = closedCount > 0 ? (lostCount / closedCount) * 100 : 0;

  // Calculate average deal size
  let totalValue = 0;
  let salesCycleDays = 0;

  for (const opp of wonOpportunities) {
    totalValue += opp.value || 0;

    // Calculate days from creation to close (updated)
    const days = Math.floor(
      (opp.updatedAt.getTime() - opp.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    salesCycleDays += days;
  }

  const avgDealSize = wonCount > 0 ? totalValue / wonCount : 0;
  const avgSalesCycle = wonCount > 0 ? salesCycleDays / wonCount : 0;

  return {
    totalOpportunities,
    wonCount,
    lostCount,
    openCount,
    winRate,
    lossRate,
    avgDealSize,
    avgSalesCycle,
  };
}

/**
 * Get forecast metrics
 */
export async function getForecastMetrics(filters: {
  serviceLine?: string;
  assignedTo?: string;
}): Promise<ForecastMetrics> {
  const { serviceLine, assignedTo } = filters;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const thisQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

  const baseWhere: Prisma.BDOpportunityWhereInput = {
    ...(serviceLine && { serviceLine }),
    ...(assignedTo && { assignedTo }),
  };

  // This month expected (open opportunities expected to close this month)
  const thisMonthExpectedOpps = await prisma.bDOpportunity.findMany({
    where: {
      ...baseWhere,
      status: 'OPEN',
      expectedCloseDate: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
    },
    include: {
      Stage: {
        select: {
          probability: true,
        },
      },
    },
  });

  let thisMonthExpected = 0;
  for (const opp of thisMonthExpectedOpps) {
    const value = opp.value || 0;
    const probability = (opp.probability || opp.Stage.probability) / 100;
    thisMonthExpected += value * probability;
  }

  // This month actual (won this month)
  const thisMonthActualOpps = await prisma.bDOpportunity.findMany({
    where: {
      ...baseWhere,
      status: 'WON',
      updatedAt: {
        gte: thisMonthStart,
        lte: now,
      },
    },
    select: {
      value: true,
    },
  });

  const thisMonthActual = thisMonthActualOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);

  // Next month expected
  const nextMonthExpectedOpps = await prisma.bDOpportunity.findMany({
    where: {
      ...baseWhere,
      status: 'OPEN',
      expectedCloseDate: {
        gte: nextMonthStart,
        lte: nextMonthEnd,
      },
    },
    include: {
      Stage: {
        select: {
          probability: true,
        },
      },
    },
  });

  let nextMonthExpected = 0;
  for (const opp of nextMonthExpectedOpps) {
    const value = opp.value || 0;
    const probability = (opp.probability || opp.Stage.probability) / 100;
    nextMonthExpected += value * probability;
  }

  // This quarter expected
  const thisQuarterExpectedOpps = await prisma.bDOpportunity.findMany({
    where: {
      ...baseWhere,
      status: 'OPEN',
      expectedCloseDate: {
        gte: thisQuarterStart,
        lte: thisQuarterEnd,
      },
    },
    include: {
      Stage: {
        select: {
          probability: true,
        },
      },
    },
  });

  let thisQuarterExpected = 0;
  for (const opp of thisQuarterExpectedOpps) {
    const value = opp.value || 0;
    const probability = (opp.probability || opp.Stage.probability) / 100;
    thisQuarterExpected += value * probability;
  }

  // This quarter actual
  const thisQuarterActualOpps = await prisma.bDOpportunity.findMany({
    where: {
      ...baseWhere,
      status: 'WON',
      updatedAt: {
        gte: thisQuarterStart,
        lte: now,
      },
    },
    select: {
      value: true,
    },
  });

  const thisQuarterActual = thisQuarterActualOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);

  return {
    thisMonth: {
      expected: thisMonthExpected,
      actual: thisMonthActual,
    },
    nextMonth: {
      expected: nextMonthExpected,
    },
    thisQuarter: {
      expected: thisQuarterExpected,
      actual: thisQuarterActual,
    },
  };
}

/**
 * Get leaderboard (top performers)
 */
export async function getLeaderboard(filters: {
  serviceLine?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}): Promise<LeaderboardEntry[]> {
  const { serviceLine, fromDate, toDate, limit = 10 } = filters;

  const where: Prisma.BDOpportunityWhereInput = {
    ...(serviceLine && { serviceLine }),
    ...(fromDate && { updatedAt: { gte: fromDate } }),
    ...(toDate && { updatedAt: { lte: toDate } }),
  };

  // Get all opportunities for each user
  const opportunities = await prisma.bDOpportunity.findMany({
    where,
    select: {
      assignedTo: true,
      status: true,
      value: true,
    },
  });

  // Group by user
  const userStats: Record<
    string,
    {
      userId: string;
      wonCount: number;
      totalValue: number;
      totalCount: number;
      lostCount: number;
    }
  > = {};

  for (const opp of opportunities) {
    if (!userStats[opp.assignedTo]) {
      userStats[opp.assignedTo] = {
        userId: opp.assignedTo,
        wonCount: 0,
        totalValue: 0,
        totalCount: 0,
        lostCount: 0,
      };
    }

    userStats[opp.assignedTo].totalCount++;

    if (opp.status === 'WON') {
      userStats[opp.assignedTo].wonCount++;
      userStats[opp.assignedTo].totalValue += opp.value || 0;
    } else if (opp.status === 'LOST') {
      userStats[opp.assignedTo].lostCount++;
    }
  }

  // Convert to leaderboard entries and sort
  const leaderboard: LeaderboardEntry[] = Object.values(userStats)
    .map((stats) => ({
      userId: stats.userId,
      userName: stats.userId, // TODO: Fetch actual user name
      opportunitiesWon: stats.wonCount,
      totalValue: stats.totalValue,
      avgDealSize: stats.wonCount > 0 ? stats.totalValue / stats.wonCount : 0,
      winRate:
        stats.wonCount + stats.lostCount > 0
          ? (stats.wonCount / (stats.wonCount + stats.lostCount)) * 100
          : 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue) // Sort by total value
    .slice(0, limit);

  return leaderboard;
}

/**
 * Get activity summary
 */
export async function getActivitySummary(filters: {
  serviceLine?: string;
  assignedTo?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<{
  totalActivities: number;
  completedActivities: number;
  upcomingActivities: number;
  overdueActivities: number;
  byType: Record<string, number>;
}> {
  const { serviceLine, assignedTo, fromDate, toDate } = filters;

  // Build where clause for opportunities
  const oppWhere: Prisma.BDOpportunityWhereInput = {
    ...(serviceLine && { serviceLine }),
  };

  // Get opportunity IDs matching the filter
  const opportunities = await prisma.bDOpportunity.findMany({
    where: oppWhere,
    select: { id: true },
  });

  const opportunityIds = opportunities.map((o) => o.id);

  // Build where clause for activities
  const activityWhere: Prisma.BDActivityWhereInput = {
    opportunityId: { in: opportunityIds },
    ...(assignedTo && { assignedTo }),
    ...(fromDate && { createdAt: { gte: fromDate } }),
    ...(toDate && { createdAt: { lte: toDate } }),
  };

  const [totalActivities, completedActivities, upcomingActivities, overdueActivities, activities] =
    await Promise.all([
      prisma.bDActivity.count({ where: activityWhere }),
      prisma.bDActivity.count({ where: { ...activityWhere, status: 'COMPLETED' } }),
      prisma.bDActivity.count({
        where: {
          ...activityWhere,
          status: 'SCHEDULED',
          dueDate: { gte: new Date() },
        },
      }),
      prisma.bDActivity.count({
        where: {
          ...activityWhere,
          status: 'SCHEDULED',
          dueDate: { lt: new Date() },
        },
      }),
      prisma.bDActivity.findMany({
        where: activityWhere,
        select: { activityType: true },
      }),
    ]);

  // Group by activity type
  const byType: Record<string, number> = {};
  for (const activity of activities) {
    byType[activity.activityType] = (byType[activity.activityType] || 0) + 1;
  }

  return {
    totalActivities,
    completedActivities,
    upcomingActivities,
    overdueActivities,
    byType,
  };
}

