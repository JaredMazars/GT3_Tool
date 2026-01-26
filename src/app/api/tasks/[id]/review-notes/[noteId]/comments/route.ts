/**
 * Review Note Comments API Routes
 * GET - List comments on a review note
 * POST - Add a comment to a review note
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateReviewNoteCommentSchema } from '@/lib/validation/schemas';
import { getReviewNoteById } from '@/lib/services/review-notes/reviewNoteService';
import { notifyReviewNoteCommentAdded } from '@/lib/services/review-notes/reviewNoteNotificationService';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/tasks/[taskId]/review-notes/[noteId]/comments
 * Get all comments on a review note
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

    // Get comments
    const comments = await prisma.reviewNoteComment.findMany({
      where: { reviewNoteId: noteId },
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
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 500,
    });

    // Filter internal comments if user is not the raiser (business logic authorization)
    const filteredComments = comments.filter((comment) => {
      if (!comment.isInternal) return true;
      return user.id === reviewNote.raisedBy || user.role === 'SYSTEM_ADMIN';
    });

    const response = NextResponse.json(successResponse(filteredComments));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  },
});

/**
 * POST /api/tasks/[taskId]/review-notes/[noteId]/comments
 * Add a comment to a review note
 */
export const POST = secureRoute.mutationWithParams({
  taskIdParam: 'id',
  feature: Feature.MANAGE_TASKS,
  schema: CreateReviewNoteCommentSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');

    // Verify note belongs to this task (IDOR protection)
    const reviewNote = await getReviewNoteById(noteId);
    if (reviewNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Create the comment
    const comment = await prisma.reviewNoteComment.create({
      data: {
        reviewNoteId: noteId,
        userId: user.id,
        comment: data.comment,
        isInternal: data.isInternal || false,
        updatedAt: new Date(),
      },
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
    });

    // Auto-update status based on who responded (workflow automation)
    const isOriginator = user.id === reviewNote.raisedBy;
    const isAssignee = await prisma.reviewNoteAssignee.findFirst({
      where: { reviewNoteId: noteId, userId: user.id },
    });

    if (isAssignee && !isOriginator) {
      // Assignee responded - move to ADDRESSED, sits with originator
      await prisma.reviewNote.update({
        where: { id: noteId },
        data: {
          status: 'ADDRESSED',
          currentOwner: reviewNote.raisedBy,
          lastRespondedBy: user.id,
          lastRespondedAt: new Date(),
          addressedAt: new Date(),
          addressedBy: user.id,
        },
      });
    } else if (isOriginator) {
      // Originator responded - move to IN_PROGRESS, sits with assignees
      await prisma.reviewNote.update({
        where: { id: noteId },
        data: {
          status: 'IN_PROGRESS',
          currentOwner: null, // Sits with all assignees
          lastRespondedBy: user.id,
          lastRespondedAt: new Date(),
        },
      });
    }

    // Send notification (not for internal comments)
    if (!comment.isInternal) {
      await notifyReviewNoteCommentAdded(noteId, user.id, data.comment);
    }

    return NextResponse.json(successResponse(comment), { status: 201 });
  },
});

