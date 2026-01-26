'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { useNotifications, useMarkAllAsRead } from '@/hooks/notifications/useNotifications';
import { NotificationItem } from './NotificationItem';
import { ROUTES } from '@/constants/routes';

interface NotificationDropdownProps {
  onClose: () => void;
  onOpenChangeRequestModal?: (requestId: number) => void;
}

export function NotificationDropdown({ onClose, onOpenChangeRequestModal }: NotificationDropdownProps) {
  const { data, isLoading } = useNotifications({ pageSize: 5, readStatus: 'unread' });
  const markAllAsRead = useMarkAllAsRead();

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync(undefined);
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-forvis-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-forvis-gray-900">Notifications</h3>
        {data && data.notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            className="text-xs text-forvis-blue-600 hover:text-forvis-blue-800 font-medium disabled:opacity-50"
          >
            <Check className="h-4 w-4 inline mr-1" />
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
                <div className="rounded-full bg-forvis-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-forvis-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-forvis-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && data && data.notifications.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-forvis-gray-600">No notifications yet</p>
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
                onOpenChangeRequestModal={onOpenChangeRequestModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg">
        <Link
          href={ROUTES.DASHBOARD.NOTIFICATIONS}
          onClick={onClose}
          className="text-sm text-forvis-blue-600 hover:text-forvis-blue-800 font-medium block text-center"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}

