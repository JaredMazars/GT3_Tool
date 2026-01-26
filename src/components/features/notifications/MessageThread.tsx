'use client';

import { useState } from 'react';
import { MessageCircle, Undo2 } from 'lucide-react';
import { InAppNotificationWithUser } from '@/types/notification';
import { formatTimeAgo } from '@/lib/utils/notificationHelpers';
import { useMarkAsRead } from '@/hooks/notifications/useNotifications';
import { SendMessageModal } from './SendMessageModal';

interface MessageThreadProps {
  messages: InAppNotificationWithUser[];
  currentUserId: string;
}

export function MessageThread({ messages, currentUserId }: MessageThreadProps) {
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ userId: string; name: string } | null>(null);
  const markAsRead = useMarkAsRead();

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
        <p className="mt-1 text-sm text-gray-500">
          Messages between users will appear here.
        </p>
      </div>
    );
  }

  // Group messages by conversation (pair of users)
  const conversations = messages.reduce((acc, msg) => {
    const otherUserId = msg.userId === currentUserId ? msg.fromUserId : msg.userId;
    if (!otherUserId) return acc;

    if (!acc[otherUserId]) {
      acc[otherUserId] = [];
    }
    acc[otherUserId].push(msg);
    return acc;
  }, {} as Record<string, InAppNotificationWithUser[]>);

  const handleReply = (userId: string, userName: string) => {
    setReplyTo({ userId, name: userName });
    setIsReplyModalOpen(true);
  };

  const handleMarkThreadAsRead = async (threadMessages: InAppNotificationWithUser[]) => {
    const unreadMessages = threadMessages.filter(msg => !msg.isRead && msg.userId === currentUserId);
    for (const msg of unreadMessages) {
      await markAsRead.mutateAsync(msg.id);
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(conversations).map(([otherUserId, threadMessages]) => {
        // Sort messages chronologically
        const sortedMessages = [...threadMessages].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Get the other user's info from the first message
        const firstMessage = sortedMessages[0];
        const otherUser = firstMessage?.fromUserId === otherUserId
          ? firstMessage.fromUser
          : sortedMessages.find(m => m.userId === otherUserId && m.fromUser)?.fromUser;

        const otherUserName = otherUser?.name || otherUser?.email || 'Unknown User';
        const unreadCount = sortedMessages.filter(msg => !msg.isRead && msg.userId === currentUserId).length;

        return (
          <div key={otherUserId} className="bg-white rounded-lg shadow border border-gray-200">
            {/* Thread Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700">
                    {otherUserName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{otherUserName}</h3>
                  <p className="text-xs text-gray-500">
                    {sortedMessages.length} {sortedMessages.length === 1 ? 'message' : 'messages'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => handleMarkThreadAsRead(sortedMessages)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => handleReply(otherUserId, otherUserName)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Undo2 className="h-3 w-3 mr-1" />
                  Reply
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {sortedMessages.map((msg) => {
                const isFromCurrentUser = msg.fromUserId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isFromCurrentUser ? 'text-right' : 'text-left'}`}>
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          isFromCurrentUser
                            ? 'bg-blue-600 text-white'
                            : msg.isRead
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-blue-50 text-gray-900 border-2 border-blue-200'
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">{msg.title}</p>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className={`text-xs mt-1 ${isFromCurrentUser ? 'text-gray-500' : 'text-gray-500'}`}>
                        {formatTimeAgo(msg.createdAt)}
                        {!isFromCurrentUser && !msg.isRead && (
                          <span className="ml-2 text-blue-600 font-medium">New</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Reply Modal */}
      {replyTo && (
        <SendMessageModal
          isOpen={isReplyModalOpen}
          onClose={() => {
            setIsReplyModalOpen(false);
            setReplyTo(null);
          }}
          recipientUserId={replyTo.userId}
          recipientName={replyTo.name}
        />
      )}
    </div>
  );
}

