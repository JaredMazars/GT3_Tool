import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { secureRoute } from '@/lib/api/secureRoute';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications (fast endpoint for polling/badges)
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const unreadCount = await notificationService.getUnreadCount(user.id);

    return NextResponse.json(
      successResponse({ unreadCount }),
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    );
  },
});
