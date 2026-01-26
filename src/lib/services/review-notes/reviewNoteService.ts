/**
 * Review Note Service
 * Core business logic for review notes CRUD operations
 */

import { prisma } from '@/lib/db/prisma';
import type {
  ReviewNoteWithRelations,
  CreateReviewNoteDTO,
  UpdateReviewNoteDTO,
  ReviewNoteFilterDTO,
  ReviewNoteListResponse,
  ReviewNoteStatus,
  StatusTransition,
} from '@/types/review-notes';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';

/**
 * Status transition rules
 * RAISER: Person who created/raised the review note (usually a partner/reviewer)
 * ASSIGNEE: Person assigned to address the review note (team member)
 * PARTNER: Any partner (has full permissions)
 * SYSTEM_ADMIN: System administrator (has unrestricted access)
 */
const STATUS_TRANSITIONS: StatusTransition[] = [
  // From OPEN
  { from: 'OPEN' as ReviewNoteStatus, to: 'IN_PROGRESS' as ReviewNoteStatus, allowedRoles: ['ASSIGNEE', 'RAISER', 'PARTNER', 'SYSTEM_ADMIN'] },
  { from: 'OPEN' as ReviewNoteStatus, to: 'ADDRESSED' as ReviewNoteStatus, allowedRoles: ['ASSIGNEE', 'PARTNER', 'SYSTEM_ADMIN'] },
  { from: 'OPEN' as ReviewNoteStatus, to: 'CLEARED' as ReviewNoteStatus, allowedRoles: ['RAISER', 'PARTNER', 'SYSTEM_ADMIN'] },
  { from: 'OPEN' as ReviewNoteStatus, to: 'REJECTED' as ReviewNoteStatus, allowedRoles: ['RAISER', 'PARTNER', 'SYSTEM_ADMIN'] },
  
  // From IN_PROGRESS
  { from: 'IN_PROGRESS' as ReviewNoteStatus, to: 'ADDRESSED' as ReviewNoteStatus, allowedRoles: ['ASSIGNEE', 'PARTNER', 'SYSTEM_ADMIN'] },
  { from: 'IN_PROGRESS' as ReviewNoteStatus, to: 'OPEN' as ReviewNoteStatus, allowedRoles: ['ASSIGNEE', 'RAISER', 'PARTNER', 'SYSTEM_ADMIN'] },
  
  // From ADDRESSED
  { from: 'ADDRESSED' as ReviewNoteStatus, to: 'CLEARED' as ReviewNoteStatus, allowedRoles: ['RAISER', 'PARTNER', 'SYSTEM_ADMIN'] },
  { from: 'ADDRESSED' as ReviewNoteStatus, to: 'REJECTED' as ReviewNoteStatus, allowedRoles: ['RAISER', 'PARTNER', 'SYSTEM_ADMIN'] },
  { from: 'ADDRESSED' as ReviewNoteStatus, to: 'IN_PROGRESS' as ReviewNoteStatus, allowedRoles: ['ASSIGNEE', 'PARTNER', 'SYSTEM_ADMIN'] },
];

/**
 * Select configuration for review note queries
 */
const reviewNoteSelect = {
  id: true,
  taskId: true,
  title: true,
  description: true,
  referenceUrl: true,
  referenceType: true,
  referenceId: true,
  section: true,
  status: true,
  priority: true,
  categoryId: true,
  dueDate: true,
  raisedBy: true,
  assignedTo: true,
  currentOwner: true,
  lastRespondedBy: true,
  lastRespondedAt: true,
  addressedAt: true,
  addressedBy: true,
  addressedComment: true,
  clearedAt: true,
  clearedBy: true,
  clearanceComment: true,
  rejectedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  Task: {
    select: {
      id: true,
      TaskCode: true,
      TaskDesc: true,
    },
  },
  ReviewCategory: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  User_ReviewNote_raisedByToUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  User_ReviewNote_assignedToToUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  User_ReviewNote_currentOwnerToUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  User_ReviewNote_lastRespondedByToUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  User_ReviewNote_addressedByToUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  User_ReviewNote_clearedByToUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: {
      ReviewNoteComment: true,
      ReviewNoteAttachment: true,
      ReviewNoteAssignee: true,
    },
  },
  ReviewNoteAssignee: {
    select: {
      id: true,
      reviewNoteId: true,
      userId: true,
      assignedBy: true,
      assignedAt: true,
      isForwarded: true,
      User_ReviewNoteAssignee_userIdToUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      User_ReviewNoteAssignee_assignedByToUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      assignedAt: 'asc' as const,
    },
  },
};

/**
 * Create a new review note
 */
