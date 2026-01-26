/**
 * Page Permissions Admin Page
 * Manage page-level access control with role-based permissions
 */

'use client';

import { useState, useEffect } from 'react';
import { Button, Banner } from '@/components/ui';
import { RefreshCw, Plus, Search } from 'lucide-react';
import { PermissionTable } from '@/components/features/admin/page-permissions/PermissionTable';
import { PermissionEditModal } from '@/components/features/admin/page-permissions/PermissionEditModal';
import { PageAccessLevel } from '@/types/pagePermissions';

interface Permission {
  pathname: string;
  permissions: Record<
    string,
    {
      accessLevel: PageAccessLevel;
      source: 'DB' | 'CODE' | 'AUTO';
      id?: number;
      description?: string;
    }
  >;
  category?: string;
}

export default function PagePermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'ALL' | 'DB' | 'CODE' | 'AUTO'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPathname, setEditingPathname] = useState<string | undefined>();
  const [discovering, setDiscovering] = useState(false);

  // Load permissions
  const loadPermissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/page-permissions?merged=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();
      setPermissions(data.data);
      setFilteredPermissions(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  // Filter permissions
  useEffect(() => {
    let filtered = permissions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.pathname.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Source filter
    if (filterSource !== 'ALL') {
      filtered = filtered.filter((p) =>
        Object.values(p.permissions).some((perm) => perm.source === filterSource)
      );
    }

    setFilteredPermissions(filtered);
  }, [permissions, searchTerm, filterSource]);

  // Trigger page discovery
  const handleDiscover = async () => {
    setDiscovering(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/page-permissions/discover', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to run discovery');
      }

      const data = await response.json();
      setSuccess(
        `Discovery complete: ${data.data.discovered} new pages, ${data.data.updated} updated, ${data.data.deactivated} deactivated`
      );
      
      // Reload permissions
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run discovery');
    } finally {
      setDiscovering(false);
    }
  };

  // Handle edit
  const handleEdit = (pathname: string) => {
    const perm = permissions.find((p) => p.pathname === pathname);
    setEditingPathname(pathname);
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = async (pathname: string) => {
    if (!confirm(`Delete all database overrides for ${pathname}? This will revert to default permissions.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/page-permissions/${pathname}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete permissions');
      }

      setSuccess('Permissions deleted successfully');
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete permissions');
    }
  };

  // Handle save from modal
  const handleSave = async (data: {
    pathname: string;
    permissions: Record<string, PageAccessLevel>;
    description?: string;
  }) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/page-permissions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save permissions');
      }

      setSuccess('Permissions saved successfully');
      await loadPermissions();
    } catch (err) {
      throw err; // Re-throw to let modal handle it
    }
  };

  const editingPermission = editingPathname
    ? permissions.find((p) => p.pathname === editingPathname)
    : undefined;

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-forvis-gray-900">
          Page Permission Management
        </h1>
        <p className="mt-2 text-sm text-forvis-gray-600">
          Configure access levels for pages by role. Database overrides take precedence over code-based and automatic defaults.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <Banner variant="error" message={error} className="mb-4" />
      )}
      {success && (
        <Banner variant="success" message={success} className="mb-4" />
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by pathname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 sm:text-sm"
            />
          </div>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
            className="block px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 sm:text-sm"
          >
            <option value="ALL">All Sources</option>
            <option value="DB">Database Only</option>
            <option value="CODE">Code Only</option>
            <option value="AUTO">Auto Only</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleDiscover}
            disabled={discovering}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />
            {discovering ? 'Discovering...' : 'Discover Pages'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingPathname(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Override
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredPermissions.length} of {permissions.length} pages
      </div>

      {/* Table */}
      <div className="bg-white shadow-corporate rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading permissions...</div>
        ) : (
          <PermissionTable
            permissions={filteredPermissions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Edit Modal */}
      <PermissionEditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPathname(undefined);
        }}
        onSave={handleSave}
        pathname={editingPathname}
        initialPermissions={
          editingPermission
            ? Object.fromEntries(
                Object.entries(editingPermission.permissions).map(([role, perm]) => [
                  role,
                  perm.accessLevel,
                ])
              )
            : undefined
        }
        initialDescription={
          editingPermission
            ? Object.values(editingPermission.permissions).find((p) => p.description)
                ?.description
            : undefined
        }
      />
    </div>
  );
}

