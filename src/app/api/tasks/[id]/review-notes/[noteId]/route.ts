/**
 * Individual Review Note API Routes
 * GET - Get single review note with details
 * PUT - Update review note
 * DELETE - Delete review note
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateReviewNoteSchema } from '@/lib/validation/schemas';
import {
  getReviewNoteById,
  updateReviewNote,
  deleteReviewNote,
} from '@/lib/services/review-notes/reviewNoteService';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/tasks/[taskId]/review-notes/[noteId]
 * Get a single review note with full details
 */
export const GET = secureRoute.queryWithParams({
  taskIdParam: 'id',
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');

    // Get query parameters for includes
    const { searchParams } = new URL(request.url);
    const includeComments = searchParams.get('includeComments') === 'true';
    const includeAttachments = searchParams.get('includeAttachments') === 'true';

    // Get review note
    const reviewNote = await getReviewNoteById(noteId, includeComments, includeAttachments);

    // Verify task matches (IDOR protection)
    if (reviewNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    const response = NextResponse.json(successResponse(reviewNote));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  },
});

/**
 * PUT /api/tasks/[taskId]/review-notes/[noteId]
 * Update a review note
 */
export const PUT = secureRoute.mutationWithParams({
  taskIdParam: 'id',
  feature: Feature.MANAGE_TASKS,
  schema: UpdateReviewNoteSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');

    // Update the review note (type assertion needed for Zod schema compatibility)
    const updatedNote = await updateReviewNote(noteId, data as any, user.id);

    // Verify task matches (IDOR protection)
    if (updatedNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(updatedNote));
  },
});

/**
 * DELETE /api/tasks/[taskId]/review-notes/[noteId]
 * Delete a review note
 */
export const DELETE = secureRoute.mutationWithParams({
  taskIdParam: 'id',
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');

    // Get note to verify task (IDOR protection)
    const reviewNote = await getReviewNoteById(noteId);

    if (reviewNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Delete the review note
    await deleteReviewNote(noteId, user.id);

    return NextResponse.json(successResponse({ message: 'Review note deleted successfully' }));
  },
});

