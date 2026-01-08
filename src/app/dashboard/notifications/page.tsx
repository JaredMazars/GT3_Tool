'use client';

import { useState } from 'react';
import { 
  useNotifications, 
  useMarkAllAsRead, 
  useDeleteAllRead 
} from '@/hooks/notifications/useNotifications';
import { NotificationItem } from '@/components/features/notifications/NotificationItem';
import { ApproveChangeRequestModal } from '@/components/features/clients/ApproveChangeRequestModal';
import { Check, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

type FilterTab = 'all' | 'unread';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [modalRequestId, setModalRequestId] = useState<number | null>(null);

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const filters = {
    page: currentPage,
    pageSize,
    ...(activeTab === 'unread' && { isRead: false }),
  };

  const { data, isLoading } = useNotifications(filters);
  const markAllAsRead = useMarkAllAsRead();
  const deleteAllRead = useDeleteAllRead();

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync(undefined);
  };

  const handleDeleteAllRead = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Read Notifications',
      message: 'Are you sure you want to delete all read notifications? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        await deleteAllRead.mutateAsync();
        if (currentPage > 1) setCurrentPage(1);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 1;

  return (
    <div className="min-h-screen bg-forvis-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-forvis-gray-900">Notifications</h1>
          <p className="mt-1 text-sm font-normal text-forvis-gray-600">
            Stay updated on your projects and messages
          </p>
        </div>

        {/* Actions and Filters */}
        <div className="bg-white rounded-lg shadow-corporate mb-6">
          <div className="px-6 py-4 border-b border-forvis-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Filter Tabs */}
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setActiveTab('all');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'all'
                      ? 'bg-forvis-blue-100 text-forvis-blue-700'
                      : 'text-forvis-gray-600 hover:bg-forvis-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setActiveTab('unread');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'unread'
                      ? 'bg-forvis-blue-100 text-forvis-blue-700'
                      : 'text-forvis-gray-600 hover:bg-forvis-gray-100'
                  }`}
                >
                  Unread
                  {data && data.unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-500 text-white">
                      {data.unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsRead.isPending || data?.unreadCount === 0}
                  className="inline-flex items-center px-3 py-2 border border-forvis-gray-300 shadow-corporate text-sm font-medium rounded-md text-forvis-gray-700 bg-white hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark all read
                </button>
                <button
                  onClick={handleDeleteAllRead}
                  disabled={deleteAllRead.isPending}
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-corporate text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete all read
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div>
            {isLoading && (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex space-x-4 p-4 border border-forvis-gray-200 rounded-lg">
                    <div className="rounded-full bg-forvis-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 bg-forvis-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-forvis-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && data && data.notifications.length === 0 && (
              <div className="p-12 text-center">
                <div className="mx-auto h-12 w-12 text-forvis-gray-400">
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="mt-1 text-sm text-forvis-gray-600">
                  {activeTab === 'unread'
                    ? 'You are all caught up!'
                    : 'When you get notifications, they will appear here.'}
                </p>
              </div>
            )}

            {!isLoading && data && data.notifications.length > 0 && (
              <div className="p-6 space-y-2">
                {data.notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    compact={false}
                    onOpenChangeRequestModal={setModalRequestId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.totalCount > pageSize && (
            <div className="px-6 py-4 border-t border-forvis-gray-200 flex items-center justify-between">
              <div className="text-sm text-forvis-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, data.totalCount)}
                </span>{' '}
                of <span className="font-medium">{data.totalCount}</span> notifications
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-forvis-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      {/* Change Request Modal */}
      {modalRequestId && (
        <ApproveChangeRequestModal
          isOpen={modalRequestId !== null}
          onClose={() => setModalRequestId(null)}
          requestId={modalRequestId}
        />
      )}
    </div>
  );
}
