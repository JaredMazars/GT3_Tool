'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import { LeaderGroupCard } from '@/components/features/admin/leaders/LeaderGroupCard';
import { CreateGroupModal } from '@/components/features/admin/leaders/CreateGroupModal';
import { EditGroupModal } from '@/components/features/admin/leaders/EditGroupModal';
import { AddMembersModal } from '@/components/features/admin/leaders/AddMembersModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { Banner } from '@/components/ui';

interface Employee {
  id: number;
  EmpCode: string;
  EmpName: string;
  EmpNameFull: string;
  OfficeCode: string;
  EmpCatDesc: string;
}

interface LeaderGroupMember {
  id: number;
  addedAt: string;
  employee: Employee;
}

interface LeaderGroup {
  id: number;
  name: string;
  description: string | null;
  type: 'GROUP' | 'INDIVIDUAL';
  members: LeaderGroupMember[];
}

export default function LeadersPageClient() {
  const [groups, setGroups] = useState<LeaderGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<LeaderGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GROUP' | 'INDIVIDUAL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);

  // Selected items
  const [selectedGroup, setSelectedGroup] = useState<LeaderGroup | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{
    groupId: number;
    employeeId: number;
    employeeName: string;
  } | null>(null);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Filter groups when search term or type filter changes
  useEffect(() => {
    let filtered = groups;

    // Apply type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((g) => g.type === typeFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredGroups(filtered);
  }, [searchTerm, groups, typeFilter]);

  // Auto-hide success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [success]);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/leaders');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to access this page.');
        } else {
          setError(data.error || 'Failed to load leader groups');
        }
        return;
      }

      if (data.success) {
        setGroups(data.data);
        setFilteredGroups(data.data);
      } else {
        setError('Failed to load leader groups');
      }
    } catch (err) {
      setError('An error occurred while loading leader groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (data: { name: string; description?: string; type: 'GROUP' | 'INDIVIDUAL' }) => {
    setError(null);
    try {
      const response = await fetch('/api/admin/leaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create group');
      }

      await fetchGroups();
      const entityType = data.type === 'INDIVIDUAL' ? 'Individual role' : 'Leader group';
      setSuccess(`${entityType} "${data.name}" created successfully`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group';
      setError(errorMessage);
      throw err;
    }
  };

  const handleEditGroup = async (data: { name?: string; description?: string }) => {
    if (!selectedGroup) return;

    setError(null);
    try {
      const response = await fetch(`/api/admin/leaders/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update group');
      }

      await fetchGroups();
      setSuccess(`Leader group "${data.name || selectedGroup.name}" updated successfully`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update group';
      setError(errorMessage);
      throw err;
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    setError(null);
    try {
      const response = await fetch(`/api/admin/leaders/${selectedGroup.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete group');
      }

      await fetchGroups();
      setSuccess(`Leader group "${selectedGroup.name}" deleted successfully`);
      setShowDeleteConfirm(false);
      setSelectedGroup(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete group';
      setError(errorMessage);
    }
  };

  const handleAddMembers = async (employeeIds: number[]) => {
    if (!selectedGroup) return;

    setError(null);
    try {
      const response = await fetch(`/api/admin/leaders/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add members');
      }

      await fetchGroups();
      setSuccess(
        `${employeeIds.length} member${employeeIds.length !== 1 ? 's' : ''} added to "${
          selectedGroup.name
        }"`
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add members';
      setError(errorMessage);
      throw err;
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setError(null);
    try {
      const response = await fetch(
        `/api/admin/leaders/${memberToRemove.groupId}/members?employeeId=${memberToRemove.employeeId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove member');
      }

      await fetchGroups();
      setSuccess(`${memberToRemove.employeeName} removed from group`);
      setShowRemoveMemberConfirm(false);
      setMemberToRemove(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove member';
      setError(errorMessage);
    }
  };

  const openEdit = (group: LeaderGroup) => {
    setSelectedGroup(group);
    setShowEditModal(true);
  };

  const openAddMembers = (group: LeaderGroup) => {
    setSelectedGroup(group);
    setShowAddMembersModal(true);
  };

  const openDelete = (group: LeaderGroup) => {
    setSelectedGroup(group);
    setShowDeleteConfirm(true);
  };

  const openRemoveMember = (groupId: number, employeeId: number) => {
    const group = groups.find((g) => g.id === groupId);
    const member = group?.members.find((m) => m.employee.id === employeeId);

    if (group && member) {
      setMemberToRemove({
        groupId,
        employeeId,
        employeeName: member.employee.EmpName,
      });
      setShowRemoveMemberConfirm(true);
    }
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-forvis-gray-900 flex items-center">
            <Users className="h-8 w-8 mr-3 text-forvis-blue-600" />
            Leaders
          </h1>
          <p className="mt-2 text-sm font-normal text-forvis-gray-600">
            Manage firm-wide leader groups for communication routing
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Banner
            variant="error"
            message={error}
            dismissible
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}
        {success && (
          <Banner
            variant="success"
            message={success}
            dismissible
            onDismiss={() => setSuccess(null)}
            className="mb-6"
          />
        )}

        {/* Type Filter Tabs */}
        <div className="mb-6 border-b border-forvis-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                typeFilter === 'ALL'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
              }`}
            >
              All ({groups.length})
            </button>
            <button
              onClick={() => setTypeFilter('GROUP')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                typeFilter === 'GROUP'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
              }`}
            >
              Groups ({groups.filter((g) => g.type === 'GROUP').length})
            </button>
            <button
              onClick={() => setTypeFilter('INDIVIDUAL')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                typeFilter === 'INDIVIDUAL'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
              }`}
            >
              Individual Roles ({groups.filter((g) => g.type === 'INDIVIDUAL').length})
            </button>
          </nav>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-corporate hover:shadow-corporate-md transition-all duration-200 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            <Plus className="h-5 w-5" />
            Create Group
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 bg-forvis-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-16">
            {searchTerm ? (
              <div>
                <p className="text-forvis-gray-600 mb-2">No groups found matching "{searchTerm}"</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-sm text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div
                className="max-w-md mx-auto p-8 rounded-lg border-2 border-dashed border-forvis-gray-300"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <Users className="h-16 w-16 mx-auto mb-4 text-forvis-gray-400" />
                <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                  No Leader Groups Yet
                </h3>
                <p className="text-sm text-forvis-gray-600 mb-4">
                  Create your first leader group to organize firm-wide leaders for communication routing
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-corporate"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Create First Group
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <LeaderGroupCard
                key={group.id}
                group={group}
                onEdit={openEdit}
                onAddMembers={openAddMembers}
                onDelete={openDelete}
                onRemoveMember={openRemoveMember}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGroup}
      />

      {selectedGroup && (
        <>
          <EditGroupModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedGroup(null);
            }}
            onSubmit={handleEditGroup}
            currentName={selectedGroup.name}
            currentDescription={selectedGroup.description}
            currentType={selectedGroup.type}
          />

          <AddMembersModal
            isOpen={showAddMembersModal}
            onClose={() => {
              setShowAddMembersModal(false);
              setSelectedGroup(null);
            }}
            onSubmit={handleAddMembers}
            excludeEmployeeIds={selectedGroup.members.map((m) => m.employee.id)}
            groupName={selectedGroup.name}
            groupType={selectedGroup.type}
          />
        </>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedGroup(null);
        }}
        onConfirm={handleDeleteGroup}
        title="Delete Leader Group"
        message={`Are you sure you want to delete "${selectedGroup?.name}"? This will remove all ${
          selectedGroup?.members.length || 0
        } member${
          selectedGroup?.members.length !== 1 ? 's' : ''
        } from the group. This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showRemoveMemberConfirm}
        onClose={() => {
          setShowRemoveMemberConfirm(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToRemove?.employeeName} from this group?`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
