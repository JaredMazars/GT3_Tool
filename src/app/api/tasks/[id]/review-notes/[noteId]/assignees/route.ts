/**
 * Review Note Assignees API Routes
 * GET - List assignees for a review note
 * POST - Add assignee(s) to a review note
 * DELETE - Remove assignee from a review note
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getReviewNoteById } from '@/lib/services/review-notes/reviewNoteService';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

const AddAssigneeSchema = z
  .object({
    userId: z.string().min(1, 'User ID is required'),
    isForwarded: z.boolean().optional().default(false),
  })
  .strict();

const RemoveAssigneeSchema = z
  .object({
    userId: z.string().min(1, 'User ID is required'),
  })
  .strict();

/**
 * GET /api/tasks/[taskId]/review-notes/[noteId]/assignees
 * Get all assignees for a review note
 */
export const GET = secureRoute.queryWithParams({
  taskIdParam: 'id',
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');

    // Verify note belongs to this task (IDOR protection)
    const reviewNote = await getReviewNoteById(noteId);
    if (reviewNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Get assignees
    const assignees = await prisma.reviewNoteAssignee.findMany({
      where: { reviewNoteId: noteId },
      select: {
        id: true,
        reviewNoteId: true,
        userId: true,
        assignedAt: true,
        assignedBy: true,
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
      orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
      take: 50, // Reasonable limit for assignees per note
    });

    logger.info('Review note assignees fetched', { 
      userId: user.id, 
      taskId, 
      noteId, 
      count: assignees.length 
    });

    const response = NextResponse.json(successResponse(assignees));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  },
});

/**
 * POST /api/tasks/[taskId]/review-notes/[noteId]/assignees
 * Add assignee(s) to a review note
 * Supports both single assignee and forward action
 */
export const POST = secureRoute.mutationWithParams({
  taskIdParam: 'id',
  feature: Feature.MANAGE_TASKS,
  schema: AddAssigneeSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');

    // Verify note belongs to this task (IDOR protection)
    const reviewNote = await getReviewNoteById(noteId);
    if (reviewNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      throw new AppError(404, 'User not found', ErrorCodes.NOT_FOUND);
    }

    // Check if already assigned (unique constraint will catch this, but better UX to check first)
    const existing = await prisma.reviewNoteAssignee.findUnique({
      where: {
        reviewNoteId_userId: {
          reviewNoteId: noteId,
          userId: data.userId,
        },
      },
    });

    if (existing) {
      throw new AppError(
        400,
        'User is already assigned to this review note',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Use transaction to ensure atomicity
    const assignee = await prisma.$transaction(async (tx) => {
      // Add the assignee
      const newAssignee = await tx.reviewNoteAssignee.create({
        data: {
          reviewNoteId: noteId,
          userId: data.userId,
          assignedBy: user.id,
          isForwarded: data.isForwarded || false,
        },
        select: {
          id: true,
          reviewNoteId: true,
          userId: true,
          assignedAt: true,
          assignedBy: true,
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
      });

      // If this is a forward, create a system comment
      if (data.isForwarded) {
        await tx.reviewNoteComment.create({
          data: {
            reviewNoteId: noteId,
            userId: user.id,
            comment: `Forwarded to ${targetUser.name || targetUser.email}`,
            isInternal: true,
            updatedAt: new Date(),
          },
        });
      }

      // Update the assignedTo field for backward compatibility (set to first assignee)
      const firstAssignee = await tx.reviewNoteAssignee.findFirst({
        where: { reviewNoteId: noteId },
        orderBy: { assignedAt: 'asc' },
        select: { userId: true },
      });

      if (firstAssignee) {
        await tx.reviewNote.update({
          where: { id: noteId },
          data: { assignedTo: firstAssignee.userId },
        });
      }

      return newAssignee;
    });

    logger.info('Review note assignee added', { 
      userId: user.id, 
      taskId, 
      noteId, 
      assigneeUserId: data.userId, 
      isForwarded: data.isForwarded 
    });

    return NextResponse.json(successResponse(assignee), { status: 201 });
  },
});

/**
 * DELETE /api/tasks/[taskId]/review-notes/[noteId]/assignees
 * Remove assignee from a review note
 */
export const DELETE = secureRoute.mutationWithParams({
  taskIdParam: 'id',
  feature: Feature.MANAGE_TASKS,
  schema: RemoveAssigneeSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');

    // Verify note belongs to this task (IDOR protection)
    const reviewNote = await getReviewNoteById(noteId);
    if (reviewNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Find the assignee record
    const assignee = await prisma.reviewNoteAssignee.findUnique({
      where: {
        reviewNoteId_userId: {
          reviewNoteId: noteId,
          userId: data.userId,
        },
      },
    });

    if (!assignee) {
      throw new AppError(404, 'Assignee not found', ErrorCodes.NOT_FOUND);
    }

    // Check if this is the last assignee - cannot remove
    const assigneeCount = await prisma.reviewNoteAssignee.count({
      where: { reviewNoteId: noteId },
    });

    if (assigneeCount <= 1) {
      throw new AppError(
        400,
        'Cannot remove the last assignee. A review note must have at least one assignee.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Remove the assignee
      await tx.reviewNoteAssignee.delete({
        where: {
          reviewNoteId_userId: {
            reviewNoteId: noteId,
            userId: data.userId,
          },
        },
      });

      // Update the assignedTo field for backward compatibility (set to first remaining assignee)
      const firstAssignee = await tx.reviewNoteAssignee.findFirst({
        where: { reviewNoteId: noteId },
        orderBy: { assignedAt: 'asc' },
        select: { userId: true },
      });

      if (firstAssignee) {
        await tx.reviewNote.update({
          where: { id: noteId },
          data: { assignedTo: firstAssignee.userId },
        });
      }
    });

    logger.info('Review note assignee removed', { 
      userId: user.id, 
      taskId, 
      noteId, 
      removedUserId: data.userId 
    });

    return NextResponse.json(successResponse({ success: true }));
  },
});


