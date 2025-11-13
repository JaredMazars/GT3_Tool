'use client';

import { useRouter } from 'next/navigation';
import { TrashIcon } from '@heroicons/react/24/outline';
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
}

export function NotificationItem({ 
  notification, 
  compact = false,
  onNavigate 
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

  const senderName = notification.FromUser?.name || notification.FromUser?.email || 'System';
  const messageText = compact ? truncateMessage(notification.message, 80) : notification.message;

  return (
    <div
      onClick={handleClick}
      className={`
        group relative p-4 cursor-pointer transition-colors
        ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white hover:bg-gray-50'}
        ${compact ? 'border-b border-gray-100' : 'border border-gray-200 rounded-lg mb-2'}
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
              <p className="text-sm font-medium text-gray-900 truncate">
                {notification.title}
              </p>
              {notification.FromUser && (
                <p className="text-xs text-gray-500">
                  from {senderName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">
                {formatTimeAgo(notification.createdAt)}
              </span>
              {!notification.isRead && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
              )}
            </div>
          </div>

          {/* Message */}
          <p className={`mt-1 text-sm text-gray-600 ${compact ? 'line-clamp-2' : ''}`}>
            {messageText}
          </p>

          {/* Project Badge */}
          {notification.Project && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {notification.Project.name}
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
          <TrashIcon className="h-4 w-4 text-red-600" />
        </button>
      </div>
    </div>
  );
}

