'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search,
  Plus,
  Trash2,
  Pencil,
  UserPlus,
  Folder,
  ShieldCheck
} from 'lucide-react';
import { formatRole, formatDate } from '@/lib/utils/taskUtils';
import { getRoleBadgeColor } from '@/lib/utils/permissionUtils';
import { UserSearchModal } from '@/components/features/tasks/UserManagement/UserSearchModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { AlertModal } from '@/components/shared/AlertModal';
import { AddServiceLineModal } from '@/components/features/admin/AddServiceLineModal';
import { ADUser, ServiceLine, ServiceLineRole } from '@/types';
import { ServiceLineUser } from '@/types';
import { SERVICE_LINE_DETAILS } from '@/types/service-line';
import { useUserSystemRole } from '@/hooks/auth/usePermissions';

interface SystemUser {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  lastActivity: string;
  roles: string[];
  role?: string; // System role (SYSTEM_ADMIN or USER)
  serviceLines?: Array<{
    id: number;
    serviceLine: string; // This will be the masterCode from grouped sub-groups
    role: string;
    subServiceLineGroup?: string;
    assignmentType?: string;
  }>;
  tasks?: Array<{
    id: number;
    role: string;
    task: {
      id: number;
      name: string;
      serviceLine: string;
      client?: {
        id: number;
        clientCode: string;
        clientNameFull: string | null;
      } | null;
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
  
  // Service Line Access Management
  const [userServiceLines, setUserServiceLines] = useState<ServiceLineUser[]>([]);
  const [loadingServiceLines, setLoadingServiceLines] = useState(false);
  const [showAddServiceLineModal, setShowAddServiceLineModal] = useState(false);
  const updateUserServiceLinesState = (userId: string, serviceLines: ServiceLineUser[]) => {
    setSelectedUser((current) =>
      current && current.id === userId ? { ...current, serviceLines } : current
    );
    setSystemUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, serviceLines } : user
      )
    );
  };
  
  // System Role Management
  const [updatingSystemRole, setUpdatingSystemRole] = useState(false);
  const { data: currentUserSystemRole } = useUserSystemRole();
  const isCurrentUserSystemAdmin = currentUserSystemRole === 'SYSTEM_ADMIN';
  
  // AD Search
  const [adSearchQuery, setAdSearchQuery] = useState('');
  const [adSearchResults, setAdSearchResults] = useState<ADUser[]>([]);
  const [adLoading, setAdLoading] = useState(false);

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
          user.tasks?.some(t => t.task.name.toLowerCase().includes(searchLower))
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
      setError('An error occurred while loading users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleADSearch = async () => {
    if (!adSearchQuery.trim()) return;

    setAdLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(adSearchQuery)}&source=ad`);
      const data = await response.json();
      if (data.success) {
        setAdSearchResults(data.data);
      }
    } catch (error) {
      // Failed to search AD
    } finally {
      setAdLoading(false);
    }
  };

  const fetchUserServiceLines = async (
    userId: string,
    bustCache = false
  ): Promise<ServiceLineUser[]> => {
    const cacheBuster = bustCache ? `&_t=${Date.now()}` : '';
    const url = `/api/admin/service-line-access?userId=${userId}${cacheBuster}`;
    
    setLoadingServiceLines(true);
    try {
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store', // Force no HTTP caching
      });
      if (response.ok) {
        const data = await response.json();
        const serviceLines: ServiceLineUser[] = data.success ? data.data : [];
        setUserServiceLines(serviceLines);
        return serviceLines;
      }
    } catch (error) {
      // Silently handle error
      return [];
    } finally {
      setLoadingServiceLines(false);
    }
    return [];
  };

  const handleAddServiceLine = async (data: {
    type: 'main' | 'subgroup';
    masterCode?: string;
    subGroups?: string[];
    role: ServiceLineRole;
  }) => {
    if (!selectedUser) return;

    try {
      const response = await fetch('/api/admin/service-line-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUser.id,
          ...data,
        }),
      });

      if (response.ok) {
        // Fetch updated service lines with cache bust
        const updatedServiceLines = await fetchUserServiceLines(selectedUser.id, true);
        
        // Update both the modal state and main user list
        setSelectedUser((current) => 
          current ? { ...current, serviceLines: updatedServiceLines } : current
        );
        setSystemUsers((current) =>
          current.map((user) =>
            user.id === selectedUser.id ? { ...user, serviceLines: updatedServiceLines } : user
          )
        );
        
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: data.type === 'main' 
            ? `Service line access granted to all sub-groups in ${data.masterCode}`
            : `Access granted to ${data.subGroups?.length} specific sub-group(s)`,
          variant: 'success',
        });
      } else {
        const errorData = await response.json();
        console.error('Failed to add service line:', errorData);
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: errorData.error || 'Failed to add service line access',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Error adding service line:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'An error occurred while adding service line access',
        variant: 'error',
      });
    }
  };

  const handleRemoveServiceLine = async (subServiceLineGroup: string, masterCode: string) => {
    if (!selectedUser) return;

    setConfirmModal({
      isOpen: true,
      title: 'Remove Service Line Access',
      message: `Are you sure you want to remove access to ${masterCode}? This will remove all sub-groups within this service line.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const url = `/api/admin/service-line-access?userId=${selectedUser.id}&type=main&masterCode=${masterCode}`;
          const response = await fetch(url, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (response.ok) {
            // Wait a brief moment for cache invalidation to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Fetch updated service lines for modal with cache bust
            const updatedServiceLines = await fetchUserServiceLines(selectedUser.id, true);
            
            // Update modal state
            setSelectedUser((current) => 
              current ? { ...current, serviceLines: updatedServiceLines } : current
            );
            
            // Refetch entire user list to ensure main list is fresh
            await fetchSystemUsers();
          } else {
            const errorData = await response.json();
            console.error('Failed to remove service line:', errorData);
          }
        } catch (error) {
          console.error('Error removing service line:', error);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleUpdateServiceLineRole = async (subServiceLineGroup: string, newRole: ServiceLineRole) => {
    if (!selectedUser) return;

    try {
      const response = await fetch('/api/admin/service-line-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUser.id,
          serviceLineOrSubGroup: subServiceLineGroup,
          role: newRole,
          isSubGroup: false, // Update ALL sub-groups for this master code
        }),
      });

      if (response.ok) {
        // Fetch updated service lines with cache bust
        const updatedServiceLines = await fetchUserServiceLines(selectedUser.id, true);
        
        // Update both the modal state and main user list
        setSelectedUser((current) => 
          current ? { ...current, serviceLines: updatedServiceLines } : current
        );
        setSystemUsers((current) =>
          current.map((user) =>
            user.id === selectedUser.id ? { ...user, serviceLines: updatedServiceLines } : user
          )
        );
      } else {
        const errorData = await response.json();
        console.error('Failed to update role:', errorData);
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleRemoveFromAllTasks = async (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove User from All Tasks',
      message: 'Are you sure you want to remove this user from ALL tasks? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            fetchSystemUsers();
            setShowDetailModal(false);
          }
        } catch (error) {
          // Failed to remove user
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleUpdateSystemRole = async (userId: string, newRole: 'USER' | 'SYSTEM_ADMIN') => {
    const action = newRole === 'SYSTEM_ADMIN' ? 'promote' : 'demote';
    const confirmMessage = newRole === 'SYSTEM_ADMIN' 
      ? 'Are you sure you want to make this user a System Administrator? They will have full access to all features and service lines.'
      : 'Are you sure you want to remove System Administrator privileges from this user?';
    
    setConfirmModal({
      isOpen: true,
      title: newRole === 'SYSTEM_ADMIN' ? 'Grant System Administrator' : 'Remove System Administrator',
      message: confirmMessage,
      variant: 'warning',
      onConfirm: async () => {
        setUpdatingSystemRole(true);
        try {
          const response = await fetch(`/api/admin/users/${userId}/system-role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ systemRole: newRole }),
          });

          if (response.ok) {
            // Refresh the user list
            await fetchSystemUsers();
            // Refresh service lines for the modal (important for system admin changes)
            const updatedServiceLines = await fetchUserServiceLines(userId);
            // Update the selected user with new role and service lines
            if (selectedUser) {
              setSelectedUser({ ...selectedUser, role: newRole, serviceLines: updatedServiceLines });
            }
          } else {
            const data = await response.json();
            setAlertModal({
              isOpen: true,
              title: 'Error',
              message: data.error || `Failed to ${action} user`,
              variant: 'error',
            });
          }
        } catch (error) {
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: `An error occurred while trying to ${action} the user`,
            variant: 'error',
          });
        } finally {
          setUpdatingSystemRole(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Open modal and fetch service lines
  const handleOpenUserDetail = (user: SystemUser) => {
    setSelectedUser(user);
    setShowDetailModal(true);
    fetchUserServiceLines(user.id);
  };

  const unassignedUsers = systemUsers.filter(u => {
    // Exclude SYSTEM_ADMIN users (they have full access regardless)
    if (u.role === 'SYSTEM_ADMIN') return false;
    // Include users without service line access
    const hasNoServiceLines = !u.serviceLines || u.serviceLines.length === 0;
    
    // Debug logging for walter.admin
    if (u.email?.includes('walter.admin')) {
      console.log('walter.admin debug:', {
        email: u.email,
        role: u.role,
        serviceLines: u.serviceLines,
        hasNoServiceLines,
        willBeIncluded: hasNoServiceLines
      });
    }
    
    return hasNoServiceLines;
  });

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-forvis-gray-900 flex items-center">
            <Users className="h-8 w-8 mr-3 text-forvis-blue-600" />
            User Management
          </h1>
          <p className="mt-2 text-sm font-normal text-forvis-gray-600">
            Manage users, permissions, and task assignments across the system
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
                title="Users without service line access"
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                <input
                  type="text"
                  placeholder="Search users, tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
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
              <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-8 text-center">
                <div className="text-red-600 mb-2 text-lg font-semibold">⚠️ Access Denied</div>
                <p className="text-sm font-normal text-forvis-gray-600">{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate hover:shadow-corporate-md transition-all duration-200 ease-in-out p-6 cursor-pointer"
                    onClick={() => handleOpenUserDetail(user)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-forvis-gray-900">
                            {user.name || user.email}
                          </h3>
                          {user.role === 'SYSTEM_ADMIN' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white shadow-corporate" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                              <ShieldCheck className="h-4 w-4 mr-1" />
                              System Admin
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-forvis-gray-600 mb-3">{user.email}</p>
                        
                        {/* Security Details */}
                        <div className="mb-3">
                          <div className="text-xs font-bold text-forvis-gray-700 uppercase tracking-wide mb-1.5">Security Access</div>
                          
                          {/* System Role */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-forvis-gray-600">System:</span>
                            {user.role === 'SYSTEM_ADMIN' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Administrator
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-forvis-gray-100 text-forvis-gray-700 border border-forvis-gray-300">
                                Regular User
                              </span>
                            )}
                          </div>
                          
                          {/* Service Lines */}
                          {user.serviceLines && user.serviceLines.length > 0 ? (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-forvis-gray-600 mt-0.5">Service Lines:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {user.serviceLines.map((sl) => {
                                  const details = SERVICE_LINE_DETAILS[sl.serviceLine as ServiceLine];
                                  const Icon = details?.icon;
                                  
                                  // Role badge colors
                                  const roleBadgeColors: Record<string, string> = {
                                    VIEWER: 'bg-gray-100 text-gray-700 border-gray-300',
                                    USER: 'bg-blue-100 text-blue-700 border-blue-300',
                                    SUPERVISOR: 'bg-green-100 text-green-700 border-green-300',
                                    MANAGER: 'bg-purple-100 text-purple-700 border-purple-300',
                                    PARTNER: 'bg-orange-100 text-orange-700 border-orange-300',
                                    ADMIN: 'bg-red-100 text-red-700 border-red-300',
                                  };
                                  const badgeColor = roleBadgeColors[sl.role] || 'bg-blue-100 text-blue-700 border-blue-300';
                                  
                                  return (
                                    <span 
                                      key={sl.id} 
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}
                                      title={`${details?.name || sl.serviceLine} - ${sl.role}`}
                                    >
                                      {Icon && <Icon className="h-3 w-3 mr-1" />}
                                      {details?.name || sl.serviceLine} ({sl.role})
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-forvis-gray-600">Service Lines:</span>
                              <span className="text-xs text-forvis-gray-500 italic">No service line access</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Task Stats */}
                        <div className="flex items-center space-x-4 text-sm text-forvis-gray-500 pt-2 border-t border-forvis-gray-200">
                          <span className="flex items-center">
                            <Folder className="h-4 w-4 mr-1" />
                            {user.taskCount} tasks
                          </span>
                          <span>Last active: {formatDate(user.lastActivity)}</span>
                          <span>Joined: {formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromAllTasks(user.id);
                        }}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        title="Remove from all tasks"
                      >
                        <Trash2 className="h-5 w-5" />
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
            {/* Info Banner */}
            <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-blue-800 mb-1">Azure Active Directory Search</h3>
                  <p className="text-xs text-blue-700">
                    Search for users in your Azure Active Directory tenant. Results show comprehensive user information including contact details, job title, department, and location.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-2xl">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
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
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-forvis-gray-900">
                            {adUser.displayName}
                          </h3>
                        </div>
                        
                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Email:</span>
                            <span className="text-sm text-forvis-gray-900">{adUser.email}</span>
                          </div>
                          
                          {adUser.userPrincipalName && adUser.userPrincipalName !== adUser.email && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">UPN:</span>
                              <span className="text-sm text-forvis-gray-700">{adUser.userPrincipalName}</span>
                            </div>
                          )}
                          
                          {adUser.mobilePhone && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Mobile:</span>
                              <span className="text-sm text-forvis-gray-900">{adUser.mobilePhone}</span>
                            </div>
                          )}
                          
                          {adUser.businessPhones && adUser.businessPhones.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Phone:</span>
                              <span className="text-sm text-forvis-gray-900">{adUser.businessPhones.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Organization Information */}
                        {(adUser.jobTitle || adUser.department || adUser.companyName || adUser.employeeType) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-3 pt-2 border-t border-forvis-gray-200">
                            {adUser.jobTitle && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Job Title:</span>
                                <span className="text-sm text-forvis-gray-900">{adUser.jobTitle}</span>
                              </div>
                            )}
                            
                            {adUser.department && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Department:</span>
                                <span className="text-sm text-forvis-gray-900">{adUser.department}</span>
                              </div>
                            )}
                            
                            {adUser.employeeType && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Employee Type:</span>
                                <span className="text-sm text-forvis-gray-900">{adUser.employeeType}</span>
                              </div>
                            )}
                            
                            {adUser.companyName && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Company:</span>
                                <span className="text-sm text-forvis-gray-900">{adUser.companyName}</span>
                              </div>
                            )}
                            
                            {adUser.employeeId && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Employee ID:</span>
                                <span className="text-sm text-forvis-gray-900">{adUser.employeeId}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Location Information */}
                        {(adUser.officeLocation || adUser.city || adUser.country) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t border-forvis-gray-200">
                            {adUser.officeLocation && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Office:</span>
                                <span className="text-sm text-forvis-gray-900">{adUser.officeLocation}</span>
                              </div>
                            )}
                            
                            {adUser.city && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">City:</span>
                                <span className="text-sm text-forvis-gray-900">{adUser.city}</span>
                              </div>
                            )}
                            
                            {adUser.country && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-forvis-gray-500 min-w-[100px]">Country:</span>
                                <span className="text-sm text-forvis-gray-900">{adUser.country}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <button
                        className="btn-primary flex-shrink-0"
                        onClick={() => {
                          setAlertModal({
                            isOpen: true,
                            title: 'Feature Coming Soon',
                            message: 'Add to tasks feature - would open modal to select tasks and role',
                            variant: 'info',
                          });
                        }}
                      >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Add to Tasks
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
            <div className="mb-6 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-yellow-800 mb-1">Users Without Service Line Access</h3>
                  <p className="text-xs text-yellow-700">
                    These regular users are in the system but have not been assigned to any service lines. 
                    They will not have access to any features until assigned. System Administrators are excluded from this list as they have full access regardless.
                    Click on a user to assign them to service lines.
                  </p>
                </div>
              </div>
            </div>
            
            {unassignedUsers.length === 0 ? (
              <div className="text-center py-12 text-forvis-gray-500">
                All users have service line access assigned
              </div>
            ) : (
              <div className="space-y-4">
                {unassignedUsers.map(user => (
                  <div key={user.id} className="card card-hover p-6 cursor-pointer" onClick={() => handleOpenUserDetail(user)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-forvis-gray-900">
                            {user.name || user.email}
                          </h3>
                          {user.role === 'SYSTEM_ADMIN' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white shadow-corporate" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                              <ShieldCheck className="h-4 w-4 mr-1" />
                              System Admin
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-forvis-gray-600 mb-3">{user.email}</p>
                        
                        {/* Security Details */}
                        <div className="mb-3">
                          <div className="text-xs font-bold text-forvis-gray-700 uppercase tracking-wide mb-1.5">Security Access</div>
                          
                          {/* System Role */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-forvis-gray-600">System:</span>
                            {user.role === 'SYSTEM_ADMIN' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Administrator
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-forvis-gray-100 text-forvis-gray-700 border border-forvis-gray-300">
                                Regular User
                              </span>
                            )}
                          </div>
                          
                          {/* Service Lines */}
                          {user.serviceLines && user.serviceLines.length > 0 ? (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-forvis-gray-600 mt-0.5">Service Lines:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {user.serviceLines.map((sl) => {
                                  const details = SERVICE_LINE_DETAILS[sl.serviceLine as ServiceLine];
                                  const Icon = details?.icon;
                                  
                                  // Role badge colors
                                  const roleBadgeColors: Record<string, string> = {
                                    VIEWER: 'bg-gray-100 text-gray-700 border-gray-300',
                                    USER: 'bg-blue-100 text-blue-700 border-blue-300',
                                    SUPERVISOR: 'bg-green-100 text-green-700 border-green-300',
                                    MANAGER: 'bg-purple-100 text-purple-700 border-purple-300',
                                    PARTNER: 'bg-orange-100 text-orange-700 border-orange-300',
                                    ADMIN: 'bg-red-100 text-red-700 border-red-300',
                                  };
                                  const badgeColor = roleBadgeColors[sl.role] || 'bg-blue-100 text-blue-700 border-blue-300';
                                  
                                  return (
                                    <span 
                                      key={sl.id} 
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}
                                      title={`${details?.name || sl.serviceLine} - ${sl.role}`}
                                    >
                                      {Icon && <Icon className="h-3 w-3 mr-1" />}
                                      {details?.name || sl.serviceLine} ({sl.role})
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-forvis-gray-600">Service Lines:</span>
                              <span className="text-xs text-forvis-gray-500 italic">No service line access</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-forvis-gray-500 pt-2 border-t border-forvis-gray-200">
                          Joined: {formatDate(user.createdAt)} • Last active: {formatDate(user.lastActivity)}
                        </p>
                      </div>
                      <button
                        className="btn-primary ml-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUserDetail(user);
                        }}
                      >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Assign Service Line
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
                    <div className="text-sm text-forvis-gray-600">Total Tasks</div>
                    <div className="text-2xl font-bold text-forvis-gray-900">{selectedUser.taskCount}</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-forvis-gray-600">Task Roles</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedUser.roles && selectedUser.roles.length > 0 ? (
                        selectedUser.roles.map(role => (
                          <span
                            key={role}
                            className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(role)}`}
                          >
                            {formatRole(role)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-forvis-gray-500 italic">No task assignments</span>
                      )}
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-forvis-gray-600">Last Activity</div>
                    <div className="text-sm font-medium text-forvis-gray-900">{formatDate(selectedUser.lastActivity)}</div>
                  </div>
                </div>

                {/* System Role Management Section - Only visible to System Admins */}
                {isCurrentUserSystemAdmin && (
                  <div className="mb-6">
                    <div className="rounded-xl border-2 overflow-hidden shadow-corporate" style={{ borderColor: '#2E5AAC' }}>
                      <div 
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-white" />
                          <h3 className="text-base font-bold text-white">System Role</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedUser.role === 'SYSTEM_ADMIN' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border-2 border-white/40">
                              <ShieldCheck className="h-4 w-4 mr-1" />
                              System Administrator
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/30">
                              Regular User
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <p className="text-sm text-forvis-gray-700 mb-4">
                          {selectedUser.role === 'SYSTEM_ADMIN' ? (
                            <>
                              This user has <span className="font-bold text-forvis-blue-600">System Administrator</span> privileges 
                              with full access to all features, service lines, and tasks.
                            </>
                          ) : (
                            <>
                              This user has <span className="font-bold">regular user</span> access. They require 
                              service line assignments and task assignments to access features.
                            </>
                          )}
                        </p>
                        
                        {selectedUser.role === 'SYSTEM_ADMIN' ? (
                          <button
                            onClick={() => handleUpdateSystemRole(selectedUser.id, 'USER')}
                            disabled={updatingSystemRole}
                            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingSystemRole ? 'Updating...' : 'Remove System Administrator'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateSystemRole(selectedUser.id, 'SYSTEM_ADMIN')}
                            disabled={updatingSystemRole}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-forvis-blue-500 hover:bg-forvis-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors shadow-corporate disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {updatingSystemRole ? 'Updating...' : 'Make System Administrator'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Service Line Access Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-forvis-gray-900">Service Line Access</h3>
                      <p className="text-xs text-forvis-gray-600 mt-1">Assign service lines and set permission levels for this user</p>
                    </div>
                    <button
                      onClick={() => setShowAddServiceLineModal(true)}
                      className="btn-primary text-sm flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Service Line
                    </button>
                  </div>

                  {loadingServiceLines ? (
                    <div className="animate-pulse space-y-2">
                      <div key="skeleton-1" className="h-16 bg-gray-200 rounded-lg"></div>
                      <div key="skeleton-2" className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ) : userServiceLines.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 font-medium">No service line access assigned</p>
                      <p className="text-sm text-gray-400 mt-1">Click "Add Service Line" above to grant access</p>
                    </div>
                  ) : (
                    <div>
                      {/* Role Descriptions */}
                      <div className="mb-4 p-3 rounded-lg border-2" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderColor: '#E0EDFB' }}>
                        <details className="group">
                          <summary className="cursor-pointer text-xs font-bold flex items-center gap-1 text-forvis-blue-700">
                            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Role Permission Guide
                          </summary>
                          <div className="mt-2 ml-5 text-xs space-y-1 text-forvis-gray-700">
                            <div><span className="font-semibold">Viewer:</span> Read-only access to view data</div>
                            <div><span className="font-semibold">User:</span> Can work on assigned tasks, create mappings and adjustments</div>
                            <div><span className="font-semibold">Supervisor:</span> Can create tasks, assign users, approve acceptance</div>
                            <div><span className="font-semibold">Manager:</span> Full CRUD on clients & tasks within service line</div>
                            <div><span className="font-semibold">Partner:</span> Full access across all service lines</div>
                            <div><span className="font-semibold">Admin:</span> Full access + admin pages & system management</div>
                          </div>
                        </details>
                      </div>
                      <div className="space-y-2">
                      {userServiceLines.map((slUser) => {
                        const details = SERVICE_LINE_DETAILS[slUser.serviceLine as ServiceLine];
                        const Icon = details.icon;
                        
                        // Role badge colors
                        const defaultBadge = { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
                        const badges: Record<string, { bg: string; text: string; border: string }> = {
                          VIEWER: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
                          USER: defaultBadge,
                          SUPERVISOR: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
                          MANAGER: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
                          PARTNER: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
                          ADMIN: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
                        };
                        const roleBadge = badges[slUser.role] || defaultBadge;
                        
                        return (
                          <div
                            key={slUser.id}
                            className={`flex items-center justify-between p-4 border-2 ${details.borderColorClass} ${details.bgColorClass} rounded-lg`}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <Icon className={`h-6 w-6 ${details.colorClass}`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-gray-900">{details.name}</div>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                                    {slUser.role}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">{details.description}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <select
                                value={slUser.role}
                                onChange={(e) =>
                                  handleUpdateServiceLineRole(
                                    slUser.serviceLine,
                                    e.target.value as ServiceLineRole
                                  )
                                }
                                disabled={slUser.id < 0}
                                className="px-3 py-2 border-2 border-forvis-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ minWidth: '140px' }}
                              >
                                <option value="VIEWER">Viewer</option>
                                <option value="USER">User</option>
                                <option value="SUPERVISOR">Supervisor</option>
                                <option value="MANAGER">Manager</option>
                                <option value="PARTNER">Partner</option>
                                <option value="ADMINISTRATOR">Administrator</option>
                              </select>
                              {/* Only show delete button for real database records (positive IDs) */}
                              {/* Virtual service lines for SYSTEM_ADMIN have negative IDs and cannot be deleted */}
                              {slUser.id > 0 && (
                                <button
                                  onClick={() => handleRemoveServiceLine(
                                    slUser.serviceLine,
                                    slUser.serviceLine
                                  )}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove access"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                              {slUser.id < 0 && (
                                <div className="px-2 py-1 text-xs text-gray-500 italic" title="System-granted access cannot be removed">
                                  Auto-granted
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-forvis-gray-900 mb-4">Task Assignments</h3>
                  <div className="space-y-3">
                    {selectedUser.tasks && selectedUser.tasks.length > 0 ? (
                      selectedUser.tasks.map(taskUser => (
                        <div key={taskUser.id} className="flex items-center justify-between p-4 border border-forvis-gray-200 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-forvis-gray-900">{taskUser.task.name}</div>
                            {taskUser.task.client && (
                              <div className="text-sm text-forvis-gray-600">{taskUser.task.client.clientNameFull || taskUser.task.client.clientCode}</div>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(taskUser.role)}`}>
                            {formatRole(taskUser.role)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-forvis-gray-50 rounded-lg border border-forvis-gray-200">
                        <p className="text-forvis-gray-500">No task assignments</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleRemoveFromAllTasks(selectedUser.id)}
                    className="w-full px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-5 w-5 inline mr-2" />
                    Remove from All Tasks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />

      <AddServiceLineModal
        isOpen={showAddServiceLineModal}
        onClose={() => setShowAddServiceLineModal(false)}
        onSubmit={handleAddServiceLine}
        existingServiceLines={userServiceLines.map(sl => sl.serviceLine)}
      />
    </div>
  );
}
