'use client';

import { useState } from 'react';
import { ResourceData, TimelineColumn, TimeScale, DateRange } from './types';
import { AllocationTile } from './AllocationTile';
import { getColumnWidth, calculateTilePosition, formatHours, formatPercentage, getRoleGradient } from './utils';
import { AllocationData } from './types';
import { X, Plus } from 'lucide-react';

interface ResourceRowProps {
  resource: ResourceData;
  columns: TimelineColumn[];
  scale: TimeScale;
  dateRange: DateRange;
  onEditAllocation: (allocation: AllocationData) => void;
  onUpdateDates?: (allocationId: number, startDate: Date, endDate: Date) => void;
  onRemoveMember?: (userId: string) => void;
  onCreateAllocation?: (userId: string) => void;
  canEdit: boolean;
}

export function ResourceRow({ 
  resource, 
  columns, 
  scale, 
  dateRange,
  onEditAllocation,
  onUpdateDates,
  onRemoveMember,
  onCreateAllocation,
  canEdit
}: ResourceRowProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const columnWidth = getColumnWidth(scale);
  const totalWidth = columns.length * columnWidth;
  
  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email ? email.slice(0, 2).toUpperCase() : '??';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'REVIEWER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'EDITOR':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="flex border-b border-forvis-gray-200 hover:bg-forvis-blue-50 transition-colors group h-14">
      {/* User Info Sidebar */}
      <div className="w-64 flex-shrink-0 px-3 py-2 bg-white border-r-2 border-forvis-gray-300 sticky left-0 z-10 group-hover:bg-forvis-blue-50 flex items-center">
        <div className="flex items-center w-full gap-2">
          <div 
            className="rounded-full flex items-center justify-center text-white font-bold shadow-corporate flex-shrink-0 w-8 h-8 text-xs"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            {getInitials(resource.userName, resource.userEmail)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-forvis-gray-900 truncate text-xs">
              {resource.userName || resource.userEmail}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded border font-medium ${getRoleBadgeColor(resource.role)} text-[10px]`}>
                {resource.role}
              </span>
            </div>
          </div>
          {canEdit && onRemoveMember && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Remove button clicked for user:', resource.userId);
                setShowRemoveConfirm(true);
              }}
              className="flex-shrink-0 p-1.5 text-forvis-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              title="Remove from team"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Remove confirmation */}
        {showRemoveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-corporate-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">Remove Team Member</h3>
              <p className="text-sm text-forvis-gray-600 mb-4">
                Remove {resource.userName} from this task? They will lose access to all task data.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onRemoveMember?.(resource.userId);
                    setShowRemoveConfirm(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-corporate"
                  style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 relative" style={{ minWidth: `${totalWidth}px` }}>
        {/* Grid background */}
        <div className="absolute inset-0 flex z-0">
          {columns.map((column, index) => (
            <div
              key={index}
              className={`flex-shrink-0 border-r border-forvis-gray-200 ${
                column.isToday
                  ? 'bg-forvis-blue-50 border-forvis-blue-300'
                  : column.isWeekend
                  ? 'bg-forvis-gray-50'
                  : 'bg-white'
              } ${canEdit && onCreateAllocation ? 'cursor-pointer hover:bg-forvis-blue-100 transition-colors' : ''}`}
              style={{ 
                width: `${columnWidth}px`,
                minWidth: `${columnWidth}px`
              }}
              onClick={() => {
                if (canEdit && onCreateAllocation) {
                  console.log('Timeline cell clicked for user:', resource.userId);
                  onCreateAllocation(resource.userId);
                }
              }}
            />
          ))}
        </div>

        {/* Allocation tiles */}
        <div className="relative z-10 h-full">
          {/* Show add button when no allocations */}
          {resource.allocations.length === 0 && canEdit && onCreateAllocation && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Add Planning button clicked for user:', resource.userId);
                    onCreateAllocation(resource.userId);
                  }}
                  className="flex items-center gap-2 text-xs text-white font-medium px-4 py-2 rounded-lg shadow-corporate-md transition-all hover:scale-105 pointer-events-auto"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  title="Add planning for this team member"
                >
                  <Plus className="w-4 h-4" />
                  Add Planning
                </button>
              </div>
            </div>
          )}
          {/* Allocation tiles with higher z-index */}
          {resource.allocations.map((allocation) => {
            const position = calculateTilePosition(allocation, dateRange, scale, columnWidth);
            if (!position) return null;

            return (
              <AllocationTile
                key={allocation.id}
                allocation={allocation}
                position={position}
                scale={scale}
                columnWidth={columnWidth}
                onEdit={onEditAllocation}
                onUpdateDates={onUpdateDates}
                isDraggable={canEdit}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}


