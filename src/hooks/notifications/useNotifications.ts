'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  NotificationFilters, 
  NotificationResponse,
  SendMessageData 
} from '@/types/notification';

// Query Keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationFilters) => [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

/**
 * Fetch notifications with pagination and filters
 * Polls every 30 seconds for updates
 */
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery<NotificationResponse>({
    queryKey: notificationKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
      if (filters.isRead !== undefined) params.append('isRead', filters.isRead.toString());
      if (filters.taskId) params.append('taskId', filters.taskId.toString());
      if (filters.types && filters.types.length > 0) params.append('types', filters.types.join(','));
      if (filters.readStatus) params.append('readStatus', filters.readStatus);

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false, // Don't poll when tab is inactive
  });
}

/**
 * Get unread notification count
 * Polls every 30 seconds for badge updates
 */
export function useUnreadCount() {
  return useQuery<number>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread-count');
      if (!response.ok) throw new Error('Failed to fetch unread count');
      
      const result = await response.json();
      return result.data.unreadCount;
    },
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false,
  });
}

/**
 * Mark a single notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all notification queries to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mark all notifications as read (optionally filtered by task)
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId?: number) => {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskId ? { taskId } : {}),
      });
      
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Delete a single notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Delete all read notifications
 */
export function useDeleteAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete read notifications');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Send a message to another user
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await fetch('/api/notifications/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate notifications in case user is messaging themselves or needs to see sent confirmation
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}


