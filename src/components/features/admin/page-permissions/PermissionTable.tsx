/**
 * Permission Table Component
 * Displays page permissions in a sortable table
 */

'use client';

import { useState } from 'react';
import { AccessLevelBadge } from './AccessLevelBadge';
import { SourceBadge } from './SourceBadge';
import { Button } from '@/components/ui';
import { Pencil, Trash2 } from 'lucide-react';
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

interface PermissionTableProps {
  permissions: Permission[];
  onEdit: (pathname: string) => void;
  onDelete: (pathname: string) => void;
}

const roles = [
  'SYSTEM_ADMIN',
  'ADMINISTRATOR',
  'PARTNER',
  'MANAGER',
  'SUPERVISOR',
  'USER',
  'VIEWER',
];

const roleLabels: Record<string, string> = {
  SYSTEM_ADMIN: 'Sys Admin',
  ADMINISTRATOR: 'Admin',
  PARTNER: 'Partner',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  USER: 'User',
  VIEWER: 'Viewer',
};

export function PermissionTable({ permissions, onEdit, onDelete }: PermissionTableProps) {
  const [sortBy, setSortBy] = useState<'pathname' | 'category'>('pathname');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedPermissions = [...permissions].sort((a, b) => {
    let aVal: string;
    let bVal: string;

    if (sortBy === 'pathname') {
      aVal = a.pathname;
      bVal = b.pathname;
    } else {
      aVal = a.category || '';
      bVal = b.category || '';
    }

    const comparison = aVal.localeCompare(bVal);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: 'pathname' | 'category') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const hasDbOverride = (perm: Permission) => {
    return Object.values(perm.permissions).some((p) => p.source === 'DB');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('pathname')}
            >
              <div className="flex items-center gap-2">
                Pathname
                {sortBy === 'pathname' && (
                  <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('category')}
            >
              <div className="flex items-center gap-2">
                Category
                {sortBy === 'category' && (
                  <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </th>
            {roles.map((role) => (
              <th
                key={role}
                scope="col"
                className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {roleLabels[role]}
              </th>
            ))}
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Source
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedPermissions.map((perm) => (
            <tr key={perm.pathname} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-mono text-gray-900">
                {perm.pathname}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                {perm.category || 'general'}
              </td>
              {roles.map((role) => {
                const rolePerm = perm.permissions[role];
                return (
                  <td key={role} className="px-2 py-3 text-center">
                    {rolePerm && (
                      <AccessLevelBadge level={rolePerm.accessLevel} compact />
                    )}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-center">
                {(() => {
                  // Get primary source (DB if any, otherwise first source)
                  const sources = Object.values(perm.permissions).map((p) => p.source);
                  const primarySource = sources.includes('DB')
                    ? 'DB'
                    : sources.includes('CODE')
                    ? 'CODE'
                    : 'AUTO';
                  return <SourceBadge source={primarySource} />;
                })()}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(perm.pathname)}
                    className="p-1"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {hasDbOverride(perm) && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(perm.pathname)}
                      className="p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {sortedPermissions.length === 0 && (
            <tr>
              <td
                colSpan={roles.length + 4}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                No page permissions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}






