export async function createReviewNote(
  data: CreateReviewNoteDTO,
  raisedBy: string
): Promise<ReviewNoteWithRelations> {
  try {
    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      select: { id: true },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Verify category exists if provided
    if (data.categoryId) {
      const category = await prisma.reviewCategory.findUnique({
        where: { id: data.categoryId },
        select: { id: true, active: true },
      });

      if (!category) {
        throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
      }

      if (!category.active) {
        throw new AppError(400, 'Category is not active', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Verify assignee exists and is part of task team if provided
    if (data.assignedTo) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assignedTo },
        select: { id: true },
      });

      if (!assignee) {
        throw new AppError(404, 'Assignee user not found', ErrorCodes.NOT_FOUND);
      }

      // Check if assignee is in task team
      const teamMember = await prisma.taskTeam.findFirst({
        where: {
          taskId: data.taskId,
          userId: data.assignedTo,
        },
      });

      if (!teamMember) {
        throw new AppError(
          400,
          'Assignee must be a member of the task team',
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    // Create the review note and assignees in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Extract assignees from data (not a ReviewNote field - handled separately)
      const { assignees, ...reviewNoteData } = data;
      
      // Create the review note
      const reviewNote = await tx.reviewNote.create({
        data: {
          ...reviewNoteData,
          raisedBy,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          updatedAt: new Date(),
        },
        select: reviewNoteSelect,
      });

      // Create assignee records for the new workflow system
      const assigneesList = assignees || (data.assignedTo ? [data.assignedTo] : []);
      
      if (assigneesList.length > 0) {
        await tx.reviewNoteAssignee.createMany({
          data: assigneesList.map(userId => ({
            reviewNoteId: reviewNote.id,
            userId: userId,
            assignedBy: raisedBy,
            isForwarded: false,
          })),
        });
      }

      return reviewNote;
    });

    logger.info('Review note created', {
      reviewNoteId: result.id,
      taskId: data.taskId,
      raisedBy,
      assigneesCount: (data.assignees || (data.assignedTo ? [data.assignedTo] : [])).length,
    });

    return result as ReviewNoteWithRelations;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to create review note', error);
    throw new AppError(500, 'Failed to create review note', ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Get a single review note by ID
 */
export async function getReviewNoteById(
  id: number,
  includeComments = false,
  includeAttachments = false
): Promise<ReviewNoteWithRelations> {
  try {
    const select: any = { ...reviewNoteSelect };

    if (includeComments) {
      select.ReviewNoteComment = {
        select: {
          id: true,
          reviewNoteId: true,
          userId: true,
          comment: true,
          isInternal: true,
          createdAt: true,
          updatedAt: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      };
    }

    if (includeAttachments) {
      select.ReviewNoteAttachment = {
        select: {
          id: true,
          reviewNoteId: true,
          fileName: true,
          filePath: true,
          fileSize: true,
          fileType: true,
          uploadedBy: true,
          createdAt: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      };
    }

    const reviewNote = await prisma.reviewNote.findUnique({
      where: { id },
      select,
    });

    if (!reviewNote) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    return reviewNote as unknown as ReviewNoteWithRelations;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to get review note', error);
    throw new AppError(500, 'Failed to get review note', ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * List review notes with filters and pagination
 */
export async function listReviewNotes(
  filters: ReviewNoteFilterDTO
): Promise<ReviewNoteListResponse> {
  try {
    const {
      taskId,
      status,
      priority,
      categoryId,
      assignedTo,
      raisedBy,
      dueDateFrom,
      dueDateTo,
      overdue,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build where clause
    const where: any = {};

    if (taskId) {
      where.taskId = taskId;
    }

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (priority) {
      where.priority = Array.isArray(priority) ? { in: priority } : priority;
    }

    if (categoryId) {
      where.categoryId = Array.isArray(categoryId) ? { in: categoryId } : categoryId;
    }

    // Assignee filter - check ReviewNoteAssignee table for multiple assignees support
    if (assignedTo) {
      const assigneeIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      where.ReviewNoteAssignee = {
        some: {
          userId: { in: assigneeIds },
        },
      };
    }

    // Raised by filter - supports array
    if (raisedBy) {
      if (Array.isArray(raisedBy)) {
        where.raisedBy = { in: raisedBy };
      } else {
        where.raisedBy = raisedBy;
      }
    }

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) {
        where.dueDate.gte = new Date(dueDateFrom);
      }
      if (dueDateTo) {
        where.dueDate.lte = new Date(dueDateTo);
      }
    }

    if (overdue) {
      where.dueDate = {
        ...where.dueDate,
        lt: new Date(),
      };
      where.status = {
        in: ['OPEN', 'IN_PROGRESS', 'ADDRESSED'],
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Get total count
    const total = await prisma.reviewNote.count({ where });

    // Get paginated results
    const skip = (page - 1) * limit;
    const notes = await prisma.reviewNote.findMany({
      where,
      select: reviewNoteSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return {
      notes: notes as ReviewNoteWithRelations[],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters,
    };
  } catch (error) {
    logger.error('Failed to list review notes', error);
    throw new AppError(500, 'Failed to list review notes', ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Update a review note
 */
export async function updateReviewNote(
  id: number,
  data: UpdateReviewNoteDTO,
  userId: string
): Promise<ReviewNoteWithRelations> {
  try {
    // Get existing note
    const existingNote = await prisma.reviewNote.findUnique({
      where: { id },
      select: { id: true, raisedBy: true, status: true },
    });

    if (!existingNote) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Only the raiser can edit the note
    if (existingNote.raisedBy !== userId) {
      throw new AppError(403, 'Only the note raiser can edit this note', ErrorCodes.FORBIDDEN);
    }

    // Cannot edit cleared or rejected notes
    if (existingNote.status === 'CLEARED' || existingNote.status === 'REJECTED') {
      throw new AppError(
        400,
        'Cannot edit cleared or rejected notes',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Verify category if changing
    if (data.categoryId !== undefined) {
      if (data.categoryId !== null) {
        const category = await prisma.reviewCategory.findUnique({
          where: { id: data.categoryId },
          select: { id: true, active: true },
        });

        if (!category) {
          throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
        }

        if (!category.active) {
          throw new AppError(400, 'Category is not active', ErrorCodes.VALIDATION_ERROR);
        }
      }
    }

    // Verify assignee if changing
    if (data.assignedTo !== undefined && data.assignedTo !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assignedTo },
        select: { id: true },
      });

      if (!assignee) {
        throw new AppError(404, 'Assignee user not found', ErrorCodes.NOT_FOUND);
      }

      // Get task ID and verify assignee is in team
      const note = await prisma.reviewNote.findUnique({
        where: { id },
        select: { taskId: true },
      });

      const teamMember = await prisma.taskTeam.findFirst({
        where: {
          taskId: note!.taskId,
          userId: data.assignedTo,
        },
      });

      if (!teamMember) {
        throw new AppError(
          400,
          'Assignee must be a member of the task team',
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    // Update the note
    const updatedNote = await prisma.reviewNote.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined
          ? data.dueDate === null
            ? null
            : new Date(data.dueDate)
          : undefined,
      },
      select: reviewNoteSelect,
    });

    logger.info('Review note updated', { reviewNoteId: id, userId });

    return updatedNote as ReviewNoteWithRelations;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to update review note', error);
    throw new AppError(500, 'Failed to update review note', ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Delete a review note
 */
export async function deleteReviewNote(id: number, userId: string): Promise<void> {
  try {
    // Get existing note
    const existingNote = await prisma.reviewNote.findUnique({
      where: { id },
      select: { id: true, raisedBy: true },
    });

    if (!existingNote) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Only the raiser can delete the note
    if (existingNote.raisedBy !== userId) {
      throw new AppError(403, 'Only the note raiser can delete this note', ErrorCodes.FORBIDDEN);
    }

    // Delete the note (cascade will handle comments and attachments)
    await prisma.reviewNote.delete({
      where: { id },
    });

    logger.info('Review note deleted', { reviewNoteId: id, userId });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to delete review note', error);
    throw new AppError(500, 'Failed to delete review note', ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Validate status transition
 */
export function validateStatusTransition(
  currentStatus: ReviewNoteStatus,
  newStatus: ReviewNoteStatus,
  userRole: 'RAISER' | 'ASSIGNEE' | 'PARTNER' | 'SYSTEM_ADMIN'
): StatusTransition | null {
  const transition = STATUS_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === newStatus
  );

  if (!transition) {
    return null;
  }

  if (!transition.allowedRoles.includes(userRole)) {
    return null;
  }

  return transition;
}

/**
 * Change review note status
 */
export async function changeReviewNoteStatus(
  id: number,
  newStatus: ReviewNoteStatus,
  userId: string,
  userSystemRole?: string,
  comment?: string,
  reason?: string
): Promise<ReviewNoteWithRelations> {
  try {
    // Get existing note
    const existingNote = await prisma.reviewNote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        raisedBy: true,
        assignedTo: true,
      },
    });

    if (!existingNote) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // If already in target status, return the note (idempotent operation)
    if (existingNote.status === newStatus) {
      logger.info('Review note already in target status, returning existing note', {
        reviewNoteId: id,
        status: newStatus,
        userId,
      });
      
      return await prisma.reviewNote.findUnique({
        where: { id },
        select: reviewNoteSelect,
      }) as ReviewNoteWithRelations;
    }

    // Determine user role - use context-aware role selection when user has multiple roles
    let userRole: 'RAISER' | 'ASSIGNEE' | 'PARTNER' | 'SYSTEM_ADMIN';
    
    // Check system admin first
    if (userSystemRole === 'SYSTEM_ADMIN') {
      userRole = 'SYSTEM_ADMIN';
    } else {
      const isRaiser = existingNote.raisedBy === userId;
      const isAssignee = existingNote.assignedTo === userId;
      
      // If user has multiple roles, try each one to find valid transition
      if (isRaiser && isAssignee) {
        // Try assignee first for ADDRESSED transitions (handling work)
        // Try raiser first for CLEARED/REJECTED transitions (reviewing completed work)
        const tryAssigneeFirst = ['ADDRESSED', 'IN_PROGRESS'].includes(newStatus);
        const primaryRole = tryAssigneeFirst ? 'ASSIGNEE' : 'RAISER';
        const secondaryRole = tryAssigneeFirst ? 'RAISER' : 'ASSIGNEE';
        
        const primaryTransition = validateStatusTransition(
          existingNote.status as ReviewNoteStatus,
          newStatus,
          primaryRole
        );
        
        if (primaryTransition) {
          userRole = primaryRole;
        } else {
          // Try secondary role
          const secondaryTransition = validateStatusTransition(
            existingNote.status as ReviewNoteStatus,
            newStatus,
            secondaryRole
          );
          userRole = secondaryTransition ? secondaryRole : primaryRole;
        }
      } else if (isAssignee) {
        userRole = 'ASSIGNEE';
      } else if (isRaiser) {
        userRole = 'RAISER';
      } else {
        userRole = 'PARTNER';
      }
    }

    // Validate transition
    const transition = validateStatusTransition(
      existingNote.status as ReviewNoteStatus,
      newStatus,
      userRole
    );

    if (!transition) {
      throw new AppError(
        400,
        `Invalid status transition: Cannot transition from ${existingNote.status} to ${newStatus} with role ${userRole}`,
        ErrorCodes.VALIDATION_ERROR,
        { 
          currentStatus: existingNote.status, 
          newStatus, 
          userRole, 
          userId, 
          raisedBy: existingNote.raisedBy, 
          assignedTo: existingNote.assignedTo,
          isRaiser: existingNote.raisedBy === userId,
          isAssignee: existingNote.assignedTo === userId
        }
      );
    }

    // Validate comment requirement
    if (transition.requiresComment && !comment && !reason) {
      throw new AppError(
        400,
        'Comment or reason is required for this status change',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Build update data
    const updateData: any = {
      status: newStatus,
    };

    if (newStatus === 'ADDRESSED') {
      updateData.addressedAt = new Date();
      updateData.addressedBy = userId;
      updateData.addressedComment = comment;
    } else if (newStatus === 'CLEARED') {
      updateData.clearedAt = new Date();
      updateData.clearedBy = userId;
      updateData.clearanceComment = comment;
    } else if (newStatus === 'REJECTED') {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = reason || comment;
    }

    // Update the note
    const updatedNote = await prisma.reviewNote.update({
      where: { id },
      data: updateData,
      select: reviewNoteSelect,
    });

    logger.info('Review note status changed', {
      reviewNoteId: id,
      oldStatus: existingNote.status,
      newStatus,
      userId,
    });

    return updatedNote as ReviewNoteWithRelations;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to change review note status', error);
    throw new AppError(500, 'Failed to change review note status', ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Assign review note to a user
 */
export async function assignReviewNote(
  id: number,
  assignedTo: string,
  assignedBy: string
): Promise<ReviewNoteWithRelations> {
  try {
    // Get existing note
    const existingNote = await prisma.reviewNote.findUnique({
      where: { id },
      select: {
        id: true,
        taskId: true,
        raisedBy: true,
        assignedTo: true,
      },
    });

    if (!existingNote) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Only raiser can reassign
    if (existingNote.raisedBy !== assignedBy) {
      throw new AppError(403, 'Only the note raiser can reassign', ErrorCodes.FORBIDDEN);
    }

    // Verify assignee exists and is in task team
    const assignee = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { id: true },
    });

    if (!assignee) {
      throw new AppError(404, 'Assignee user not found', ErrorCodes.NOT_FOUND);
    }

    const teamMember = await prisma.taskTeam.findFirst({
      where: {
        taskId: existingNote.taskId,
        userId: assignedTo,
      },
    });

    if (!teamMember) {
      throw new AppError(
        400,
        'Assignee must be a member of the task team',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Update assignment
    const updatedNote = await prisma.reviewNote.update({
      where: { id },
      data: { assignedTo },
      select: reviewNoteSelect,
    });

    logger.info('Review note reassigned', {
      reviewNoteId: id,
      oldAssignee: existingNote.assignedTo,
      newAssignee: assignedTo,
      assignedBy,
    });

    return updatedNote as ReviewNoteWithRelations;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to assign review note', error);
    throw new AppError(500, 'Failed to assign review note', ErrorCodes.INTERNAL_ERROR);
  }
}

