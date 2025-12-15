import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { notificationService } from '@/lib/services/notifications/notificationService';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications (fast endpoint for polling/badges)
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unreadCount = await notificationService.getUnreadCount(user.id);

    return NextResponse.json(
      successResponse({ unreadCount }),
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/notifications/unread-count');
  }
}


