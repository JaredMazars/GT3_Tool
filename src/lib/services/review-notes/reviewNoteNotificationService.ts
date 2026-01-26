/**
 * Review Note Notification Service
 * Handles email notifications for review note events
 */

import { EmailService } from '../email/emailService';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import type { ReviewNoteWithRelations } from '@/types/review-notes';

const emailService = new EmailService();

/**
 * Send notification when a review note is assigned
 */
export async function notifyReviewNoteAssigned(
  reviewNote: ReviewNoteWithRelations
): Promise<void> {
  try {
    if (!reviewNote.assignedTo || !reviewNote.User_ReviewNote_assignedToToUser) {
      return;
    }

    const assignee = reviewNote.User_ReviewNote_assignedToToUser;
    const raiser = reviewNote.User_ReviewNote_raisedByToUser;
    const task = reviewNote.Task;

    // Check notification preference
    const shouldNotify = await emailService.checkNotificationPreference(
      assignee.id,
      reviewNote.taskId,
      'review_note_assigned'
    );

    if (!shouldNotify) {
      logger.info('User has disabled review note assignment notifications', {
        userId: assignee.id,
        reviewNoteId: reviewNote.id,
      });
      return;
    }

    const subject = `Review Note Assigned: ${reviewNote.title}`;
    const htmlBody = generateReviewNoteAssignedHtml(reviewNote, raiser, assignee, task);
    const textBody = generateReviewNoteAssignedText(reviewNote, raiser, assignee, task);

    await emailService.sendEmail(
      assignee.email,
      subject,
      htmlBody,
      textBody
    );

    logger.info('Review note assignment notification sent', {
      reviewNoteId: reviewNote.id,
      assigneeId: assignee.id,
    });
  } catch (error) {
    logger.error('Failed to send review note assignment notification', error);
  }
}

/**
 * Send notification when a review note is addressed
 */
export async function notifyReviewNoteAddressed(
  reviewNote: ReviewNoteWithRelations
): Promise<void> {
  try {
    const raiser = reviewNote.User_ReviewNote_raisedByToUser;
    const addressedBy = reviewNote.User_ReviewNote_addressedByToUser;
    const task = reviewNote.Task;

    if (!addressedBy) {
      return;
    }

    // Check notification preference
    const shouldNotify = await emailService.checkNotificationPreference(
      raiser.id,
      reviewNote.taskId,
      'review_note_addressed'
    );

    if (!shouldNotify) {
      logger.info('User has disabled review note addressed notifications', {
        userId: raiser.id,
        reviewNoteId: reviewNote.id,
      });
      return;
    }

    const subject = `Review Note Addressed: ${reviewNote.title}`;
    const htmlBody = generateReviewNoteAddressedHtml(reviewNote, raiser, addressedBy, task);
    const textBody = generateReviewNoteAddressedText(reviewNote, raiser, addressedBy, task);

    await emailService.sendEmail(
      raiser.email,
      subject,
      htmlBody,
      textBody
    );

    logger.info('Review note addressed notification sent', {
      reviewNoteId: reviewNote.id,
      raiserId: raiser.id,
    });
  } catch (error) {
    logger.error('Failed to send review note addressed notification', error);
  }
}

/**
 * Send notification when a review note is cleared
 */
export async function notifyReviewNoteCleared(
  reviewNote: ReviewNoteWithRelations
): Promise<void> {
  try {
    if (!reviewNote.assignedTo || !reviewNote.User_ReviewNote_assignedToToUser) {
      return;
    }

    const assignee = reviewNote.User_ReviewNote_assignedToToUser;
    const clearedBy = reviewNote.User_ReviewNote_clearedByToUser;
    const task = reviewNote.Task;

    if (!clearedBy) {
      return;
    }

    // Check notification preference
    const shouldNotify = await emailService.checkNotificationPreference(
      assignee.id,
      reviewNote.taskId,
      'review_note_cleared'
    );

    if (!shouldNotify) {
      logger.info('User has disabled review note cleared notifications', {
        userId: assignee.id,
        reviewNoteId: reviewNote.id,
      });
      return;
    }

    const subject = `Review Note Cleared: ${reviewNote.title}`;
    const htmlBody = generateReviewNoteClearedHtml(reviewNote, assignee, clearedBy, task);
    const textBody = generateReviewNoteClearedText(reviewNote, assignee, clearedBy, task);

    await emailService.sendEmail(
      assignee.email,
      subject,
      htmlBody,
      textBody
    );

    logger.info('Review note cleared notification sent', {
      reviewNoteId: reviewNote.id,
      assigneeId: assignee.id,
    });
  } catch (error) {
    logger.error('Failed to send review note cleared notification', error);
  }
}

