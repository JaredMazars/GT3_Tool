import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { SendUserMessageSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/notifications/send-message
 * Send a message/notification from one user to another
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = SendUserMessageSchema.parse(body);

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: validated.recipientUserId },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient user not found' },
        { status: 404 }
      );
    }

    // If taskId is provided, verify both users have access to the task
    if (validated.taskId) {
      const [senderAccess, recipientAccess] = await Promise.all([
        prisma.taskTeam.findFirst({
          where: {
            taskId: validated.taskId,
            userId: user.id,
          },
        }),
        prisma.taskTeam.findFirst({
          where: {
            taskId: validated.taskId,
            userId: validated.recipientUserId,
          },
        }),
      ]);

      if (!senderAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        );
      }

      if (!recipientAccess) {
        return NextResponse.json(
          { error: 'Recipient does not have access to this project' },
          { status: 400 }
        );
      }
    }

    // Send the message
    await notificationService.sendUserMessage(
      user.id,
      validated.recipientUserId,
      validated.title,
      validated.message,
      validated.taskId,
      validated.actionUrl
    );

    return NextResponse.json(
      successResponse({ message: 'Message sent successfully' }),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/notifications/send-message');
  }
}


