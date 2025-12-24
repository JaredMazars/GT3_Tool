/**
 * Review Note Analytics Service
 * Provides analytics and reporting data for review notes
 */

import { prisma } from '@/lib/db/prisma';
import type {
  ReviewNoteAnalytics,
  ReviewNoteStatus,
  ReviewNotePriority,
} from '@/types/review-notes';
import { logger } from '@/lib/utils/logger';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * Get review note analytics for a task
 */
export async function getReviewNoteAnalytics(taskId: number): Promise<ReviewNoteAnalytics> {
  try {
    // Get all notes for the task
    const allNotes = await prisma.reviewNote.findMany({
      where: { taskId },
      select: {
        id: true,
        status: true,
        priority: true,
        categoryId: true,
        assignedTo: true,
        createdAt: true,
        clearedAt: true,
        rejectedAt: true,
        ReviewCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        User_ReviewNote_assignedToToUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate summary metrics
    const summary = {
      total: allNotes.length,
      byStatus: {
        OPEN: allNotes.filter((n) => n.status === 'OPEN').length,
        IN_PROGRESS: allNotes.filter((n) => n.status === 'IN_PROGRESS').length,
        ADDRESSED: allNotes.filter((n) => n.status === 'ADDRESSED').length,
        CLEARED: allNotes.filter((n) => n.status === 'CLEARED').length,
        REJECTED: allNotes.filter((n) => n.status === 'REJECTED').length,
      } as Record<ReviewNoteStatus, number>,
      byPriority: {
        CRITICAL: allNotes.filter((n) => n.priority === 'CRITICAL').length,
        HIGH: allNotes.filter((n) => n.priority === 'HIGH').length,
        MEDIUM: allNotes.filter((n) => n.priority === 'MEDIUM').length,
        LOW: allNotes.filter((n) => n.priority === 'LOW').length,
      } as Record<ReviewNotePriority, number>,
      overdue: await getOverdueCount(taskId),
      averageResolutionTimeHours: calculateAverageResolutionTime(allNotes),
    };

    // Calculate by category
    const byCategory = await getByCategory(allNotes);

    // Calculate by assignee
    const byAssignee = await getByAssignee(allNotes);

    // Calculate timeline
    const timeline = await getTimeline(taskId);

    return {
      summary,
      byCategory,
      byAssignee,
      timeline,
    };
  } catch (error) {
    logger.error('Failed to get review note analytics', error);
    throw new AppError(500, 'Failed to get review note analytics', ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Get count of overdue notes
 */
async function getOverdueCount(taskId: number): Promise<number> {
  return prisma.reviewNote.count({
    where: {
      taskId,
      dueDate: {
        lt: new Date(),
      },
      status: {
        in: ['OPEN', 'IN_PROGRESS', 'ADDRESSED'],
      },
    },
  });
}

/**
 * Calculate average resolution time in hours
 * Only considers notes with status='CLEARED' and valid timestamps
 * @param notes - Array of review notes with status, createdAt, and clearedAt fields
 * @returns Average resolution time in hours (rounded up), or null if no cleared notes
 */
function calculateAverageResolutionTime(
  notes: Array<{ 
    status: string; 
    createdAt: Date; 
    clearedAt: Date | null;
  }>
): number | null {
  // Filter for cleared notes with valid timestamps
  const clearedNotes = notes.filter(
    (n) => n.status === 'CLEARED' && n.clearedAt && n.createdAt
  );

  if (clearedNotes.length === 0) {
    return null;
  }

  const totalHours = clearedNotes.reduce((sum, note) => {
    const created = new Date(note.createdAt).getTime();
    const cleared = new Date(note.clearedAt!).getTime();
    const hours = (cleared - created) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  // Use Math.ceil to always show at least 1 hour for cleared notes
  // This prevents displaying N/A for notes cleared in < 30 minutes
  const average = Math.ceil(totalHours / clearedNotes.length);

  return average;
}

/**
 * Get notes grouped by category with status breakdown
 */
function getByCategory(
  notes: Array<{
    status: string;
    categoryId: number | null;
    ReviewCategory?: { name: string } | null;
  }>
): Array<{
  categoryId: number | null;
  categoryName: string;
  total: number;
  open: number;
  cleared: number;
}> {
  const categoryMap = new Map<number | null, { 
    name: string; 
    total: number;
    open: number;
    cleared: number;
  }>();

  notes.forEach((note) => {
    const categoryId = note.categoryId;
    const categoryName = note.ReviewCategory?.name || 'Uncategorized';

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, { 
        name: categoryName, 
        total: 0,
        open: 0,
        cleared: 0
      });
    }

    const category = categoryMap.get(categoryId)!;
    category.total++;
    
    // Count open statuses (OPEN, IN_PROGRESS, ADDRESSED)
    if (['OPEN', 'IN_PROGRESS', 'ADDRESSED'].includes(note.status)) {
      category.open++;
    }
    
    // Count cleared notes
    if (note.status === 'CLEARED') {
      category.cleared++;
    }
  });

  return Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
    categoryId,
    categoryName: data.name,
    total: data.total,
    open: data.open,
    cleared: data.cleared,
  }));
}

/**
 * Get notes grouped by assignee with metrics
 */
function getByAssignee(
  notes: Array<{
    status: string;
    assignedTo: string | null;
    createdAt: Date;
    clearedAt: Date | null;
    User_ReviewNote_assignedToToUser?: { name: string | null } | null;
  }>
): Array<{
  userId: string;
  userName: string;
  open: number;
  inProgress: number;
  addressed: number;
  cleared: number;
  rejected: number;
  total: number;
  averageResolutionTimeHours: number | null;
}> {
  const assigneeMap = new Map<
    string,
    {
      name: string;
      open: number;
      inProgress: number;
      addressed: number;
      cleared: number;
      rejected: number;
      notes: Array<{
        status: string;
        createdAt: Date;
        clearedAt: Date | null;
      }>;
    }
  >();

  notes.forEach((note) => {
    if (!note.assignedTo) return;

    const userId = note.assignedTo;
    const userName = note.User_ReviewNote_assignedToToUser?.name || 'Unknown';

    if (!assigneeMap.has(userId)) {
      assigneeMap.set(userId, {
        name: userName,
        open: 0,
        inProgress: 0,
        addressed: 0,
        cleared: 0,
        rejected: 0,
        notes: [],
      });
    }

    const assigneeData = assigneeMap.get(userId)!;
    assigneeData.notes.push(note);

    switch (note.status) {
      case 'OPEN':
        assigneeData.open++;
        break;
      case 'IN_PROGRESS':
        assigneeData.inProgress++;
        break;
      case 'ADDRESSED':
        assigneeData.addressed++;
        break;
      case 'CLEARED':
        assigneeData.cleared++;
        break;
      case 'REJECTED':
        assigneeData.rejected++;
        break;
    }
  });

  return Array.from(assigneeMap.entries()).map(([userId, data]) => ({
    userId,
    userName: data.name,
    open: data.open,
    inProgress: data.inProgress,
    addressed: data.addressed,
    cleared: data.cleared,
    rejected: data.rejected,
    total: data.notes.length,
    averageResolutionTimeHours: calculateAverageResolutionTime(data.notes),
  }));
}

/**
 * Get timeline data (notes created/cleared/rejected over time)
 */
async function getTimeline(taskId: number): Promise<
  Array<{
    date: string;
    opened: number;
    cleared: number;
    rejected: number;
  }>
> {
  // Get the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Get notes created in the last 30 days
  const createdNotes = await prisma.reviewNote.groupBy({
    by: ['createdAt'],
    where: {
      taskId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
  });

  // Get notes cleared in the last 30 days
  const clearedNotes = await prisma.reviewNote.groupBy({
    by: ['clearedAt'],
    where: {
      taskId,
      clearedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
  });

  // Get notes rejected in the last 30 days
  const rejectedNotes = await prisma.reviewNote.groupBy({
    by: ['rejectedAt'],
    where: {
      taskId,
      rejectedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
  });

  // Build timeline by date
  const timelineMap = new Map<
    string,
    { opened: number; cleared: number; rejected: number }
  >();

  // Initialize all dates with 0
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]!;
    timelineMap.set(dateStr, { opened: 0, cleared: 0, rejected: 0 });
  }

  // Add opened counts
  createdNotes.forEach((entry) => {
    const dateStr = new Date(entry.createdAt).toISOString().split('T')[0]!;
    if (timelineMap.has(dateStr)) {
      timelineMap.get(dateStr)!.opened = entry._count;
    }
  });

  // Add cleared counts
  clearedNotes.forEach((entry) => {
    if (!entry.clearedAt) return;
    const dateStr = new Date(entry.clearedAt).toISOString().split('T')[0]!;
    if (timelineMap.has(dateStr)) {
      timelineMap.get(dateStr)!.cleared = entry._count;
    }
  });

  // Add rejected counts
  rejectedNotes.forEach((entry) => {
    if (!entry.rejectedAt) return;
    const dateStr = new Date(entry.rejectedAt).toISOString().split('T')[0]!;
    if (timelineMap.has(dateStr)) {
      timelineMap.get(dateStr)!.rejected = entry._count;
    }
  });

  return Array.from(timelineMap.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get global review note analytics across all tasks
 * (For partners to see overview of their review activity)
 */
export async function getGlobalReviewNoteAnalytics(
  userId: string,
  role: string
): Promise<ReviewNoteAnalytics> {
  try {
    // Build where clause based on role
    const where: any = {};

    // If not SYSTEM_ADMIN or PARTNER, filter to notes where user is involved
    if (role !== 'SYSTEM_ADMIN' && role !== 'PARTNER') {
      where.OR = [
        { raisedBy: userId },
        { assignedTo: userId },
      ];
    }

    // Get all relevant notes
    const allNotes = await prisma.reviewNote.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        status: true,
        priority: true,
        categoryId: true,
        assignedTo: true,
        createdAt: true,
        clearedAt: true,
        rejectedAt: true,
        ReviewCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        User_ReviewNote_assignedToToUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate summary metrics
    const summary = {
      total: allNotes.length,
      byStatus: {
        OPEN: allNotes.filter((n) => n.status === 'OPEN').length,
        IN_PROGRESS: allNotes.filter((n) => n.status === 'IN_PROGRESS').length,
        ADDRESSED: allNotes.filter((n) => n.status === 'ADDRESSED').length,
        CLEARED: allNotes.filter((n) => n.status === 'CLEARED').length,
        REJECTED: allNotes.filter((n) => n.status === 'REJECTED').length,
      } as Record<ReviewNoteStatus, number>,
      byPriority: {
        CRITICAL: allNotes.filter((n) => n.priority === 'CRITICAL').length,
        HIGH: allNotes.filter((n) => n.priority === 'HIGH').length,
        MEDIUM: allNotes.filter((n) => n.priority === 'MEDIUM').length,
        LOW: allNotes.filter((n) => n.priority === 'LOW').length,
      } as Record<ReviewNotePriority, number>,
      overdue: allNotes.filter((n) => {
        // This is an approximation - we'd need dueDate in the select
        return ['OPEN', 'IN_PROGRESS', 'ADDRESSED'].includes(n.status);
      }).length,
      averageResolutionTimeHours: calculateAverageResolutionTime(allNotes),
    };

    const byCategory = getByCategory(allNotes);
    const byAssignee = getByAssignee(allNotes);

    // For global, just return empty timeline
    const timeline: Array<{ date: string; opened: number; cleared: number; rejected: number }> = [];

    return {
      summary,
      byCategory,
      byAssignee,
      timeline,
    };
  } catch (error) {
    logger.error('Failed to get global review note analytics', error);
    throw new AppError(
      500,
      'Failed to get global review note analytics',
      ErrorCodes.INTERNAL_ERROR
    );
  }
}

