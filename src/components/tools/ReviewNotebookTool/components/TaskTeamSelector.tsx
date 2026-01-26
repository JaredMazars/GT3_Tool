/**
 * Task Team Selector Component
 * Dropdown selector for team members assigned to a specific task
 * Supports both single and multiple selection
 */

'use client';

import { X } from 'lucide-react';
import { useTaskTeamMembers } from '@/hooks/tasks/useTaskTeamMembers';

interface TaskTeamSelectorProps {
  taskId: number;
  value?: string | string[] | null;
  onChange: ((userId: string, userName: string) => void) | ((userIds: string[]) => void);
  label: string;
  required?: boolean;
  multiple?: boolean;
}

export function TaskTeamSelector({
  taskId,
  value,
  onChange,
  label,
  required = false,
  multiple = false,
}: TaskTeamSelectorProps) {
  const { data: teamMembers = [], isLoading, error } = useTaskTeamMembers({
    taskId,
    enabled: !!taskId,
  });

  // Convert value to array for consistent handling
  const selectedIds = Array.isArray(value) ? value : (value ? [value] : []);

  const handleSingleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    const selectedMember = teamMembers.find((member) => member.userId === selectedUserId);

    if (selectedMember) {
      (onChange as (userId: string, userName: string) => void)(
        selectedMember.userId,
        selectedMember.User.name || selectedMember.User.email
      );
    } else {
      (onChange as (userId: string, userName: string) => void)('', '');
    }
  };

  const handleMultipleToggle = (userId: string) => {
    const newSelection = selectedIds.includes(userId)
      ? selectedIds.filter((id) => id !== userId)
      : [...selectedIds, userId];
    
    (onChange as (userIds: string[]) => void)(newSelection);
  };

  const handleRemove = (userId: string) => {
    const newSelection = selectedIds.filter((id) => id !== userId);
    (onChange as (userIds: string[]) => void)(newSelection);
  };

  if (isLoading) {
    return (
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="animate-pulse">
          <div className="h-10 bg-forvis-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">Failed to load team members</p>
        </div>
      </div>
    );
  }

  if (!multiple) {
    // Single selection mode (original behavior)
    return (
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedIds[0] || ''}
          onChange={handleSingleChange}
          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          required={required}
        >
          <option value="">Select {label.toLowerCase()}...</option>
          {teamMembers.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.User.name || member.User.email}
            </option>
          ))}
        </select>
        {teamMembers.length === 0 && (
          <p className="mt-1 text-xs text-forvis-gray-500">
            No team members assigned to this task
          </p>
        )}
      </div>
    );
  }

  // Multiple selection mode
  return (
    <div>
      <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* Selected badges */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedIds.map((userId) => {
            const member = teamMembers.find((m) => m.userId === userId);
            if (!member) return null;
            
            return (
              <span
                key={userId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-forvis-blue-100 text-forvis-blue-800 rounded-md text-xs font-medium"
              >
                {member.User.name || member.User.email}
                <button
                  type="button"
                  onClick={() => handleRemove(userId)}
                  className="hover:bg-forvis-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Team member list with checkboxes */}
      <div className="border border-forvis-gray-300 rounded-md max-h-60 overflow-y-auto">
        {teamMembers.length === 0 ? (
          <div className="p-3 text-sm text-forvis-gray-500">
            No team members assigned to this task
          </div>
        ) : (
          <div className="divide-y divide-forvis-gray-200">
            {teamMembers.map((member) => {
              const isSelected = selectedIds.includes(member.userId);
              
              return (
                <label
                  key={member.userId}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-forvis-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleMultipleToggle(member.userId)}
                    className="rounded border-forvis-gray-300 text-forvis-blue-600 focus:ring-forvis-blue-500"
                  />
                  <span className="text-sm text-forvis-gray-900">
                    {member.User.name || member.User.email}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-1 text-xs text-forvis-gray-500">
        {selectedIds.length === 0 
          ? 'Select at least one team member'
          : `${selectedIds.length} team member${selectedIds.length !== 1 ? 's' : ''} selected`
        }
      </p>
    </div>
  );
}
