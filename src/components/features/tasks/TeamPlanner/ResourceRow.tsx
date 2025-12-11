'use client';

import { useState } from 'react';
import { ResourceData, TimelineColumn, TimeScale, DateRange, DateSelection } from './types';
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
  canEdit: boolean;
  onSelectionStart: (userId: string, columnIndex: number) => void;
  onSelectionMove: (columnIndex: number) => void;
  dateSelection: DateSelection | null;
  isSelecting: boolean;
}

export function ResourceRow({ 
  resource, 
  columns, 
  scale, 
  dateRange,
  onEditAllocation,
  onUpdateDates,
  onRemoveMember,
  canEdit,
  onSelectionStart,
  onSelectionMove,
  dateSelection,
  isSelecting
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
          {columns.map((column, index) => {
            // Determine if this cell is in the selection range
            const isInSelection = dateSelection && 
              dateSelection.userId === resource.userId &&
              dateSelection.endColumnIndex !== null &&
              index >= Math.min(dateSelection.startColumnIndex, dateSelection.endColumnIndex) &&
              index <= Math.max(dateSelection.startColumnIndex, dateSelection.endColumnIndex);

            return (
              <div
                key={index}
                className={`flex-shrink-0 border-r border-forvis-gray-200 select-none ${
                  isInSelection
                    ? 'bg-forvis-blue-200 border-forvis-blue-400'
                    : column.isToday
                    ? 'bg-forvis-blue-50 border-forvis-blue-300'
                    : column.isWeekend
                    ? 'bg-forvis-gray-50'
                    : 'bg-white'
                } ${canEdit ? 'cursor-pointer hover:bg-forvis-blue-100 transition-colors' : ''}`}
                style={{ 
                  width: `${columnWidth}px`,
                  minWidth: `${columnWidth}px`,
                  userSelect: 'none'
                }}
                onMouseDown={(e) => {
                  // #region agent log
                  console.log('[DEBUG:H3] Cell onMouseDown fired:', {index, userId: resource.userId, canEdit, timestamp: Date.now()});
                  // #endregion
                  if (canEdit) {
                    e.preventDefault();
                    console.log('Mouse down on cell:', index, 'for user:', resource.userId);
                    onSelectionStart(resource.userId, index);
                  }
                }}
                onMouseEnter={() => {
                  // #region agent log
                  console.log('[DEBUG:H3] Cell onMouseEnter fired:', {index, userId: resource.userId, isSelecting, selectionUserId: dateSelection?.userId, timestamp: Date.now()});
                  // #endregion
                  if (isSelecting && dateSelection?.userId === resource.userId) {
                    onSelectionMove(index);
                  }
                }}
              />
            );
          })}
        </div>

        {/* Allocation tiles */}
        <div className="relative h-full" style={{ pointerEvents: 'none', zIndex: 1 }}>
          {/* Allocation tiles with higher z-index */}
          {resource.allocations.map((allocation) => {
            const position = calculateTilePosition(allocation, dateRange, scale, columnWidth);
            if (!position) return null;

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResourceRow.tsx:197',message:'Rendering AllocationTile',data:{allocId:allocation.id,allocStartDate:allocation.startDate?.toISOString(),allocEndDate:allocation.endDate?.toISOString(),positionLeft:position.left,positionWidth:position.width},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
            // #endregion

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