/**
 * Send notification when a review note is rejected
 */
export async function notifyReviewNoteRejected(
  reviewNote: ReviewNoteWithRelations
): Promise<void> {
  try {
    if (!reviewNote.assignedTo || !reviewNote.User_ReviewNote_assignedToToUser) {
      return;
    }

    const assignee = reviewNote.User_ReviewNote_assignedToToUser;
    const raiser = reviewNote.User_ReviewNote_raisedByToUser;
    const task = reviewNote.Task;

    // Check notification preference
    const shouldNotify = await emailService.checkNotificationPreference(
      assignee.id,
      reviewNote.taskId,
      'review_note_rejected'
    );

    if (!shouldNotify) {
      logger.info('User has disabled review note rejected notifications', {
        userId: assignee.id,
        reviewNoteId: reviewNote.id,
      });
      return;
    }

    const subject = `Review Note Rejected: ${reviewNote.title}`;
    const htmlBody = generateReviewNoteRejectedHtml(reviewNote, assignee, raiser, task);
    const textBody = generateReviewNoteRejectedText(reviewNote, assignee, raiser, task);

    await emailService.sendEmail(
      assignee.email,
      subject,
      htmlBody,
      textBody
    );

    logger.info('Review note rejected notification sent', {
      reviewNoteId: reviewNote.id,
      assigneeId: assignee.id,
    });
  } catch (error) {
    logger.error('Failed to send review note rejected notification', error);
  }
}

/**
 * Send notification when a comment is added to a review note
 */
export async function notifyReviewNoteCommentAdded(
  reviewNoteId: number,
  commentUserId: string,
  commentText: string
): Promise<void> {
  try {
    // Get review note with relations
    const reviewNote = await prisma.reviewNote.findUnique({
      where: { id: reviewNoteId },
      select: {
        id: true,
        taskId: true,
        title: true,
        raisedBy: true,
        assignedTo: true,
        User_ReviewNote_raisedByToUser: {
          select: { id: true, name: true, email: true },
        },
        User_ReviewNote_assignedToToUser: {
          select: { id: true, name: true, email: true },
        },
        Task: {
          select: { TaskCode: true, TaskDesc: true },
        },
      },
    });

    if (!reviewNote) {
      return;
    }

    // Get comment author
    const commentAuthor = await prisma.user.findUnique({
      where: { id: commentUserId },
      select: { id: true, name: true, email: true },
    });

    if (!commentAuthor) {
      return;
    }

    // Notify raiser and assignee (excluding the comment author)
    const recipients = [
      reviewNote.User_ReviewNote_raisedByToUser,
      reviewNote.User_ReviewNote_assignedToToUser,
    ].filter((user) => user && user.id !== commentUserId);

    for (const recipient of recipients) {
      if (!recipient) continue;

      // Check notification preference
      const shouldNotify = await emailService.checkNotificationPreference(
        recipient.id,
        reviewNote.taskId,
        'review_note_comment'
      );

      if (!shouldNotify) {
        continue;
      }

      const subject = `New Comment on Review Note: ${reviewNote.title}`;
      const htmlBody = generateReviewNoteCommentHtml(
        reviewNote,
        recipient,
        commentAuthor,
        commentText
      );
      const textBody = generateReviewNoteCommentText(
        reviewNote,
        recipient,
        commentAuthor,
        commentText
      );

      await emailService.sendEmail(
        recipient.email,
        subject,
        htmlBody,
        textBody
      );
    }

    logger.info('Review note comment notifications sent', {
      reviewNoteId,
      commentAuthorId: commentUserId,
      recipientCount: recipients.length,
    });
  } catch (error) {
    logger.error('Failed to send review note comment notification', error);
  }
}

/**
 * Send notification for overdue review notes (meant to be called by a scheduled job)
 */
