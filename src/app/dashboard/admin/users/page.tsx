'use client';

import { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  UserPlusIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { getRoleBadgeColor, formatRole, formatDate } from '@/lib/utils/projectUtils';
import { UserSearchModal } from '@/components/features/projects/UserManagement/UserSearchModal';
import { ADUser } from '@/types';

interface SystemUser {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  projectCount: number;
  lastActivity: string;
  roles: string[];
  projects: Array<{
    id: number;
    role: string;
    project: {
      id: number;
      name: string;
      projectType: string;
      client?: {
        id: number;
        name: string;
      };
    };
  }>;
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'system' | 'active-directory' | 'unassigned'>('system');
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // AD Search
  const [adSearchQuery, setAdSearchQuery] = useState('');
  const [adSearchResults, setAdSearchResults] = useState<ADUser[]>([]);
  const [adLoading, setAdLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'system') {
      fetchSystemUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'system') {
      const filtered = systemUsers.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.projects.some(p => p.project.name.toLowerCase().includes(searchLower))
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, systemUsers, activeTab]);

  const fetchSystemUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have admin access. Please contact an administrator.');
        } else if (response.status === 401) {
          setError('Please log in to access this page.');
        } else {
          setError(data.error || 'Failed to load users');
        }
        return;
      }
      
      if (data.success) {
        setSystemUsers(data.data);
        setFilteredUsers(data.data);
      } else {
        setError('Failed to load users');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('An error occurred while loading users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleADSearch = async () => {
    if (!adSearchQuery.trim()) return;

    setAdLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(adSearchQuery)}`);
      const data = await response.json();
      if (data.success) {
        setAdSearchResults(data.data);
      }
    } catch (error) {
      console.error('Failed to search AD:', error);
    } finally {
      setAdLoading(false);
    }
  };

  const handleRemoveFromAllProjects = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from ALL projects?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSystemUsers();
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  };

  const unassignedUsers = systemUsers.filter(u => u.projectCount === 0);

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-forvis-gray-900 flex items-center">
            <UserGroupIcon className="h-8 w-8 mr-3 text-forvis-blue-600" />
            User Management
          </h1>
          <p className="mt-2 text-sm text-forvis-gray-700">
            Manage users, permissions, and project assignments across the system
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-forvis-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('system')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'system'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
                }`}
              >
                System Users ({systemUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('active-directory')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'active-directory'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
                }`}
              >
                Active Directory Search
              </button>
              <button
                onClick={() => setActiveTab('unassigned')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'unassigned'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
                }`}
              >
                Unassigned Users ({unassignedUsers.length})
              </button>
            </nav>
          </div>
        </div>

        {/* System Users Tab */}
        {activeTab === 'system' && (
          <div>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                <input
                  type="text"
                  placeholder="Search users, projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-forvis-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : error ? (
              <div className="card p-8 text-center">
                <div className="text-red-600 mb-2 text-lg font-semibold">⚠️ Access Denied</div>
                <p className="text-forvis-gray-600">{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="card card-hover p-6 cursor-pointer"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowDetailModal(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-forvis-gray-900">
                            {user.name || user.email}
                          </h3>
                          {user.roles.map(role => (
                            <span
                              key={role}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                            >
                              {formatRole(role)}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-forvis-gray-600 mb-2">{user.email}</p>
                        <div className="flex items-center space-x-4 text-sm text-forvis-gray-500">
                          <span className="flex items-center">
                            <FolderIcon className="h-4 w-4 mr-1" />
                            {user.projectCount} projects
                          </span>
                          <span>Last active: {formatDate(user.lastActivity)}</span>
                          <span>Joined: {formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromAllProjects(user.id);
                        }}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from all projects"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-forvis-gray-500">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Active Directory Tab */}
        {activeTab === 'active-directory' && (
          <div>
            <div className="mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-2xl">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Active Directory by name or email..."
                    value={adSearchQuery}
                    onChange={(e) => setAdSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleADSearch();
                      }
                    }}
                    className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleADSearch}
                  disabled={adLoading}
                  className="btn-primary disabled:bg-gray-400"
                >
                  {adLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {adSearchResults.length > 0 && (
              <div className="space-y-4">
                {adSearchResults.map(adUser => (
                  <div key={adUser.id} className="card p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-forvis-gray-900">
                          {adUser.displayName}
                        </h3>
                        <p className="text-sm text-forvis-gray-600">{adUser.email}</p>
                        {adUser.jobTitle && (
                          <p className="text-xs text-forvis-gray-500 mt-1">{adUser.jobTitle}</p>
                        )}
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          // Would open a modal to add user to projects
                          alert('Add to projects feature - would open modal to select projects and role');
                        }}
                      >
                        <UserPlusIcon className="h-5 w-5 mr-2" />
                        Add to Projects
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!adLoading && adSearchResults.length === 0 && adSearchQuery && (
              <div className="text-center py-12 text-forvis-gray-500">
                No users found in Active Directory
              </div>
            )}
          </div>
        )}

        {/* Unassigned Users Tab */}
        {activeTab === 'unassigned' && (
          <div>
            {unassignedUsers.length === 0 ? (
              <div className="text-center py-12 text-forvis-gray-500">
                All users are assigned to at least one project
              </div>
            ) : (
              <div className="space-y-4">
                {unassignedUsers.map(user => (
                  <div key={user.id} className="card p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-forvis-gray-900">
                          {user.name || user.email}
                        </h3>
                        <p className="text-sm text-forvis-gray-600">{user.email}</p>
                        <p className="text-xs text-forvis-gray-500 mt-1">
                          Joined: {formatDate(user.createdAt)}
                        </p>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          // Would open a modal to add user to projects
                          alert('Add to projects feature - would open modal to select projects and role');
                        }}
                      >
                        <UserPlusIcon className="h-5 w-5 mr-2" />
                        Assign to Projects
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Detail Modal */}
        {showDetailModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                    <p className="text-gray-600">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="card p-4">
                    <div className="text-sm text-forvis-gray-600">Total Projects</div>
                    <div className="text-2xl font-bold text-forvis-gray-900">{selectedUser.projectCount}</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-forvis-gray-600">Roles</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedUser.roles.map(role => (
                        <span
                          key={role}
                          className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(role)}`}
                        >
                          {formatRole(role)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-forvis-gray-600">Last Activity</div>
                    <div className="text-sm font-medium text-forvis-gray-900">{formatDate(selectedUser.lastActivity)}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-forvis-gray-900 mb-4">Project Assignments</h3>
                  <div className="space-y-3">
                    {selectedUser.projects.map(projectUser => (
                      <div key={projectUser.id} className="flex items-center justify-between p-4 border border-forvis-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-forvis-gray-900">{projectUser.project.name}</div>
                          {projectUser.project.client && (
                            <div className="text-sm text-forvis-gray-600">{projectUser.project.client.name}</div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(projectUser.role)}`}>
                          {formatRole(projectUser.role)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleRemoveFromAllProjects(selectedUser.id)}
                    className="w-full px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <TrashIcon className="h-5 w-5 inline mr-2" />
                    Remove from All Projects
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

