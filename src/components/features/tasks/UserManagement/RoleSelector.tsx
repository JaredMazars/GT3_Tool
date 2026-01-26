'use client';

import { useState } from 'react';
import { ServiceLineRole } from '@/types';
import { AlertModal } from '@/components/shared/AlertModal';

interface RoleSelectorProps {
  taskId: number;
  userId: string;
  currentRole: ServiceLineRole | string;
  onChange: () => void;
}

export function RoleSelector({ taskId, userId, currentRole, onChange }: RoleSelectorProps) {
  const [updating, setUpdating] = useState(false);

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

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) return;

    setUpdating(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        onChange();
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Failed to update role',
          variant: 'error',
        });
      }
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'An error occurred while updating role. Please try again.',
        variant: 'error',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <select
        value={currentRole}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={updating}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        <option value="VIEWER">Viewer</option>
        <option value="USER">User</option>
        <option value="SUPERVISOR">Supervisor</option>
        <option value="MANAGER">Manager</option>
        <option value="PARTNER">Partner</option>
        <option value="ADMINISTRATOR">Administrator</option>
      </select>

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





