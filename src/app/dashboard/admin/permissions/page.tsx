'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
type ResourceType = 'PAGE' | 'FEATURE';
type UserRole = 'SYSTEM_ADMIN' | 'ADMINISTRATOR' | 'PARTNER' | 'MANAGER' | 'SUPERVISOR' | 'USER' | 'VIEWER';

interface Permission {
  id: number;
  resourceType: ResourceType;
  resourceKey: string;
  displayName: string;
  description: string | null;
  availableActions: PermissionAction[];
}

interface PermissionMatrixEntry {
  permission: Permission;
  rolePermissions: {
    [key in UserRole]?: {
      isActive: boolean;
      allowedActions: PermissionAction[];
    };
  };
}

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'ALL' | 'PAGE' | 'FEATURE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, { role: UserRole; permissionId: number; actions: PermissionAction[] }>
  >(new Map());
  const [expandedPermissions, setExpandedPermissions] = useState<Set<number>>(new Set());

  // Fetch permission matrix
  const { data: matrixData, isLoading } = useQuery({
    queryKey: ['permissions', 'matrix'],
    queryFn: async () => {
      const res = await fetch('/api/permissions/matrix');
      if (!res.ok) throw new Error('Failed to fetch permissions');
      const json = await res.json();
      return json.data as PermissionMatrixEntry[];
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{
      role: UserRole;
      permissionId: number;
      actions: PermissionAction[];
    }>) => {
      const res = await fetch('/api/permissions/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error('Failed to update permissions');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setPendingChanges(new Map());
    },
  });

  const roles: UserRole[] = ['SYSTEM_ADMIN', 'ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER'];

  // Filter and search
  const filteredMatrix = useMemo(() => {
    if (!matrixData) return [];

    return matrixData.filter(entry => {
      // Filter by type
      if (filterType !== 'ALL' && entry.permission.resourceType !== filterType) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          entry.permission.displayName.toLowerCase().includes(search) ||
          entry.permission.resourceKey.toLowerCase().includes(search) ||
          entry.permission.description?.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [matrixData, filterType, searchTerm]);

  // Group by resource type
  const groupedPermissions = useMemo(() => {
    const groups = new Map<ResourceType, PermissionMatrixEntry[]>();
    
    filteredMatrix.forEach(entry => {
      const existing = groups.get(entry.permission.resourceType) || [];
      existing.push(entry);
      groups.set(entry.permission.resourceType, existing);
    });

    return groups;
  }, [filteredMatrix]);

  const handleActionToggle = (
    permissionId: number,
    role: UserRole,
    action: PermissionAction,
    currentActions: PermissionAction[]
  ) => {
    const key = `${role}-${permissionId}`;
    let newActions: PermissionAction[];

    if (currentActions.includes(action)) {
      newActions = currentActions.filter(a => a !== action);
    } else {
      newActions = [...currentActions, action];
    }

    setPendingChanges(prev => {
      const updated = new Map(prev);
      updated.set(key, { role, permissionId, actions: newActions });
      return updated;
    });
  };

  const getCurrentActions = (permissionId: number, role: UserRole, defaultActions: PermissionAction[]): PermissionAction[] => {
    const key = `${role}-${permissionId}`;
    const pending = pendingChanges.get(key);
    return pending ? pending.actions : defaultActions;
  };

  const handleSave = () => {
    const updates = Array.from(pendingChanges.values());
    bulkUpdateMutation.mutate(updates);
  };

  const handleReset = () => {
    setPendingChanges(new Map());
  };

  const togglePermissionExpanded = (permissionId: number) => {
    setExpandedPermissions(prev => {
      const updated = new Set(prev);
      if (updated.has(permissionId)) {
        updated.delete(permissionId);
      } else {
        updated.add(permissionId);
      }
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-forvis-gray-700 font-medium">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div 
          className="rounded-lg p-6 shadow-corporate-lg mb-6"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Permission Matrix
          </h1>
          <p className="text-sm text-white opacity-90">
            Manage role-based permissions across the application
          </p>
        </div>

        {/* Filter and Search */}
        <div className="bg-white rounded-lg shadow-corporate border-2 p-4 mb-6" style={{ borderColor: '#2E5AAC' }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                Search Permissions
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, key, or description..."
                className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 placeholder:text-forvis-gray-400 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors"
              >
                <option value="ALL">All Types</option>
                <option value="PAGE">Pages Only</option>
                <option value="FEATURE">Features Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {pendingChanges.size > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium text-yellow-800">
                  {pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={bulkUpdateMutation.isPending}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-forvis-blue-500 hover:bg-forvis-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors shadow-corporate disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permission Matrix */}
        <div className="space-y-6">
          {Array.from(groupedPermissions.entries()).map(([resourceType, entries]) => (
            <div key={resourceType} className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden" style={{ borderColor: '#2E5AAC' }}>
              <div 
                className="px-4 py-3"
                style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
              >
                <h2 className="text-lg font-bold text-white">
                  {resourceType === 'PAGE' ? 'Page Permissions' : 'Feature Permissions'}
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-forvis-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-forvis-gray-900 uppercase tracking-wider border-r border-forvis-gray-200">
                        Permission
                      </th>
                      {roles.map(role => (
                        <th key={role} className="px-3 py-3 text-center text-xs font-bold text-forvis-gray-900 uppercase tracking-wider border-r border-forvis-gray-200">
                          {role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-forvis-gray-200">
                    {entries.map((entry) => {
                      const isExpanded = expandedPermissions.has(entry.permission.id);
                      
                      return (
                        <tr key={entry.permission.id} className="hover:bg-forvis-gray-50 transition-colors">
                          <td className="px-4 py-3 border-r border-forvis-gray-200">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => togglePermissionExpanded(entry.permission.id)}
                                className="mt-1 text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
                              >
                                <svg 
                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-forvis-gray-900">
                                  {entry.permission.displayName}
                                </p>
                                <p className="text-xs text-forvis-gray-600 font-mono">
                                  {entry.permission.resourceKey}
                                </p>
                                {isExpanded && entry.permission.description && (
                                  <p className="text-xs text-forvis-gray-600 mt-1">
                                    {entry.permission.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          {roles.map(role => {
                            const rolePermission = entry.rolePermissions[role];
                            const currentActions = getCurrentActions(
                              entry.permission.id,
                              role,
                              rolePermission?.allowedActions || []
                            );
                            
                            return (
                              <td key={role} className="px-3 py-2 text-center border-r border-forvis-gray-200">
                                <div className="flex flex-wrap justify-center gap-1">
                                  {entry.permission.availableActions.map(action => {
                                    const isEnabled = currentActions.includes(action);
                                    const actionLabel = action.charAt(0);
                                    
                                    return (
                                      <button
                                        key={action}
                                        onClick={() =>
                                          handleActionToggle(
                                            entry.permission.id,
                                            role,
                                            action,
                                            currentActions
                                          )
                                        }
                                        title={`${action} - ${isEnabled ? 'Enabled' : 'Disabled'}`}
                                        className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                                          isEnabled
                                            ? 'bg-forvis-blue-500 text-white shadow-sm'
                                            : 'bg-forvis-gray-200 text-forvis-gray-500 hover:bg-forvis-gray-300'
                                        }`}
                                      >
                                        {actionLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-6 rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: '#1C3667' }}>Permission Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-forvis-gray-700">
            <div><span className="font-bold">C</span> - Create</div>
            <div><span className="font-bold">R</span> - Read</div>
            <div><span className="font-bold">U</span> - Update</div>
            <div><span className="font-bold">D</span> - Delete</div>
          </div>
          <p className="text-xs text-forvis-gray-600 mt-3">
            <span className="font-bold">Note:</span> SYSTEM_ADMIN role has full access to all permissions and bypasses these checks.
          </p>
        </div>
      </div>
    </div>
  );
}

