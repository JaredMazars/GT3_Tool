'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectUser, ProjectRole } from '@/types';
import { ProjectUserList } from '@/components/UserManagement/ProjectUserList';
import { UserSearchModal } from '@/components/UserManagement/UserSearchModal';

export default function ProjectUsersPage() {
  const params = useParams();
  const projectId = parseInt(params.id as string);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<ProjectRole>('VIEWER' as ProjectRole);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, [projectId]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/users`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        // Get current user from session (you might need to adjust this based on your auth setup)
        // For now, we'll just use the first admin user
        const adminUser = data.data.users.find((u: any) => u.role === 'ADMIN');
        if (adminUser) {
          setCurrentUserId(adminUser.userId);
          setCurrentUserRole(adminUser.role);
        }
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600 mt-1">Manage project access and roles</p>
        </div>

        {currentUserRole === 'ADMIN' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Add User
          </button>
        )}
      </div>

      <ProjectUserList
        projectId={projectId}
        users={users}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onUserRemoved={fetchUsers}
        onRoleChanged={fetchUsers}
      />

      <UserSearchModal
        projectId={projectId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUserAdded={fetchUsers}
      />
    </div>
  );
}





