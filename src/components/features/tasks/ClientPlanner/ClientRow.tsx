'use client';

import { useMemo, useCallback } from 'react';
import { ClientTaskRow, TimelineColumn, TimeScale, DateRange, DateSelection, RowMetadata } from './types';
import { EmployeeTile } from './EmployeeTile';
import { calculateTilePosition, getColumnWidth } from './utils';
import { Building2 } from 'lucide-react';

// Constants
const LANE_HEIGHT = 36;

interface ClientRowProps {
  row: ClientTaskRow;
  columns: TimelineColumn[];
  scale: TimeScale;
  dateRange: DateRange;
  onEditAllocation: (allocation: any) => void;
  onUpdateDates?: (allocationId: number, startDate: Date, endDate: Date) => void;
  canEdit: boolean;
  onSelectionStart?: (clientId: number, taskId: number, columnIndex: number) => void;
  onSelectionMove?: (columnIndex: number) => void;
  dateSelection: DateSelection | null;
  isSelecting: boolean;
  rowMetadata: RowMetadata;
}

export function ClientRow({
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
}: ClientRowProps) {
  const columnWidth = useMemo(() => getColumnWidth(scale), [scale]);

  // Calculate row height based on max lanes
  const rowHeight = row.maxLanes * LANE_HEIGHT;

  // Handle column click to start date selection
  const handleColumnMouseDown = useCallback((columnIndex: number) => {
    if (canEdit && onSelectionStart) {
      onSelectionStart(row.clientId, row.taskId, columnIndex);
    }
  }, [canEdit, onSelectionStart, row.clientId, row.taskId]);

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
    <div className="flex border-b border-forvis-gray-200 hover:bg-forvis-blue-50 transition-colors">
      {/* Scrollable timeline area with employee tiles */}
      <div 
        className="flex-1 relative"
        style={{ height: `${rowHeight}px` }}
      >
        {/* Timeline grid - clickable columns for date selection */}
        <div className="absolute inset-0 flex">
          {columns.map((col, index) => {
            const isInSelection = hasSelection && index >= selectionStart && index <= selectionEnd;
            const isWeekend = col.isWeekend;
            const isToday = col.isToday;
            
            return (
              <div
                key={index}
                className={`border-r border-forvis-gray-200 transition-colors ${
                  canEdit ? 'cursor-crosshair' : ''
                } ${
                  isInSelection ? 'bg-forvis-blue-200' : 
                  isToday ? 'bg-yellow-50' :
                  isWeekend ? 'bg-forvis-gray-50' : 
                  'bg-white hover:bg-forvis-blue-50'
                }`}
                style={{ 
                  width: `${columnWidth}px`,
                  minWidth: `${columnWidth}px`
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
              <EmployeeTile
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


