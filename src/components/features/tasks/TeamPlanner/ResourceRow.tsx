'use client';

import { useState } from 'react';
import { ResourceData, TimelineColumn, TimeScale, DateRange, DateSelection, RowMetadata } from './types';
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
  onUpdateDates?: (allocationId: number, startDate: Date, endDate: Date, isNonClientEvent: boolean) => void;
  onRemoveMember?: (userId: string) => void;
  canEdit: boolean;
  onSelectionStart: (userId: string, columnIndex: number) => void;
  onSelectionMove: (columnIndex: number) => void;
  dateSelection: DateSelection | null;
  isSelecting: boolean;
  rowMetadata: RowMetadata;
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
  isSelecting,
  rowMetadata
}: ResourceRowProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const columnWidth = getColumnWidth(scale);
  const totalWidth = columns.length * columnWidth;
  
  // Calculate dynamic row height based on max lanes (36px per lane to match user info)
  const LANE_HEIGHT = 36;
  const rowHeight = resource.maxLanes * LANE_HEIGHT;
  
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
      case 'ADMINISTRATOR':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'PARTNER':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'SUPERVISOR':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'USER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div 
      className="flex border-b transition-colors group border-forvis-gray-200 hover:bg-forvis-blue-50"
      style={{ height: `${rowHeight}px`, minWidth: `${totalWidth + 256}px` }}
    >
      {/* Spacer for fixed column */}
      <div className="w-64 flex-shrink-0"></div>

      {/* Timeline Grid */}
      <div className="relative" style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}>
        {/* Grid background */}
        <div className="absolute inset-0 flex z-0" style={{ width: `${totalWidth}px` }}>
          {columns.map((column, index) => {
            // Determine if this cell is in the selection range
            const isInSelection = dateSelection && 
              dateSelection.userId === resource.userId &&
              dateSelection.endColumnIndex !== null &&
              index >= Math.min(dateSelection.startColumnIndex, dateSelection.endColumnIndex) &&
              index <= Math.max(dateSelection.startColumnIndex, dateSelection.endColumnIndex);

            return (
              <div
                key={`${resource.userId}-col-${index}`}
                className={`relative flex-shrink-0 border-r border-forvis-gray-200 select-none ${
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
                  if (canEdit) {
                    e.preventDefault();
                    onSelectionStart(resource.userId, index);
                  }
                }}
                onMouseEnter={() => {
                  if (isSelecting && dateSelection?.userId === resource.userId) {
                    onSelectionMove(index);
                  }
                }}
              />
            );
          })}
        </div>

        {/* Allocation tiles */}
        <div className="relative h-full z-1" style={{ pointerEvents: 'none' }}>
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
                currentUserId={resource.userId}
                lane={allocation.lane ?? 0}
                rowMetadata={rowMetadata}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}


