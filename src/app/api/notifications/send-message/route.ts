import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { SendUserMessageSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * POST /api/notifications/send-message
 * Send a message/notification from one user to another
 */
export const POST = secureRoute.mutation({
  schema: SendUserMessageSchema,
  handler: async (request, { user, data }) => {
    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: data.recipientUserId },
      select: { id: true },
    });

    if (!recipient) {
      throw new AppError(404, 'Recipient user not found', ErrorCodes.NOT_FOUND);
    }

    // If taskId is provided, verify both users have access to the task
    if (data.taskId) {
      const [senderAccess, recipientAccess] = await Promise.all([
        prisma.taskTeam.findFirst({
          where: { taskId: data.taskId, userId: user.id },
          select: { id: true },
        }),
        prisma.taskTeam.findFirst({
          where: { taskId: data.taskId, userId: data.recipientUserId },
          select: { id: true },
        }),
      ]);

      if (!senderAccess) {
        throw new AppError(403, 'You do not have access to this project', ErrorCodes.FORBIDDEN);
      }

      if (!recipientAccess) {
        throw new AppError(400, 'Recipient does not have access to this project', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Send the message
    await notificationService.sendUserMessage(
      user.id,
      data.recipientUserId,
      data.title,
      data.message,
      data.taskId,
      data.actionUrl
    );

    return NextResponse.json(successResponse({ message: 'Message sent successfully' }), { status: 201 });
  },
});
