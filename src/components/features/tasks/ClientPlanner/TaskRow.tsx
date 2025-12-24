'use client';

import { useMemo, useCallback } from 'react';
import { TimelineColumn, TimeScale, DateRange, DateSelection, RowMetadata, AllocationData, TaskPlannerRow } from './types';
import { AllocationTile } from './AllocationTile';
import { calculateTilePosition, getColumnWidth } from './utils';

// Constants
const LANE_HEIGHT = 36;

interface TaskRowProps {
  row: TaskPlannerRow;
  columns: TimelineColumn[];
  scale: TimeScale;
  dateRange: DateRange;
  onEditAllocation: (allocation: AllocationData) => void;
  onUpdateDates?: (allocationId: number, startDate: Date, endDate: Date) => void;
  canEdit: boolean;
  onSelectionStart?: (taskId: number, columnIndex: number) => void;
  onSelectionMove?: (columnIndex: number) => void;
  dateSelection: DateSelection | null;
  isSelecting: boolean;
  rowMetadata: RowMetadata;
}

export function TaskRow({
  row,
  columns,
  scale,
  dateRange,
  onEditAllocation,
  onUpdateDates,
  canEdit,
  onSelectionStart,
  onSelectionMove,
  dateSelection,
  isSelecting,
  rowMetadata
}: TaskRowProps) {
  const columnWidth = useMemo(() => getColumnWidth(scale), [scale]);
  const totalWidth = columns.length * columnWidth;

  // Calculate row height based on max lanes
  const rowHeight = row.maxLanes * LANE_HEIGHT;

  // Handle column click to start date selection
  const handleColumnMouseDown = useCallback((columnIndex: number) => {
    if (canEdit && onSelectionStart) {
      onSelectionStart(row.taskId, columnIndex);
    }
  }, [canEdit, onSelectionStart, row.taskId]);

  const handleColumnMouseEnter = useCallback((columnIndex: number) => {
    if (isSelecting && onSelectionMove) {
      onSelectionMove(columnIndex);
    }
  }, [isSelecting, onSelectionMove]);

  // Check if this row has active date selection
  const hasSelection = dateSelection && dateSelection.taskId === row.taskId;
  const selectionStart = hasSelection ? Math.min(dateSelection.startColumnIndex, dateSelection.endColumnIndex || dateSelection.startColumnIndex) : -1;
  const selectionEnd = hasSelection ? Math.max(dateSelection.startColumnIndex, dateSelection.endColumnIndex || dateSelection.startColumnIndex) : -1;

  return (
    <div 
      className="flex border-b border-forvis-gray-200 hover:bg-forvis-blue-50 transition-colors"
      style={{ height: `${rowHeight}px`, minWidth: `${totalWidth + 320}px` }}
    >
      {/* Spacer for fixed column */}
      <div className="w-80 flex-shrink-0"></div>

      {/* Scrollable timeline area with employee tiles */}
      <div 
        className="relative"
        style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
      >
        {/* Timeline grid - clickable columns for date selection */}
        <div className="absolute inset-0 flex z-0" style={{ width: `${totalWidth}px` }}>
          {columns.map((col, index) => {
            const isInSelection = hasSelection && index >= selectionStart && index <= selectionEnd;
            const isWeekend = col.isWeekend;
            const isToday = col.isToday;
            
            return (
              <div
                key={`${row.taskId}-col-${index}`}
                className={`relative flex-shrink-0 border-r border-forvis-gray-200 select-none ${
                  canEdit ? 'cursor-crosshair' : ''
                } ${
                  isInSelection ? 'bg-forvis-blue-200 border-forvis-blue-400' : 
                  isToday ? 'bg-forvis-blue-50 border-forvis-blue-300' :
                  isWeekend ? 'bg-forvis-gray-50' : 
                  'bg-white'
                } ${canEdit ? 'hover:bg-forvis-blue-100 transition-colors' : ''}`}
                style={{ 
                  width: `${columnWidth}px`,
                  minWidth: `${columnWidth}px`,
                  userSelect: 'none'
                }}
                onMouseDown={() => handleColumnMouseDown(index)}
                onMouseEnter={() => handleColumnMouseEnter(index)}
              />
            );
          })}
        </div>

        {/* Employee allocation tiles */}
        <div className="relative h-full z-1" style={{ pointerEvents: 'none' }}>
          {row.allocations.map((allocation) => {
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











