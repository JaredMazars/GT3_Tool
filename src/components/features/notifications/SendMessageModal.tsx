'use client';

import { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { useSendMessage } from '@/hooks/notifications/useNotifications';
import { SendMessageData } from '@/types/notification';
import { AlertModal } from '@/components/shared/AlertModal';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUserId?: string;
  recipientName?: string;
  taskId?: number;
  taskName?: string;
}

export function SendMessageModal({
  isOpen,
  onClose,
  recipientUserId: initialRecipientId,
  recipientName: initialRecipientName,
  taskId: initialTaskId,
  taskName: initialTaskName,
}: SendMessageModalProps) {
  const [recipientUserId, setRecipientUserId] = useState(initialRecipientId || '');
  const [recipientName, setRecipientName] = useState(initialRecipientName || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [taskId, setTaskId] = useState<number | undefined>(initialTaskId);
  const [actionUrl, setActionUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });
  
  const sendMessage = useSendMessage();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRecipientUserId(initialRecipientId || '');
      setRecipientName(initialRecipientName || '');
      setTaskId(initialTaskId);
      setTitle('');
      setMessage('');
      setActionUrl('');
      setErrors({});
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialRecipientId, initialRecipientName, initialTaskId]);

  // Search users
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const result = await response.json();
          setSearchResults(result.data || []);
        }
      } catch (error) {
        // Search failed silently
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!recipientUserId) {
      newErrors.recipient = 'Please select a recipient';
    }
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }
    if (!message.trim()) {
      newErrors.message = 'Message is required';
    } else if (message.length > 1000) {
      newErrors.message = 'Message must be 1000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: SendMessageData = {
      recipientUserId,
      title: title.trim(),
      message: message.trim(),
      taskId: taskId,
      actionUrl: actionUrl.trim() || undefined,
    };

    try {
      await sendMessage.mutateAsync(data);
      onClose();
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Message sent successfully!',
        variant: 'success',
      });
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to send message' });
    }
  };

  const handleSelectUser = (user: { id: string; name: string; email: string }) => {
    setRecipientUserId(user.id);
    setRecipientName(user.name || user.email);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Close button */}
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="sm:flex sm:items-start">
            <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Send Message
              </h3>
              <div className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Recipient */}
                  <div>
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
                      To <span className="text-red-500">*</span>
                    </label>
                    {recipientUserId ? (
                      <div className="mt-1 flex items-center justify-between p-2 border border-gray-300 rounded-md bg-gray-50">
                        <span className="text-sm text-gray-900">{recipientName}</span>
                        {!initialRecipientId && (
                          <button
                            type="button"
                            onClick={() => {
                              setRecipientUserId('');
                              setRecipientName('');
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Change
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 relative">
                        <input
                          type="text"
                          id="recipient"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by name or email..."
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto border border-gray-200">
                            {searchResults.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => handleSelectUser(user)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                              >
                                <div className="font-medium text-gray-900">{user.name || 'No name'}</div>
                                <div className="text-gray-500">{user.email}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {errors.recipient && <p className="mt-1 text-sm text-red-600">{errors.recipient}</p>}
                  </div>

                  {/* Task (if pre-filled, show read-only) */}
                  {initialTaskId && initialTaskName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Task</label>
                      <div className="mt-1 p-2 border border-gray-300 rounded-md bg-gray-50">
                        <span className="text-sm text-gray-900">{initialTaskName}</span>
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter message title"
                    />
                    <div className="mt-1 flex justify-between">
                      {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
                      <p className="text-xs text-gray-500 ml-auto">{title.length}/200</p>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={1000}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter your message"
                    />
                    <div className="mt-1 flex justify-between">
                      {errors.message && <p className="text-sm text-red-600">{errors.message}</p>}
                      <p className="text-xs text-gray-500 ml-auto">{message.length}/1000</p>
                    </div>
                  </div>

                  {/* Action URL (optional) */}
                  <div>
                    <label htmlFor="actionUrl" className="block text-sm font-medium text-gray-700">
                      Link (optional)
                    </label>
                    <input
                      type="text"
                      id="actionUrl"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="/dashboard/tasks/123"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional link for the recipient to navigate to
                    </p>
                  </div>

                  {/* Submit error */}
                  {errors.submit && (
                    <div className="rounded-md bg-red-50 p-4">
                      <p className="text-sm text-red-800">{errors.submit}</p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                    <button
                      type="submit"
                      disabled={sendMessage.isPending}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      {sendMessage.isPending ? 'Sending...' : 'Send Message'}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </div>
  );
}

