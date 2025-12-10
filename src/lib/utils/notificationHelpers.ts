import {
  UserPlus,
  UserMinus,
  MessageCircle,
  FileCheck,
  FileText,
  Calculator,
  Bell,
  CheckCircle,
} from 'lucide-react';
import { NotificationType } from '@/types/notification';

/**
 * Format a date as relative time (e.g., "2m ago", "1h ago", "2d ago")
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  } else {
    return `${diffYears}y ago`;
  }
}

/**
 * Get the appropriate icon component for a notification type
 */
export function getNotificationIcon(type: string) {
  switch (type) {
    case NotificationType.USER_ADDED:
      return UserPlus;
    case NotificationType.USER_REMOVED:
      return UserMinus;
    case NotificationType.USER_ROLE_CHANGED:
      return UserPlus;
    case NotificationType.USER_MESSAGE:
      return MessageCircle;
    case NotificationType.DOCUMENT_PROCESSED:
      return FileCheck;
    case NotificationType.OPINION_DRAFT_READY:
      return FileText;
    case NotificationType.TAX_CALCULATION_COMPLETE:
      return Calculator;
    case NotificationType.FILING_STATUS_UPDATED:
      return CheckCircle;
    case NotificationType.COMMENT_MENTION:
      return MessageCircle;
    default:
      return Bell;
  }
}

/**
 * Get the appropriate color class for a notification type
 */
export function getNotificationColor(type: string): string {
  switch (type) {
    case NotificationType.USER_ADDED:
      return 'text-green-600';
    case NotificationType.USER_REMOVED:
      return 'text-red-600';
    case NotificationType.USER_ROLE_CHANGED:
      return 'text-blue-600';
    case NotificationType.USER_MESSAGE:
      return 'text-purple-600';
    case NotificationType.DOCUMENT_PROCESSED:
      return 'text-green-600';
    case NotificationType.OPINION_DRAFT_READY:
      return 'text-blue-600';
    case NotificationType.TAX_CALCULATION_COMPLETE:
      return 'text-indigo-600';
    case NotificationType.FILING_STATUS_UPDATED:
      return 'text-green-600';
    case NotificationType.COMMENT_MENTION:
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateMessage(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Format notification title for display
 */
export function formatNotificationTitle(type: string): string {
  switch (type) {
    case NotificationType.USER_ADDED:
      return 'Added to Project';
    case NotificationType.USER_REMOVED:
      return 'Removed from Project';
    case NotificationType.USER_ROLE_CHANGED:
      return 'Role Changed';
    case NotificationType.USER_MESSAGE:
      return 'New Message';
    case NotificationType.DOCUMENT_PROCESSED:
      return 'Document Processed';
    case NotificationType.OPINION_DRAFT_READY:
      return 'Opinion Draft Ready';
    case NotificationType.TAX_CALCULATION_COMPLETE:
      return 'Tax Calculation Complete';
    case NotificationType.FILING_STATUS_UPDATED:
      return 'Filing Status Updated';
    case NotificationType.COMMENT_MENTION:
      return 'Mentioned in Comment';
    default:
      return 'Notification';
  }
}


