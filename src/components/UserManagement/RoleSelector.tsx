'use client';

import { useState } from 'react';
import { ProjectRole } from '@/types';

interface RoleSelectorProps {
  projectId: number;
  userId: string;
  currentRole: ProjectRole;
  onChange: () => void;
}

export function RoleSelector({ projectId, userId, currentRole, onChange }: RoleSelectorProps) {
  const [updating, setUpdating] = useState(false);

  const handleRoleChange = async (newRole: ProjectRole) => {
    if (newRole === currentRole) return;

    setUpdating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        onChange();
      } else {
        alert(data.error || 'Failed to update role');
      }
    } catch (err) {
      alert('An error occurred while updating role');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <select
      value={currentRole}
      onChange={(e) => handleRoleChange(e.target.value as ProjectRole)}
      disabled={updating}
      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
    >
      <option value="VIEWER">Viewer</option>
      <option value="EDITOR">Editor</option>
      <option value="REVIEWER">Reviewer</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}


