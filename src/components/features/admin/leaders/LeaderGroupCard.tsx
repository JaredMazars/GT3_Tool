'use client';

import { useState } from 'react';
import { Users, MoreVertical, Pencil, UserPlus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui';

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

interface LeaderGroupCardProps {
  group: LeaderGroup;
  onEdit: (group: LeaderGroup) => void;
  onAddMembers: (group: LeaderGroup) => void;
  onDelete: (group: LeaderGroup) => void;
  onRemoveMember: (groupId: number, employeeId: number) => void;
}

export function LeaderGroupCard({
  group,
  onEdit,
  onAddMembers,
  onDelete,
  onRemoveMember,
}: LeaderGroupCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);

  const displayMembers = showAllMembers ? group.members : group.members.slice(0, 5);
  const remainingCount = group.members.length - 5;

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      const first = parts[0]?.[0] || '';
      const last = parts[parts.length - 1]?.[0] || '';
      return `${first}${last}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate border border-forvis-gray-200 hover:shadow-corporate-md transition-all duration-200 overflow-hidden">
      {/* Header with gradient */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{group.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {group.type === 'INDIVIDUAL' ? (
                <Badge
                  variant="yellow"
                  size="sm"
                  className="bg-yellow-100 text-yellow-800 border-yellow-300"
                >
                  Individual Role
                </Badge>
              ) : (
                <Badge
                  variant="blue"
                  size="sm"
                  className="bg-white/20 text-white border-white/30"
                >
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <MoreVertical className="h-5 w-5 text-white" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 py-1 z-20">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(group);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-forvis-gray-700 hover:bg-forvis-gray-50 flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Group
                </button>
                {(group.type === 'GROUP' || group.members.length === 0) && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAddMembers(group);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-forvis-gray-700 hover:bg-forvis-gray-50 flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {group.type === 'INDIVIDUAL' ? 'Assign Person' : 'Add Members'}
                  </button>
                )}
                <div className="border-t border-forvis-gray-200 my-1" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(group);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Group
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Description */}
        {group.description && (
          <p className="text-sm text-forvis-gray-600 mb-4 line-clamp-2">
            {group.description}
          </p>
        )}

        {/* Warning for individual roles */}
        {group.type === 'INDIVIDUAL' && group.members.length > 0 && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            This is an individual role. Only one person can be assigned at a time.
          </div>
        )}

        {/* Members list */}
        {group.members.length === 0 ? (
          <div className="text-center py-8 text-forvis-gray-500 text-sm">
            No members yet
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displayMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border border-forvis-gray-200 rounded-lg hover:bg-forvis-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
                      }}
                    >
                      {getInitials(member.employee.EmpName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-forvis-gray-900 truncate">
                          {member.employee.EmpName}
                        </span>
                        <Badge variant="default" size="sm">
                          {member.employee.EmpCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-forvis-gray-600 mt-0.5">
                        <span>{member.employee.EmpCatDesc}</span>
                        <span>•</span>
                        <span>{member.employee.OfficeCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => onRemoveMember(group.id, member.employee.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-600 hover:bg-red-50 rounded transition-all"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Show more/less button */}
            {group.members.length > 5 && (
              <button
                onClick={() => setShowAllMembers(!showAllMembers)}
                className="w-full mt-3 py-2 text-sm font-medium text-forvis-blue-600 hover:text-forvis-blue-700 hover:bg-forvis-blue-50 rounded-lg transition-colors"
              >
                {showAllMembers
                  ? 'Show Less'
                  : `Show ${remainingCount} More Member${remainingCount !== 1 ? 's' : ''}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
