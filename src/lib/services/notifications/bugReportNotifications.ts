/**
 * Bug Report Notification Service
 * Handles notifications for bug report submissions
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

interface BugReport {
  id: number;
  reportedBy: string;
  url: string;
  description: string;
}

/**
 * Notify all SYSTEM_ADMIN users when a new bug report is submitted
 * @param bugReport - The newly created bug report
 */
export async function notifyAdminsOfBugReport(bugReport: BugReport): Promise<void> {
  try {
    // Get all SYSTEM_ADMIN users
    const admins = await prisma.user.findMany({
      where: {
        role: 'SYSTEM_ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (admins.length === 0) {
      logger.warn('No SYSTEM_ADMIN users found to notify about bug report');
      return;
    }

    // Get reporter info for the notification
    const reporter = await prisma.user.findUnique({
      where: { id: bugReport.reportedBy },
      select: { name: true, email: true },
    });

    const reporterName = reporter?.name || reporter?.email || 'Unknown User';

    // Create in-app notifications for each admin
    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: 'BUG_REPORT',
      title: 'New Bug Report',
      message: `${reporterName} reported a bug: ${bugReport.description.substring(0, 100)}${
        bugReport.description.length > 100 ? '...' : ''
      }`,
      actionUrl: '/dashboard/admin/bug-reports',
      isRead: false,
      metadata: JSON.stringify({
        bugReportId: bugReport.id,
        reportedBy: bugReport.reportedBy,
        url: bugReport.url,
      }),
    }));

    // Create all notifications in batch
    await prisma.inAppNotification.createMany({
      data: notifications,
    });

    logger.info(`Notified ${admins.length} SYSTEM_ADMIN users about bug report ${bugReport.id}`);
  } catch (error) {
    // Don't throw error - notification failure shouldn't block bug report creation
    logger.error('Failed to notify admins of bug report:', error);
  }
}
