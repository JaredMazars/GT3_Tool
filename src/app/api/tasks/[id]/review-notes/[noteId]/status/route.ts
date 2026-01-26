/**
 * Review Note Status API Route
 * POST - Change review note status
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { ChangeReviewNoteStatusSchema } from '@/lib/validation/schemas';
import {
  changeReviewNoteStatus,
  getReviewNoteById,
} from '@/lib/services/review-notes/reviewNoteService';
import {
  notifyReviewNoteAddressed,
  notifyReviewNoteCleared,
  notifyReviewNoteRejected,
} from '@/lib/services/review-notes/reviewNoteNotificationService';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * POST /api/tasks/[taskId]/review-notes/[noteId]/status
 * Change the status of a review note
 */
export const POST = secureRoute.mutationWithParams({
  taskIdParam: 'id',
  feature: Feature.MANAGE_TASKS,
  schema: ChangeReviewNoteStatusSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');

    // Verify note belongs to this task (IDOR protection)
    const existingNote = await getReviewNoteById(noteId);
    if (existingNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Only originator can manually clear or reject a review note (business logic authorization)
    if ((data.status === 'CLEARED' || data.status === 'REJECTED') && user.id !== existingNote.raisedBy) {
      // System admins can override
      if (user.role !== 'SYSTEM_ADMIN') {
        throw new AppError(
          403,
          'Only the originator can clear or reject a review note',
          ErrorCodes.FORBIDDEN
        );
      }
    }

    // Change the status (type assertion needed for Zod schema compatibility)
    const updatedNote = await changeReviewNoteStatus(
      noteId,
      data.status as any,
      user.id,
      user.role,
      data.comment,
      data.reason
    );

    // Send appropriate notification
    if (data.status === 'ADDRESSED') {
      await notifyReviewNoteAddressed(updatedNote);
    } else if (data.status === 'CLEARED') {
      await notifyReviewNoteCleared(updatedNote);
    } else if (data.status === 'REJECTED') {
      await notifyReviewNoteRejected(updatedNote);
    }

    return NextResponse.json(successResponse(updatedNote));
  },
});

