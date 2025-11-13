'use client';

import Link from 'next/link';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useNotifications, useMarkAllAsRead } from '@/hooks/notifications/useNotifications';
import { NotificationItem } from './NotificationItem';
import { ROUTES } from '@/constants/routes';

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { data, isLoading } = useNotifications({ pageSize: 5 });
  const markAllAsRead = useMarkAllAsRead();

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        {data && data.notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4 inline mr-1" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex space-x-3">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && data && data.notifications.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        )}

        {!isLoading && data && data.notifications.length > 0 && (
          <div>
            {data.notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                compact
                onNavigate={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <Link
          href={ROUTES.DASHBOARD.NOTIFICATIONS}
          onClick={onClose}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium block text-center"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}