export async function notifyOverdueReviewNotes(): Promise<void> {
  try {
    const now = new Date();

    // Get all overdue review notes that are not cleared or rejected
    const overdueNotes = await prisma.reviewNote.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          in: ['OPEN', 'IN_PROGRESS', 'ADDRESSED'],
        },
      },
      select: {
        id: true,
        taskId: true,
        title: true,
        dueDate: true,
        status: true,
        priority: true,
        assignedTo: true,
        raisedBy: true,
        User_ReviewNote_assignedToToUser: {
          select: { id: true, name: true, email: true },
        },
        User_ReviewNote_raisedByToUser: {
          select: { id: true, name: true, email: true },
        },
        Task: {
          select: { TaskCode: true, TaskDesc: true },
        },
      },
    });

    for (const note of overdueNotes) {
      // Notify assignee if assigned
      if (note.assignedTo && note.User_ReviewNote_assignedToToUser) {
        const assignee = note.User_ReviewNote_assignedToToUser;

        const shouldNotify = await emailService.checkNotificationPreference(
          assignee.id,
          note.taskId,
          'review_note_overdue'
        );

        if (shouldNotify) {
          const subject = `Overdue Review Note: ${note.title}`;
          const htmlBody = generateOverdueReviewNoteHtml(note, assignee);
          const textBody = generateOverdueReviewNoteText(note, assignee);

          await emailService.sendEmail(
            assignee.email,
            subject,
            htmlBody,
            textBody
          );
        }
      }

      // Also notify raiser
      const raiser = note.User_ReviewNote_raisedByToUser;
      if (raiser && raiser.id !== note.assignedTo) {
        const shouldNotify = await emailService.checkNotificationPreference(
          raiser.id,
          note.taskId,
          'review_note_overdue'
        );

        if (shouldNotify) {
          const subject = `Overdue Review Note: ${note.title}`;
          const htmlBody = generateOverdueReviewNoteHtml(note, raiser);
          const textBody = generateOverdueReviewNoteText(note, raiser);

          await emailService.sendEmail(
            raiser.email,
            subject,
            htmlBody,
            textBody
          );
        }
      }
    }

    logger.info('Overdue review note notifications processed', {
      overdueCount: overdueNotes.length,
    });
  } catch (error) {
    logger.error('Failed to send overdue review note notifications', error);
  }
}

// ============================================================================
// Email Template Generators
// ============================================================================

