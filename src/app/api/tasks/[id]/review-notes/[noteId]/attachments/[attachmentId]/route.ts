/**
 * Individual Attachment API Routes
 * GET - Download attachment
 * DELETE - Delete attachment
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getReviewNoteById } from '@/lib/services/review-notes/reviewNoteService';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/utils/logger';
import { 
  downloadReviewNoteAttachment, 
  deleteReviewNoteAttachment,
  reviewNoteAttachmentExists 
} from '@/lib/services/documents/blobStorage';

/**
 * GET /api/tasks/[taskId]/review-notes/[noteId]/attachments/[attachmentId]
 * Download an attachment
 */
export const GET = secureRoute.queryWithParams({
  taskIdParam: 'id',
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');
    const attachmentId = parseNumericId(params.attachmentId, 'Attachment ID');

    // Verify note belongs to this task (IDOR protection)
    const reviewNote = await getReviewNoteById(noteId);
    if (reviewNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Get attachment
    const attachment = await prisma.reviewNoteAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        reviewNoteId: true,
        fileName: true,
        filePath: true,
        fileType: true,
      },
    });

    if (!attachment) {
      throw new AppError(404, 'Attachment not found', ErrorCodes.NOT_FOUND);
    }

    // Verify attachment belongs to this note (IDOR protection)
    if (attachment.reviewNoteId !== noteId) {
      throw new AppError(404, 'Attachment not found', ErrorCodes.NOT_FOUND);
    }

    // Determine if file is in blob storage or local filesystem
    // Blob paths don't start with / and don't have file extensions in path structure
    const isBlobPath = !attachment.filePath.startsWith('/');
    
    let fileBuffer: Buffer;
    
    if (isBlobPath) {
      // Download from blob storage
      fileBuffer = await downloadReviewNoteAttachment(attachment.filePath);
    } else {
      // Read from local filesystem (backward compatibility)
      const fullPath = join(process.cwd(), attachment.filePath);
      fileBuffer = await readFile(fullPath);
    }

    // Return file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': attachment.fileType,
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  },
});

/**
 * DELETE /api/tasks/[taskId]/review-notes/[noteId]/attachments/[attachmentId]
 * Delete an attachment
 */
export const DELETE = secureRoute.mutationWithParams({
  taskIdParam: 'id',
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Review note ID');
    const attachmentId = parseNumericId(params.attachmentId, 'Attachment ID');

    // Verify note belongs to this task (IDOR protection)
    const reviewNote = await getReviewNoteById(noteId);
    if (reviewNote.taskId !== taskId) {
      throw new AppError(404, 'Review note not found', ErrorCodes.NOT_FOUND);
    }

    // Get attachment
    const attachment = await prisma.reviewNoteAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        reviewNoteId: true,
        filePath: true,
        uploadedBy: true,
      },
    });

    if (!attachment) {
      throw new AppError(404, 'Attachment not found', ErrorCodes.NOT_FOUND);
    }

    // Verify attachment belongs to this note (IDOR protection)
    if (attachment.reviewNoteId !== noteId) {
      throw new AppError(404, 'Attachment not found', ErrorCodes.NOT_FOUND);
    }

    // Business logic authorization: Only uploader or raiser can delete
    if (attachment.uploadedBy !== user.id && reviewNote.raisedBy !== user.id) {
      throw new AppError(403, 'You do not have permission to delete this attachment', ErrorCodes.FORBIDDEN);
    }

    // Determine if file is in blob storage or local filesystem
    const isBlobPath = !attachment.filePath.startsWith('/');
    
    // Delete file
    try {
      if (isBlobPath) {
        // Delete from blob storage
        await deleteReviewNoteAttachment(attachment.filePath);
      } else {
        // Delete from local filesystem (backward compatibility)
        const fullPath = join(process.cwd(), attachment.filePath);
        if (existsSync(fullPath)) {
          await unlink(fullPath);
        }
      }
    } catch (error) {
      // Log but continue - file might already be deleted
      logger.warn('Failed to delete file', { error, attachmentId, filePath: attachment.filePath });
    }

    // Delete from database
    await prisma.reviewNoteAttachment.delete({
      where: { id: attachmentId },
    });

    logger.info('Attachment deleted successfully', { attachmentId, noteId, taskId, userId: user.id });

    return NextResponse.json(successResponse({ message: 'Attachment deleted successfully' }));
  },
});

