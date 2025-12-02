'use client';

import { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  TrashIcon,
  PencilIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { ServiceLine, ServiceLineRole } from '@/types';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { 
  useGrantServiceLineAccess,
  useUpdateServiceLineRole,
  useRevokeServiceLineAccess,
} from '@/hooks/service-lines/useServiceLines';

interface ServiceLineUser {
  id: number;
  userId: string;
  serviceLine: string;
  role: string;
  User: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ServiceLineData {
  serviceLine: string;
  users: ServiceLineUser[];
}

export default function ServiceLineAdminPage() {
  const [serviceLineData, setServiceLineData] = useState<ServiceLineData[]>([]);
  const [selectedServiceLine, setSelectedServiceLine] = useState<ServiceLine>(ServiceLine.TAX);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ServiceLineUser | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  
  // React Query mutations
  const grantAccessMutation = useGrantServiceLineAccess();
  const updateRoleMutation = useUpdateServiceLineRole();
  const revokeAccessMutation = useRevokeServiceLineAccess();
  
  useEffect(() => {
    fetchServiceLineData();
    fetchAllUsers();
  }, []);

  const fetchServiceLineData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/service-line-access');
      if (!response.ok) throw new Error('Failed to fetch service line data');
      const result = await response.json();
      setServiceLineData(result.success ? result.data : []);
    } catch (error) {
      console.error('Failed to fetch service line data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) return;
      const result = await response.json();
      setAllUsers(result.success ? result.data : []);
    } catch (error) {
      console.error('Failed to fetch all users:', error);
    }
  };

  const currentUsers = serviceLineData.find(
    (sl) => sl.serviceLine === selectedServiceLine
  )?.users || [];

  const filteredUsers = currentUsers.filter(
    (u) =>
      u.User.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.User.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGrantAccess = async (userId: string, role: ServiceLineRole) => {
    try {
      await grantAccessMutation.mutateAsync({
        userId,
        serviceLine: selectedServiceLine,
        role,
      });
      // The mutation already invalidates queries, but we'll fetch again to be sure
      await fetchServiceLineData();
      setShowGrantModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to grant access');
    }
  };

  const handleUpdateRole = async (serviceLineUserId: number, newRole: ServiceLineRole) => {
    try {
      await updateRoleMutation.mutateAsync({
        id: serviceLineUserId,
        role: newRole,
      });
      await fetchServiceLineData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleRevokeAccess = async (serviceLineUserId: number) => {
    if (!confirm('Are you sure you want to revoke access?')) return;

    try {
      await revokeAccessMutation.mutateAsync(serviceLineUserId);
      await fetchServiceLineData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to revoke access');
    }
  };

  const availableUsers = allUsers.filter(
    (user) => !currentUsers.some((cu) => cu.userId === user.id)
  );

  return (
    <div className="min-h-screen bg-forvis-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <ShieldCheckIcon className="h-8 w-8 text-forvis-blue-600" />
            <h1 className="text-3xl font-bold text-forvis-gray-900">
              Service Line Access Management
            </h1>
          </div>
          <p className="text-forvis-gray-700">
            Manage user access and permissions across all service lines
          </p>
        </div>

        {/* Service Line Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 mb-6">
          <div className="p-4">
            {/* Main Service Lines */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-forvis-gray-500 uppercase tracking-wider mb-2">
                Main Service Lines
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.values(ServiceLine)
                  .filter((sl) => !isSharedService(sl))
                  .map((sl) => (
                    <button
                      key={sl}
                      onClick={() => setSelectedServiceLine(sl)}
                      className={`px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                        selectedServiceLine === sl
                          ? 'bg-forvis-blue-600 text-white'
                          : 'text-forvis-gray-700 hover:bg-forvis-gray-100 border border-forvis-gray-200'
                      }`}
                    >
                      {formatServiceLineName(sl)}
                      <span className="ml-2 text-xs">
                        ({serviceLineData.find((data) => data.serviceLine === sl)?.users.length || 0})
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Shared Services */}
            <div>
              <h3 className="text-xs font-semibold text-forvis-gray-500 uppercase tracking-wider mb-2">
                Shared Services
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.values(ServiceLine)
                  .filter((sl) => isSharedService(sl))
                  .map((sl) => (
                    <button
                      key={sl}
                      onClick={() => setSelectedServiceLine(sl)}
                      className={`px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                        selectedServiceLine === sl
                          ? 'bg-forvis-blue-600 text-white'
                          : 'text-forvis-gray-700 hover:bg-forvis-gray-100 border border-forvis-gray-200'
                      }`}
                    >
                      {formatServiceLineName(sl)}
                      <span className="ml-2 text-xs">
                        ({serviceLineData.find((data) => data.serviceLine === sl)?.users.length || 0})
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={() => setShowGrantModal(true)}
              className="ml-4 inline-flex items-center px-4 py-2 bg-forvis-blue-600 text-white font-semibold rounded-lg hover:bg-forvis-blue-700 transition-colors"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Grant Access
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600 mx-auto"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-forvis-gray-600">
              {searchTerm ? 'No users match your search.' : 'No users have access to this service line yet.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-forvis-gray-200">
              <thead className="bg-forvis-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-forvis-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-forvis-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-forvis-gray-900">
                        {user.User.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-forvis-gray-600">{user.User.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleUpdateRole(user.id, e.target.value as ServiceLineRole)
                        }
                        className="text-sm border border-forvis-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="USER">User</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleRevokeAccess(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Grant Access Modal */}
        {showGrantModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-forvis-gray-900 mb-4">
                Grant Access to {formatServiceLineName(selectedServiceLine)}
              </h2>

              {availableUsers.length === 0 ? (
                <p className="text-forvis-gray-600 mb-4">
                  All users already have access to this service line.
                </p>
              ) : (
                <div className="space-y-4">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border border-forvis-gray-200 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-forvis-gray-900">{user.name}</div>
                        <div className="text-sm text-forvis-gray-600">{user.email}</div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleGrantAccess(user.id, ServiceLineRole.USER)}
                          className="px-3 py-1 text-sm bg-forvis-blue-600 text-white rounded hover:bg-forvis-blue-700"
                        >
                          Grant User
                        </button>
                        <button
                          onClick={() => handleGrantAccess(user.id, ServiceLineRole.ADMINISTRATOR)}
                          className="px-3 py-1 text-sm bg-forvis-gray-600 text-white rounded hover:bg-forvis-gray-700"
                        >
                          Grant Admin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-forvis-gray-100 rounded-lg hover:bg-forvis-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