function generateReviewNoteAssignedHtml(
  reviewNote: any,
  raiser: any,
  assignee: any,
  task: any
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .note-details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .priority-CRITICAL { background: #dc3545; color: white; }
        .priority-HIGH { background: #fd7e14; color: white; }
        .priority-MEDIUM { background: #ffc107; color: black; }
        .priority-LOW { background: #6c757d; color: white; }
        .button { display: inline-block; background: #2E5AAC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔔 Review Note Assigned to You</h2>
        </div>
        <div class="content">
          <p>Hi ${assignee.name || 'there'},</p>
          <p>A review note has been assigned to you by ${raiser.name || raiser.email}.</p>
          
          <div class="note-details">
            <h3>${reviewNote.title}</h3>
            <p><strong>Task:</strong> ${task?.TaskCode} - ${task?.TaskDesc}</p>
            <p><strong>Priority:</strong> <span class="priority priority-${reviewNote.priority}">${reviewNote.priority}</span></p>
            ${reviewNote.dueDate ? `<p><strong>Due Date:</strong> ${new Date(reviewNote.dueDate).toLocaleDateString()}</p>` : ''}
            ${reviewNote.description ? `<p><strong>Description:</strong><br/>${reviewNote.description}</p>` : ''}
            ${reviewNote.referenceUrl ? `<p><strong>Reference:</strong> <a href="${reviewNote.referenceUrl}">${reviewNote.referenceUrl}</a></p>` : ''}
          </div>
          
          <a href="${process.env.NEXTAUTH_URL}/dashboard/tasks/${reviewNote.taskId}?tool=review-notebook&noteId=${reviewNote.id}" class="button">View Review Note</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from Forvis Mazars Task Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReviewNoteAssignedText(
  reviewNote: any,
  raiser: any,
  assignee: any,
  task: any
): string {
  return `
Review Note Assigned to You

Hi ${assignee.name || 'there'},

A review note has been assigned to you by ${raiser.name || raiser.email}.

Title: ${reviewNote.title}
Task: ${task?.TaskCode} - ${task?.TaskDesc}
Priority: ${reviewNote.priority}
${reviewNote.dueDate ? `Due Date: ${new Date(reviewNote.dueDate).toLocaleDateString()}` : ''}

${reviewNote.description || ''}

${reviewNote.referenceUrl ? `Reference: ${reviewNote.referenceUrl}` : ''}

View the review note: ${process.env.NEXTAUTH_URL}/dashboard/tasks/${reviewNote.taskId}?tool=review-notebook&noteId=${reviewNote.id}
  `;
}

function generateReviewNoteAddressedHtml(
  reviewNote: any,
  raiser: any,
  addressedBy: any,
  task: any
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .note-details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .button { display: inline-block; background: #2E5AAC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✅ Review Note Addressed</h2>
        </div>
        <div class="content">
          <p>Hi ${raiser.name || 'there'},</p>
          <p>${addressedBy.name || addressedBy.email} has marked your review note as addressed.</p>
          
          <div class="note-details">
            <h3>${reviewNote.title}</h3>
            <p><strong>Task:</strong> ${task?.TaskCode} - ${task?.TaskDesc}</p>
            ${reviewNote.addressedComment ? `<p><strong>Response:</strong><br/>${reviewNote.addressedComment}</p>` : ''}
          </div>
          
          <p>Please review the response and clear or reject the note.</p>
          
          <a href="${process.env.NEXTAUTH_URL}/dashboard/tasks/${reviewNote.taskId}?tool=review-notebook&noteId=${reviewNote.id}" class="button">Review Response</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from Forvis Mazars Task Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReviewNoteAddressedText(
  reviewNote: any,
  raiser: any,
  addressedBy: any,
  task: any
): string {
  return `
Review Note Addressed

Hi ${raiser.name || 'there'},

${addressedBy.name || addressedBy.email} has marked your review note as addressed.

Title: ${reviewNote.title}
Task: ${task?.TaskCode} - ${task?.TaskDesc}

${reviewNote.addressedComment ? `Response: ${reviewNote.addressedComment}` : ''}

Please review the response and clear or reject the note.

View the review note: ${process.env.NEXTAUTH_URL}/dashboard/tasks/${reviewNote.taskId}?tool=review-notebook&noteId=${reviewNote.id}
  `;
}

function generateReviewNoteClearedHtml(
  reviewNote: any,
  assignee: any,
  clearedBy: any,
  task: any
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .note-details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🎉 Review Note Cleared</h2>
        </div>
        <div class="content">
          <p>Hi ${assignee.name || 'there'},</p>
          <p>Great news! ${clearedBy.name || clearedBy.email} has cleared the review note you worked on.</p>
          
          <div class="note-details">
            <h3>${reviewNote.title}</h3>
            <p><strong>Task:</strong> ${task?.TaskCode} - ${task?.TaskDesc}</p>
            ${reviewNote.clearanceComment ? `<p><strong>Comment:</strong><br/>${reviewNote.clearanceComment}</p>` : ''}
          </div>
          
          <p>Thank you for addressing this review note!</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from Forvis Mazars Task Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReviewNoteClearedText(
  reviewNote: any,
  assignee: any,
  clearedBy: any,
  task: any
): string {
  return `
Review Note Cleared

Hi ${assignee.name || 'there'},

Great news! ${clearedBy.name || clearedBy.email} has cleared the review note you worked on.

Title: ${reviewNote.title}
Task: ${task?.TaskCode} - ${task?.TaskDesc}

${reviewNote.clearanceComment ? `Comment: ${reviewNote.clearanceComment}` : ''}

Thank you for addressing this review note!
  `;
}

function generateReviewNoteRejectedHtml(
  reviewNote: any,
  assignee: any,
  raiser: any,
  task: any
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .note-details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .button { display: inline-block; background: #2E5AAC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔄 Review Note Rejected</h2>
        </div>
        <div class="content">
          <p>Hi ${assignee.name || 'there'},</p>
          <p>${raiser.name || raiser.email} has rejected your response to the review note and requires additional work.</p>
          
          <div class="note-details">
            <h3>${reviewNote.title}</h3>
            <p><strong>Task:</strong> ${task?.TaskCode} - ${task?.TaskDesc}</p>
            ${reviewNote.rejectionReason ? `<p><strong>Reason:</strong><br/>${reviewNote.rejectionReason}</p>` : ''}
          </div>
          
          <p>Please review the feedback and address the note again.</p>
          
          <a href="${process.env.NEXTAUTH_URL}/dashboard/tasks/${reviewNote.taskId}?tool=review-notebook&noteId=${reviewNote.id}" class="button">View Review Note</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from Forvis Mazars Task Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReviewNoteRejectedText(
  reviewNote: any,
  assignee: any,
  raiser: any,
  task: any
): string {
  return `
Review Note Rejected

Hi ${assignee.name || 'there'},

${raiser.name || raiser.email} has rejected your response to the review note and requires additional work.

Title: ${reviewNote.title}
Task: ${task?.TaskCode} - ${task?.TaskDesc}

${reviewNote.rejectionReason ? `Reason: ${reviewNote.rejectionReason}` : ''}

Please review the feedback and address the note again.

View the review note: ${process.env.NEXTAUTH_URL}/dashboard/tasks/${reviewNote.taskId}?tool=review-notebook&noteId=${reviewNote.id}
  `;
}

function generateReviewNoteCommentHtml(
  reviewNote: any,
  recipient: any,
  commentAuthor: any,
  commentText: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .comment { background: white; padding: 15px; border-left: 4px solid #2E5AAC; margin: 15px 0; }
        .button { display: inline-block; background: #2E5AAC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>💬 New Comment on Review Note</h2>
        </div>
        <div class="content">
          <p>Hi ${recipient.name || 'there'},</p>
          <p>${commentAuthor.name || commentAuthor.email} commented on the review note: <strong>${reviewNote.title}</strong></p>
          
          <div class="comment">
            ${commentText}
          </div>
          
          <a href="${process.env.NEXTAUTH_URL}/dashboard/tasks/${reviewNote.taskId}?tool=review-notebook&noteId=${reviewNote.id}" class="button">View Review Note</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from Forvis Mazars Task Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReviewNoteCommentText(
  reviewNote: any,
  recipient: any,
  commentAuthor: any,
  commentText: string
): string {
  return `
New Comment on Review Note

Hi ${recipient.name || 'there'},

${commentAuthor.name || commentAuthor.email} commented on the review note: ${reviewNote.title}

Comment:
${commentText}

View the review note: ${process.env.NEXTAUTH_URL}/dashboard/tasks/${reviewNote.taskId}?tool=review-notebook&noteId=${reviewNote.id}
  `;
}

function generateOverdueReviewNoteHtml(note: any, user: any): string {
  const daysOverdue = Math.floor(
    (new Date().getTime() - (note.dueDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #fd7e14 0%, #dc3545 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .note-details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #dc3545; }
        .button { display: inline-block; background: #2E5AAC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⚠️ Overdue Review Note</h2>
        </div>
        <div class="content">
          <p>Hi ${user.name || 'there'},</p>
          <p>The following review note is overdue by <strong>${daysOverdue} day(s)</strong> and requires your attention.</p>
          
          <div class="note-details">
            <h3>${note.title}</h3>
            <p><strong>Task:</strong> ${note.Task?.TaskCode} - ${note.Task?.TaskDesc}</p>
            <p><strong>Priority:</strong> ${note.priority}</p>
            <p><strong>Status:</strong> ${note.status}</p>
            <p><strong>Due Date:</strong> ${new Date(note.dueDate).toLocaleDateString()}</p>
          </div>
          
          <p>Please address this review note as soon as possible.</p>
          
          <a href="${process.env.NEXTAUTH_URL}/dashboard/tasks/${note.taskId}?tool=review-notebook&noteId=${note.id}" class="button">View Review Note</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from Forvis Mazars Task Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOverdueReviewNoteText(note: any, user: any): string {
  const daysOverdue = Math.floor(
    (new Date().getTime() - (note.dueDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)
  );

  return `
Overdue Review Note

Hi ${user.name || 'there'},

The following review note is overdue by ${daysOverdue} day(s) and requires your attention.

Title: ${note.title}
Task: ${note.Task?.TaskCode} - ${note.Task?.TaskDesc}
Priority: ${note.priority}
Status: ${note.status}
Due Date: ${new Date(note.dueDate).toLocaleDateString()}

Please address this review note as soon as possible.

View the review note: ${process.env.NEXTAUTH_URL}/dashboard/tasks/${note.taskId}?tool=review-notebook&noteId=${note.id}
  `;
}

