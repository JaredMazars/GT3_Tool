/**
 * Individual Attachment API Routes
 * GET - Download attachment
 * DELETE - Delete attachment
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getReviewNoteById } from '@/lib/services/review-notes/reviewNoteService';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { prisma } from '@/lib/db/prisma';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { downloadScreenshot, deleteScreenshot, isBlobStorageConfigured } from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/tasks/[taskId]/review-notes/[noteId]/attachments/[attachmentId]
 * Download an attachment
 */
export const GET = secureRoute.queryWithParams({
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const noteId = Number(params.noteId);
    const attachmentId = Number(params.attachmentId);

    if (isNaN(noteId) || isNaN(attachmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID' },
        { status: 400 }
      );
    }

    // Verify note belongs to this task
    const reviewNote = await getReviewNoteById(noteId);
    if (reviewNote.taskId !== taskId) {
      return NextResponse.json(
        { success: false, error: 'Review note does not belong to this task' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    if (attachment.reviewNoteId !== noteId) {
      return NextResponse.json(
        { success: false, error: 'Attachment does not belong to this review note' },
        { status: 404 }
      );
    }

    // Read file - check if it's from blob storage or local filesystem
    let fileBuffer: Buffer;
    const isScreenshot = attachment.fileType.startsWith('image/') && 
                        attachment.filePath.includes('/screenshots/');
    
    if (isScreenshot && isBlobStorageConfigured()) {
      // Download from blob storage
      try {
        fileBuffer = await downloadScreenshot(attachment.filePath);
      } catch (error) {
        logger.error('Failed to download screenshot from blob storage', { error, attachmentId });
        return NextResponse.json(
          { success: false, error: 'Failed to download file' },
          { status: 500 }
        );
      }
    } else {
      // Read from local filesystem (legacy attachments)
      const fullPath = join(process.cwd(), attachment.filePath);
      fileBuffer = await readFile(fullPath);
    }

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.fileType,
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
        'X-Content-Type-Options': 'nosniff',
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
    const noteId = Number(params.noteId);
    const attachmentId = Number(params.attachmentId);

    if (isNaN(noteId) || isNaN(attachmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID' },
        { status: 400 }
      );
    }

    // Verify note belongs to this task
    const reviewNote = await getReviewNoteById(noteId);
    if (reviewNote.taskId !== taskId) {
      return NextResponse.json(
        { success: false, error: 'Review note does not belong to this task' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    if (attachment.reviewNoteId !== noteId) {
      return NextResponse.json(
        { success: false, error: 'Attachment does not belong to this review note' },
        { status: 404 }
      );
    }

    // Only uploader or raiser can delete
    if (attachment.uploadedBy !== user.id && reviewNote.raisedBy !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this attachment' },
        { status: 403 }
      );
    }

    // Delete file - check if it's from blob storage or local filesystem
    const isScreenshot = attachment.filePath.includes('/screenshots/');
    
    try {
      if (isScreenshot && isBlobStorageConfigured()) {
        // Delete from blob storage
        await deleteScreenshot(attachment.filePath);
      } else {
        // Delete from local filesystem (legacy attachments)
        const fullPath = join(process.cwd(), attachment.filePath);
        await unlink(fullPath);
      }
    } catch (error) {
      // Log but continue - file might already be deleted
      logger.warn('Failed to delete file', { error, attachmentId, filePath: attachment.filePath });
    }

    // Delete from database
    await prisma.reviewNoteAttachment.delete({
      where: { id: attachmentId },
    });

    logger.info('Attachment deleted successfully', { attachmentId, noteId, taskId });

    return NextResponse.json(successResponse({ message: 'Attachment deleted successfully' }));
  },
});

