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
  projectId: number | null;
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
  project?: {
    id: number;
    name: string;
  } | null;
}

/**
 * Notification filters
 */
export interface NotificationFilters {
  isRead?: boolean;
  projectId?: number;
  page?: number;
  pageSize?: number;
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
  projectId?: number;
  actionUrl?: string;
}

