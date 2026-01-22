/**
 * In-app notification types and interfaces
 */

/**
 * Types of in-app notifications
 */
export enum NotificationType {
  USER_ADDED = 'USER_ADDED',
  USER_REMOVED = 'USER_REMOVED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_MESSAGE = 'USER_MESSAGE',
  DOCUMENT_PROCESSED = 'DOCUMENT_PROCESSED',
  OPINION_DRAFT_READY = 'OPINION_DRAFT_READY',
  TAX_CALCULATION_COMPLETE = 'TAX_CALCULATION_COMPLETE',
  FILING_STATUS_UPDATED = 'FILING_STATUS_UPDATED',
  COMMENT_MENTION = 'COMMENT_MENTION',
  SERVICE_LINE_ADDED = 'SERVICE_LINE_ADDED',
  SERVICE_LINE_REMOVED = 'SERVICE_LINE_REMOVED',
  SERVICE_LINE_ROLE_CHANGED = 'SERVICE_LINE_ROLE_CHANGED',
  SYSTEM_ROLE_CHANGED = 'SYSTEM_ROLE_CHANGED',
  INDEPENDENCE_REQUIRED = 'INDEPENDENCE_REQUIRED',
}

/**
 * Notification metadata type
 */
export interface NotificationMetadata {
  [key: string]: unknown;
}

/**
 * In-app notification
 */
export interface InAppNotification {
  id: number;
  userId: string;
  taskId: number | null;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  metadata: NotificationMetadata | null;
  fromUserId: string | null;
  createdAt: Date;
}

/**
 * Notification with user details
 */
export interface InAppNotificationWithUser extends InAppNotification {
  fromUser?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  task?: {
    id: number;
    name: string;
  } | null;
}

/**
 * Read status filter options
 */
export type ReadStatusFilter = 'all' | 'unread' | 'read';

/**
 * Notification type category for grouping
 */
export type NotificationCategory = 'all' | 'userChanges' | 'messages' | 'documentsAndTasks';

/**
 * Notification filters
 */
export interface NotificationFilters {
  isRead?: boolean;
  taskId?: number;
  page?: number;
  pageSize?: number;
  types?: string[]; // Array of notification types to filter by
  readStatus?: ReadStatusFilter; // Filter by read status
}

/**
 * Notification response
 */
export interface NotificationResponse {
  notifications: InAppNotificationWithUser[];
  unreadCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Send message data
 */
export interface SendMessageData {
  recipientUserId: string;
  title: string;
  message: string;
  taskId?: number;
  actionUrl?: string;
}


