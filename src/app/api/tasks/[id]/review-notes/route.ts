/**
 * Review Notes API Routes
 * GET - List review notes with filters
 * POST - Create new review note
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import {
  CreateReviewNoteSchema,
  ReviewNoteFilterSchema,
} from '@/lib/validation/schemas';
import { createReviewNote, listReviewNotes } from '@/lib/services/review-notes/reviewNoteService';
import { notifyReviewNoteAssigned } from '@/lib/services/review-notes/reviewNoteNotificationService';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';

/**
 * GET /api/tasks/[taskId]/review-notes
 * List review notes for a task with optional filters
 */
export const GET = secureRoute.queryWithParams({
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: any = {
      taskId,
    };

    // Parse status filter
    if (searchParams.get('status')) {
      const statusParam = searchParams.get('status')!;
      filters.status = statusParam.includes(',') ? statusParam.split(',') : statusParam;
    }

    // Parse priority filter
    if (searchParams.get('priority')) {
      const priorityParam = searchParams.get('priority')!;
      filters.priority = priorityParam.includes(',') ? priorityParam.split(',') : priorityParam;
    }

    // Parse categoryId filter
    if (searchParams.get('categoryId')) {
      const categoryParam = searchParams.get('categoryId')!;
      filters.categoryId = categoryParam.includes(',')
        ? categoryParam.split(',').map(Number)
        : Number(categoryParam);
    }

    // Parse other filters
    if (searchParams.get('assignedTo')) {
      filters.assignedTo = searchParams.get('assignedTo')!;
    }

    if (searchParams.get('raisedBy')) {
      filters.raisedBy = searchParams.get('raisedBy')!;
    }

    if (searchParams.get('dueDateFrom')) {
      filters.dueDateFrom = searchParams.get('dueDateFrom')!;
    }

    if (searchParams.get('dueDateTo')) {
      filters.dueDateTo = searchParams.get('dueDateTo')!;
    }

    if (searchParams.get('overdue')) {
      filters.overdue = searchParams.get('overdue') === 'true';
    }

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    // Parse pagination
    if (searchParams.get('page')) {
      filters.page = Number(searchParams.get('page'));
    }

    if (searchParams.get('limit')) {
      filters.limit = Number(searchParams.get('limit'));
    }

    // Parse sorting
    if (searchParams.get('sortBy')) {
      filters.sortBy = searchParams.get('sortBy')!;
    }

    if (searchParams.get('sortOrder')) {
      filters.sortOrder = searchParams.get('sortOrder')!;
    }

    // Validate filters
    const validatedFilters = ReviewNoteFilterSchema.parse(filters);

    // Get review notes (type assertion needed for Zod schema compatibility)
    const result = await listReviewNotes(validatedFilters as any);

    return NextResponse.json(successResponse(result));
  },
});

/**
 * POST /api/tasks/[taskId]/review-notes
 * Create a new review note
 */
export const POST = secureRoute.mutationWithParams({
  taskIdParam: 'id',
  feature: Feature.MANAGE_TASKS,
  schema: CreateReviewNoteSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);

    // Ensure taskId matches
    if (data.taskId !== taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID mismatch' },
        { status: 400 }
      );
    }

    // Create the review note (type assertion needed for Zod schema compatibility)
    const reviewNote = await createReviewNote(data as any, user.id);

    // Send notification if assigned
    if (reviewNote.assignedTo) {
      await notifyReviewNoteAssigned(reviewNote);
    }

    return NextResponse.json(successResponse(reviewNote), { status: 201 });
  },
});

