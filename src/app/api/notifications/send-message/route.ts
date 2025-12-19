import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { SendUserMessageSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { secureRoute } from '@/lib/api/secureRoute';

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
    });

    if (!recipient) {
      return NextResponse.json({ success: false, error: 'Recipient user not found' }, { status: 404 });
    }

    // If taskId is provided, verify both users have access to the task
    if (data.taskId) {
      const [senderAccess, recipientAccess] = await Promise.all([
        prisma.taskTeam.findFirst({
          where: { taskId: data.taskId, userId: user.id },
        }),
        prisma.taskTeam.findFirst({
          where: { taskId: data.taskId, userId: data.recipientUserId },
        }),
      ]);

      if (!senderAccess) {
        return NextResponse.json({ success: false, error: 'You do not have access to this project' }, { status: 403 });
      }

      if (!recipientAccess) {
        return NextResponse.json({ success: false, error: 'Recipient does not have access to this project' }, { status: 400 });
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
