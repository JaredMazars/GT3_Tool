'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { InAppNotificationWithUser } from '@/types/notification';
import { useMarkAsRead, useDeleteNotification } from '@/hooks/notifications/useNotifications';
import { 
  formatTimeAgo, 
  getNotificationIcon, 
  getNotificationColor,
  truncateMessage 
} from '@/lib/utils/notificationHelpers';

interface NotificationItemProps {
  notification: InAppNotificationWithUser;
  compact?: boolean;
  onNavigate?: () => void;
  onOpenChangeRequestModal?: (requestId: number) => void;
}

export function NotificationItem({ 
  notification, 
  compact = false,
  onNavigate,
  onOpenChangeRequestModal
}: NotificationItemProps) {
  const router = useRouter();
  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();

  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  const handleClick = async () => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead.mutateAsync(notification.id);
    }

    // Check if this is a change request notification
    if (notification.actionUrl && notification.actionUrl.startsWith('/change-requests/')) {
      const parts = notification.actionUrl.split('/');
      const requestIdStr = parts[parts.length - 1];
      const requestId = parseInt(requestIdStr || '0', 10);
      
      if (!isNaN(requestId) && requestId > 0) {
        if (onOpenChangeRequestModal) {
          onOpenChangeRequestModal(requestId);
          onNavigate?.(); // Close dropdown
          return;
        }
      }
    }

    // Navigate to action URL if present
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }

    // Call onNavigate callback (e.g., to close dropdown)
    onNavigate?.();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from triggering navigation
    await deleteNotification.mutateAsync(notification.id);
  };

  const senderName = notification.fromUser?.name || notification.fromUser?.email || 'System';
  const messageText = compact ? truncateMessage(notification.message, 80) : notification.message;

  return (
    <>
      <div
        onClick={handleClick}
        className={`
          group relative p-4 cursor-pointer transition-colors
          ${!notification.isRead ? 'bg-forvis-blue-50 border-l-4 border-l-forvis-blue-500' : 'bg-white hover:bg-forvis-gray-50'}
          ${compact ? 'border-b border-forvis-gray-100' : 'border border-forvis-gray-200 rounded-lg mb-2'}
        `}
      >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-forvis-gray-900 truncate">
                {notification.title}
              </p>
              {notification.fromUser && (
                <p className="text-xs text-forvis-gray-600">
                  from {senderName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-forvis-gray-600">
                {formatTimeAgo(notification.createdAt)}
              </span>
              {!notification.isRead && (
                <span className="w-2 h-2 bg-forvis-blue-500 rounded-full" title="Unread" />
              )}
            </div>
          </div>

          {/* Message */}
          <p className={`mt-1 text-sm text-forvis-gray-700 ${compact ? 'line-clamp-2' : ''}`}>
            {messageText}
          </p>

          {/* Task Badge */}
          {notification.task && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-gray-100 text-forvis-gray-800">
                {notification.task.name}
              </span>
            </div>
          )}
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
          title="Delete notification"
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </button>
      </div>
      </div>
    </>
  );
}

