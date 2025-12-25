'use client';

import { useState } from 'react';
import { TaskTeam, ServiceLineRole } from '@/types';
import { RoleSelector } from './RoleSelector';
import { SendMessageModal } from '@/components/features/notifications/SendMessageModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { AlertModal } from '@/components/shared/AlertModal';
import { UserCircle, Mail, Briefcase, Building2, Calendar, X, MessageCircle } from 'lucide-react';

interface TaskUserListProps {
  taskId: number;
  users: TaskTeam[];
  currentUserId: string;
  currentUserRole: ServiceLineRole | string;
  onUserRemoved: () => void;
  onRoleChanged: () => void;
}

export function TaskUserList({
  taskId,
  users,
  currentUserId,
  currentUserRole,
  onUserRemoved,
  onRoleChanged,
}: TaskUserListProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<TaskTeam | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{ userId: string; name: string; taskId: number; taskName?: string } | null>(null);

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

  const handleRemoveUser = async (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove User from Task',
      message: 'Are you sure you want to remove this user from the task? They will lose all access to task data.',
      variant: 'danger',
      onConfirm: async () => {
        setRemovingUserId(userId);

        try {
          const response = await fetch(`/api/tasks/${taskId}/users/${userId}`, {
            method: 'DELETE',
          });

          const data = await response.json();

          if (data.success) {
            onUserRemoved();
            if (selectedUser?.userId === userId) {
              setSelectedUser(null);
            }
          } else {
            setAlertModal({
              isOpen: true,
              title: 'Error',
              message: data.error || 'Failed to remove user',
              variant: 'error',
            });
          }
        } catch (err) {
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'An error occurred while removing user. Please try again.',
            variant: 'error',
          });
        } finally {
          setRemovingUserId(null);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const canManageUsers = currentUserRole === 'ADMINISTRATOR' || currentUserRole === 'PARTNER' || currentUserRole === 'MANAGER';

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'PARTNER':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'SUPERVISOR':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'USER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'Service line administrator with full access';
      case 'PARTNER':
        return 'Partner level access, can approve letters';
      case 'MANAGER':
        return 'Manager level access, can manage tasks';
      case 'SUPERVISOR':
        return 'Supervisor level access';
      case 'USER':
        return 'Standard user access';
      case 'VIEWER':
        return 'Read-only access to task data';
      default:
        return '';
    }
  };

  const getInitials = (name: string | null | undefined, email: string | undefined) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email ? email.slice(0, 2).toUpperCase() : '??';
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((taskUser) => {
          const user = 'User' in taskUser ? taskUser.User : ('user' in taskUser ? taskUser.user : undefined);
          return (
            <div
              key={taskUser.id}
              onClick={() => setSelectedUser(taskUser)}
              className="bg-white border-2 border-forvis-gray-200 rounded-lg p-4 hover:border-forvis-blue-500 hover:shadow-corporate-md transition-all cursor-pointer shadow-corporate"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-corporate"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    {getInitials(user?.name, user?.email)}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-forvis-gray-900 truncate">
                      {user?.name || user?.email || 'Unknown User'}
                    </h3>
                    {taskUser.userId === currentUserId && (
                      <span className="text-xs px-2 py-0.5 bg-forvis-blue-100 text-forvis-blue-800 rounded-full font-medium">
                        You
                      </span>
                    )}
                    {'hasAccount' in taskUser && taskUser.hasAccount === false && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium border border-amber-300">
                        No Account
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-forvis-gray-600 mb-2">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{user?.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getRoleBadgeColor(taskUser.role)}`}>
                      {taskUser.role}
                    </span>
                    {'hasAccount' in taskUser && taskUser.hasAccount === false ? (
                      <span className="text-xs text-amber-700 font-medium">
                        Account pending
                      </span>
                    ) : (
                      <span className="text-xs text-forvis-gray-500">
                        Added {new Date(taskUser.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-forvis-gray-300 shadow-corporate">
          <UserCircle className="w-16 h-16 mx-auto text-forvis-gray-400 mb-3" />
          <p className="text-forvis-gray-700 font-semibold">No team members yet</p>
          <p className="text-sm text-forvis-gray-600 mt-1">Add users to start collaborating on this task</p>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (() => {
        const user = 'User' in selectedUser ? selectedUser.User : ('user' in selectedUser ? selectedUser.user : undefined);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full border-2 border-forvis-gray-200">
              {/* Header */}
              <div className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #EBF2FA, #D6E4F5)' }}>
                <h2 className="text-xl font-bold text-forvis-blue-900">Team Member Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* User Header */}
                <div className="flex items-center gap-4">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-corporate-md"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    {getInitials(user?.name, user?.email)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-forvis-gray-900">
                      {user?.name || user?.email || 'Unknown User'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-sm px-3 py-1 rounded-full font-medium border ${getRoleBadgeColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                      {selectedUser.userId === currentUserId && (
                        <span className="text-sm px-3 py-1 bg-forvis-blue-100 text-forvis-blue-800 rounded-full font-medium">
                          You
                        </span>
                      )}
                      {'hasAccount' in selectedUser && selectedUser.hasAccount === false && (
                        <span className="text-sm px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-medium border border-amber-300">
                          No Account
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-forvis-gray-50 rounded-lg p-4 border border-forvis-gray-200">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-forvis-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-forvis-gray-700">Email</p>
                        <p className="text-sm text-forvis-gray-900 mt-0.5">{user?.email || 'No email'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-forvis-gray-50 rounded-lg p-4 border border-forvis-gray-200">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-forvis-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-forvis-gray-700">Added to Task</p>
                      {'hasAccount' in selectedUser && selectedUser.hasAccount === false ? (
                        <p className="text-sm text-amber-700 mt-0.5 font-medium">
                          Account pending - user will be added automatically when they sign in
                        </p>
                      ) : (
                        <p className="text-sm text-forvis-gray-900 mt-0.5">
                          {new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                  <div className="rounded-lg p-4 border-2 border-forvis-blue-300" style={{ background: 'linear-gradient(135deg, #EBF2FA 0%, #D6E4F5 100%)' }}>
                    <p className="text-sm font-semibold text-forvis-blue-900 mb-2">Role Permissions</p>
                    <p className="text-sm text-forvis-blue-800">{getRoleDescription(selectedUser.role)}</p>
                  </div>
              </div>

                {/* Role Management */}
                {canManageUsers && selectedUser.userId !== currentUserId && (
                  <div className="border-t-2 border-forvis-gray-200 pt-6">
                    <h4 className="text-sm font-bold text-forvis-gray-900 mb-3">Manage Access</h4>
                    {'hasAccount' in selectedUser && selectedUser.hasAccount === false ? (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                          This team member doesn't have an account yet. They will automatically be added to the team when they sign in for the first time.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <RoleSelector
                            taskId={taskId}
                            userId={selectedUser.userId}
                            currentRole={selectedUser.role}
                            onChange={() => {
                              onRoleChanged();
                              setSelectedUser(null);
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveUser(selectedUser.userId)}
                          disabled={removingUserId === selectedUser.userId}
                          className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:bg-gray-400 transition-colors shadow-corporate hover:shadow-corporate-md"
                          style={{ 
                            background: removingUserId === selectedUser.userId ? '#6C757D' : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
                          }}
                        >
                          {removingUserId === selectedUser.userId ? 'Removing...' : 'Remove from Task'}
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-forvis-gray-50 border-t-2 border-forvis-gray-200 flex justify-between">
                {selectedUser.userId !== currentUserId && !('hasAccount' in selectedUser && selectedUser.hasAccount === false) && (
                  <button
                    onClick={() => {
                      setMessageRecipient({
                        userId: selectedUser.userId,
                        name: user?.name || user?.email || 'User',
                        taskId,
                      });
                      setShowMessageModal(true);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate hover:shadow-corporate-md"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    Send Message
                  </button>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-sm font-semibold text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-100 transition-colors shadow-corporate ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Send Message Modal */}
      {messageRecipient && (
        <SendMessageModal
          isOpen={showMessageModal}
          onClose={() => {
            setShowMessageModal(false);
            setMessageRecipient(null);
          }}
          recipientUserId={messageRecipient.userId}
          recipientName={messageRecipient.name}
          taskId={messageRecipient.taskId}
        />
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </>
  );
}


