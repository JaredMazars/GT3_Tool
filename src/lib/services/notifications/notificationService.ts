import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { 
  NotificationType, 
  NotificationFilters, 
  NotificationResponse, 
  InAppNotificationWithUser,
  NotificationMetadata 
} from '@/types/notification';

/**
 * Notification Service
 * Handles in-app notification creation, retrieval, and management
 */
export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    type: NotificationType | string,
    title: string,
    message: string,
    taskId?: number,
    actionUrl?: string,
    fromUserId?: string,
    metadata?: NotificationMetadata
  ): Promise<void> {
    try {
      await prisma.inAppNotification.create({
        data: {
          userId,
          type,
          title,
          message,
          taskId: taskId || null,
          actionUrl: actionUrl || null,
          fromUserId: fromUserId || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      logger.info('In-app notification created', {
        userId,
        type,
        title,
        taskId,
        fromUserId,
      });
    } catch (error) {
      logger.error('Error creating in-app notification:', error);
      // Don't throw - notification failure shouldn't break the main flow
    }
  }

  /**
   * Get user's notifications with pagination and filters
   */
  async getUserNotifications(
    userId: string,
    filters: NotificationFilters = {}
  ): Promise<NotificationResponse> {
    try {
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 20;
      const skip = (page - 1) * pageSize;

      // Build where clause
      const where: {
        userId: string;
        isRead?: boolean;
        taskId?: number;
        type?: { in: string[] };
      } = {
        userId,
      };

      // Handle readStatus filter (takes precedence over isRead if provided)
      if (filters.readStatus !== undefined && filters.readStatus !== 'all') {
        where.isRead = filters.readStatus === 'read';
      } else if (filters.isRead !== undefined) {
        where.isRead = filters.isRead;
      }

      if (filters.taskId !== undefined) {
        where.taskId = filters.taskId;
      }

      // Filter by notification types
      if (filters.types && filters.types.length > 0) {
        where.type = { in: filters.types };
      }

      // Get notifications with user and task details
      const [rawNotifications, totalCount, unreadCount] = await Promise.all([
        prisma.inAppNotification.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            User_InAppNotification_fromUserIdToUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            Task: {
              select: {
                id: true,
                TaskDesc: true,
              },
            },
          },
        }),
        prisma.inAppNotification.count({ where }),
        prisma.inAppNotification.count({
          where: {
            userId,
            isRead: false,
          },
        }),
      ]);

      // Properly map Prisma results to match interface
      const notifications: InAppNotificationWithUser[] = rawNotifications.map(notification => {
        // Parse metadata if present
        let metadata: NotificationMetadata | null = null;
        if (notification.metadata) {
          try {
            metadata = JSON.parse(notification.metadata) as NotificationMetadata;
          } catch (error) {
            logger.error('Failed to parse notification metadata', { 
              notificationId: notification.id, 
              error 
            });
          }
        }

        return {
          id: notification.id,
          userId: notification.userId,
          taskId: notification.taskId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          isRead: notification.isRead,
          readAt: notification.readAt,
          metadata,
          fromUserId: notification.fromUserId,
          createdAt: notification.createdAt,
          fromUser: notification.User_InAppNotification_fromUserIdToUser || null,
          task: notification.Task ? {
            id: notification.Task.id,
            name: notification.Task.TaskDesc,
          } : null,
        };
      });

      return {
        notifications,
        unreadCount,
        totalCount,
        page,
        pageSize,
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.inAppNotification.count({
        where: {
          userId,
          isRead: false,
        },
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      const notification = await prisma.inAppNotification.findUnique({
        where: { id: notificationId },
        select: { id: true, userId: true },
      });

      if (!notification || notification.userId !== userId) {
        return false;
      }

      await prisma.inAppNotification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('Notification marked as read', { notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark a notification as unread
   */
  async markAsUnread(notificationId: number, userId: string): Promise<boolean> {
    try {
      const notification = await prisma.inAppNotification.findUnique({
        where: { id: notificationId },
        select: { id: true, userId: true },
      });

      if (!notification || notification.userId !== userId) {
        return false;
      }

      await prisma.inAppNotification.update({
        where: { id: notificationId },
        data: {
          isRead: false,
          readAt: null,
        },
      });

      logger.info('Notification marked as unread', { notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Error marking notification as unread:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, taskId?: number): Promise<number> {
    try {
      const where: {
        userId: string;
        isRead: boolean;
        taskId?: number;
      } = {
        userId,
        isRead: false,
      };

      if (taskId !== undefined) {
        where.taskId = taskId;
      }

      const result = await prisma.inAppNotification.updateMany({
        where,
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('Notifications marked as read', {
        userId,
        taskId,
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number, userId: string): Promise<boolean> {
    try {
      const notification = await prisma.inAppNotification.findUnique({
        where: { id: notificationId },
        select: { id: true, userId: true },
      });

      if (!notification || notification.userId !== userId) {
        return false;
      }

      await prisma.inAppNotification.delete({
        where: { id: notificationId },
      });

      logger.info('Notification deleted', { notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(userId: string): Promise<number> {
    try {
      const result = await prisma.inAppNotification.deleteMany({
        where: {
          userId,
          isRead: true,
        },
      });

      logger.info('Read notifications deleted', {
        userId,
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Error deleting read notifications:', error);
      return 0;
    }
  }

  /**
   * Send a message from one user to another
   */
  async sendUserMessage(
    fromUserId: string,
    recipientUserId: string,
    title: string,
    message: string,
    taskId?: number,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification(
      recipientUserId,
      NotificationType.USER_MESSAGE,
      title,
      message,
      taskId,
      actionUrl,
      fromUserId
    );
  }
}

// Singleton instance
export const notificationService = new NotificationService();


