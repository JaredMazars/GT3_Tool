/**
 * Email notification types and interfaces
 */

/**
 * Types of email notifications
 */
export enum EmailNotificationType {
  USER_ADDED = 'USER_ADDED',
  USER_REMOVED = 'USER_REMOVED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  PROJECT_STATUS_CHANGED = 'PROJECT_STATUS_CHANGED',
  DOCUMENT_PROCESSED = 'DOCUMENT_PROCESSED',
  OPINION_DRAFT_READY = 'OPINION_DRAFT_READY',
  FILING_STATUS_UPDATED = 'FILING_STATUS_UPDATED',
}

/**
 * Email status
 */
export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/**
 * Notification preference
 */
export interface NotificationPreference {
  id: number;
  userId: string;
  taskId: number | null;
  notificationType: string;
  emailEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email log entry
 */
export interface EmailLog {
  id: number;
  recipientEmail: string;
  recipientUserId: string | null;
  emailType: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  metadata: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

/**
 * User info for email templates
 */
export interface EmailUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Task info for email templates
 */
export interface EmailTask {
  id: number;
  name: string;
  taskType: string;
}

/**
 * User added email data
 */
export interface UserAddedEmailData {
  task: EmailTask;
  addedUser: EmailUser;
  addedBy: EmailUser;
  role: string;
  taskUrl: string;
}

/**
 * User removed email data
 */
export interface UserRemovedEmailData {
  task: EmailTask;
  removedUser: EmailUser;
  removedBy: EmailUser;
  taskUrl: string;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}


