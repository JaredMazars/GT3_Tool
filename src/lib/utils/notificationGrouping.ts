/**
 * Notification Grouping Utilities
 * Maps notification types to categories for filtering and display
 */

import { NotificationType } from '@/types/notification';

/**
 * Notification type categories for grouping
 */
export type NotificationCategory = 'all' | 'userChanges' | 'messages' | 'documentsAndTasks';

/**
 * Category display configuration
 */
export const NOTIFICATION_CATEGORIES = {
  all: {
    id: 'all' as const,
    label: 'All',
    types: [] as string[], // Empty means all types
  },
  userChanges: {
    id: 'userChanges' as const,
    label: 'User Changes',
    types: [
      NotificationType.USER_ADDED,
      NotificationType.USER_REMOVED,
      NotificationType.USER_ROLE_CHANGED,
      NotificationType.SERVICE_LINE_ADDED,
      NotificationType.SERVICE_LINE_REMOVED,
      NotificationType.SERVICE_LINE_ROLE_CHANGED,
      NotificationType.SYSTEM_ROLE_CHANGED,
    ],
  },
  messages: {
    id: 'messages' as const,
    label: 'Messages',
    types: [
      NotificationType.USER_MESSAGE,
      NotificationType.COMMENT_MENTION,
    ],
  },
  documentsAndTasks: {
    id: 'documentsAndTasks' as const,
    label: 'Documents & Tasks',
    types: [
      NotificationType.DOCUMENT_PROCESSED,
      NotificationType.OPINION_DRAFT_READY,
      NotificationType.TAX_CALCULATION_COMPLETE,
      NotificationType.FILING_STATUS_UPDATED,
    ],
  },
} as const;

/**
 * Get notification types for a category
 */
export function getTypesForCategory(category: NotificationCategory): string[] {
  if (category === 'all') {
    return [];
  }
  return [...NOTIFICATION_CATEGORIES[category].types];
}

/**
 * Get the category for a notification type
 */
export function getCategoryForType(type: string): NotificationCategory {
  for (const [categoryKey, config] of Object.entries(NOTIFICATION_CATEGORIES)) {
    if (categoryKey === 'all') continue;
    if ((config.types as readonly string[]).includes(type)) {
      return categoryKey as NotificationCategory;
    }
  }
  return 'all';
}

/**
 * Group notifications by category
 */
export function groupNotificationsByCategory<T extends { type: string }>(
  notifications: T[]
): Record<NotificationCategory, T[]> {
  const grouped: Record<NotificationCategory, T[]> = {
    all: notifications,
    userChanges: [],
    messages: [],
    documentsAndTasks: [],
  };

  for (const notification of notifications) {
    const category = getCategoryForType(notification.type);
    if (category !== 'all') {
      grouped[category].push(notification);
    }
  }

  return grouped;
}

/**
 * Get category counts from notification list
 */
export function getCategoryCounts<T extends { type: string }>(
  notifications: T[]
): Record<NotificationCategory, number> {
  const grouped = groupNotificationsByCategory(notifications);
  
  return {
    all: grouped.all.length,
    userChanges: grouped.userChanges.length,
    messages: grouped.messages.length,
    documentsAndTasks: grouped.documentsAndTasks.length,
  };
}
