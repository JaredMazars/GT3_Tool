'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AllocationData, GanttPosition, TimeScale, RowMetadata } from './types';
import {
  getRoleGradient,
  formatHours,
  formatPercentage,
  getDayPixelWidth,
  snapToDay,
  pixelsToDays,
  calculateBusinessDays,
  calculateAvailableHours,
  getUtilizationBlendColor
} from './utils';
import { format, addDays, startOfDay } from 'date-fns';

// Constants
const LANE_HEIGHT = 36;
const LANE_GAP = 3;
const MIN_DRAG_DISTANCE = 5;

interface AllocationTileProps {
  allocation: AllocationData;
  position: GanttPosition;
  scale: TimeScale;
  columnWidth: number;
  onEdit: (allocation: AllocationData) => void;
  onUpdateDates?: (allocationId: number, startDate: Date, endDate: Date) => void;
  isDraggable?: boolean;
  lane: number;
  rowMetadata: RowMetadata;
}

export function AllocationTile({ 
  allocation, 
  position, 
  scale,
  columnWidth,
  onEdit,
  onUpdateDates,
  isDraggable = true,
  lane,
  rowMetadata
}: AllocationTileProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [previewDates, setPreviewDates] = useState<{ start: Date; end: Date } | null>(null);
  const [currentDelta, setCurrentDelta] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [expectedDates, setExpectedDates] = useState<{ start: Date; end: Date } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  
  const dragStartX = useRef(0);
  const originalLeft = useRef(0);
  const originalWidth = useRef(0);
  const lastAppliedDelta = useRef(0);
  const lastAction = useRef<'drag' | 'resize-left' | 'resize-right' | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize gradient calculation based on role
  const gradient = useMemo(() => {
    return getRoleGradient(allocation.role);
  }, [allocation.role]);
  
  // Calculate day pixel width based on current scale
  const dayPixelWidth = useMemo(() => 
    getDayPixelWidth(scale, columnWidth), 
    [scale, columnWidth]
  );
  
  // Calculate progress (actual vs allocated hours)
  const progress = allocation.actualHours && allocation.allocatedHours
    ? Math.min((allocation.actualHours / allocation.allocatedHours) * 100, 100)
    : 0;

  // Update refs when position changes and not actively dragging or saving
  useEffect(() => {
    if (!isDragging && !isResizing && !isSaving) {
      originalLeft.current = position.left;
      originalWidth.current = position.width;
    }
  }, [position.left, position.width, isDragging, isResizing, isSaving]);

  // Detect when server data matches expected dates
  useEffect(() => {
    if (isSaving && expectedDates && allocation.startDate && allocation.endDate) {
      const serverStart = startOfDay(new Date(allocation.startDate)).getTime();
      const serverEnd = startOfDay(new Date(allocation.endDate)).getTime();
      const expectedStart = startOfDay(expectedDates.start).getTime();
      const expectedEnd = startOfDay(expectedDates.end).getTime();

      const DAY_IN_MS = 24 * 60 * 60 * 1000;
      const startMatches = Math.abs(serverStart - expectedStart) < DAY_IN_MS;
      const endMatches = Math.abs(serverEnd - expectedEnd) < DAY_IN_MS;

      if (startMatches && endMatches) {
        setIsSaving(false);
        setExpectedDates(null);
        setCurrentDelta(0);
        lastAppliedDelta.current = 0;
        lastAction.current = null;
      }
    }
  }, [isSaving, expectedDates, allocation.startDate, allocation.endDate]);

  // Use preview dates during drag/resize for visual feedback
  const displayDates = previewDates || {
    start: allocation.startDate ? new Date(allocation.startDate) : null,
    end: allocation.endDate ? new Date(allocation.endDate) : null
  };

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize-left' | 'resize-right') => {
    if (!isDraggable || !allocation.startDate || !allocation.endDate) {
      return;
    }
    
    e.stopPropagation();
    e.preventDefault();
    
    dragStartX.current = e.clientX;
    originalLeft.current = livePosition.left;
    originalWidth.current = livePosition.width;
    
    setCurrentDelta(0);
    setHasDragged(false);
    
    if (action === 'drag') {
      setIsDragging(true);
    } else if (action === 'resize-left') {
      setIsResizing('left');
    } else if (action === 'resize-right') {
      setIsResizing('right');
    }
    
    lastAction.current = action;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (!allocation.startDate || !allocation.endDate) return;

    const deltaX = e.clientX - dragStartX.current;
    
    if (!hasDragged && Math.abs(deltaX) >= MIN_DRAG_DISTANCE) {
      setHasDragged(true);
    }

    // Snap to day boundaries
    const snappedDelta = snapToDay(deltaX, dayPixelWidth);
    
    if (snappedDelta !== lastAppliedDelta.current) {
      const dayDelta = pixelsToDays(snappedDelta, dayPixelWidth);
      const originalStart = startOfDay(new Date(allocation.startDate));
      const originalEnd = startOfDay(new Date(allocation.endDate));

      let newStart = originalStart;
      let newEnd = originalEnd;

      if (isDragging) {
        newStart = addDays(originalStart, dayDelta);
        newEnd = addDays(originalEnd, dayDelta);
      } else if (isResizing === 'left') {
        newStart = addDays(originalStart, dayDelta);
        // Ensure at least 1 day duration
        if (newStart >= originalEnd) {
          newStart = addDays(originalEnd, -1);
        }
      } else if (isResizing === 'right') {
        newEnd = addDays(originalEnd, dayDelta);
        // Ensure at least 1 day duration
        if (newEnd <= originalStart) {
          newEnd = addDays(originalStart, 1);
        }
      }

      setPreviewDates({ start: newStart, end: newEnd });
      setCurrentDelta(snappedDelta);
      lastAppliedDelta.current = snappedDelta;
    }
  }, [isDragging, isResizing, allocation.startDate, allocation.endDate, dayPixelWidth, hasDragged]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging && !isResizing) return;
    if (!previewDates || !hasDragged) {
      // No significant movement, just reset state
      setIsDragging(false);
      setIsResizing(null);
      setPreviewDates(null);
      setCurrentDelta(0);
      lastAppliedDelta.current = 0;
      lastAction.current = null;
      return;
    }

    // Save the changes
    if (onUpdateDates) {
      // Store lastAppliedDelta BEFORE clearing drag state (critical for livePosition during save)
      lastAppliedDelta.current = currentDelta;
      // Store which action was performed BEFORE clearing the states
      // lastAction is already set in handleMouseDown, so it's already captured
      
      setExpectedDates(previewDates);
      setIsSaving(true);
      setIsDragging(false);
      setIsResizing(null);
      // Don't clear previewDates yet - keep for display during save
      
      onUpdateDates(
        allocation.id,
        previewDates.start,
        previewDates.end
      );
    } else {
      setIsDragging(false);
      setIsResizing(null);
      setPreviewDates(null);
      setCurrentDelta(0);
      lastAppliedDelta.current = 0;
      lastAction.current = null;
    }
  }, [isDragging, isResizing, previewDates, hasDragged, onUpdateDates, allocation.id, currentDelta]);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Calculate live position with delta applied
  const livePosition = useMemo(() => {
    // CRITICAL: While saving, hold the position with lastAppliedDelta applied
    // This prevents jumping back to old server position
    if (isSaving) {
      const delta = lastAppliedDelta.current;
      const action = lastAction.current;
      
      // Use stored action type to determine how to calculate position
      if (action === 'resize-left') {
        return {
          left: originalLeft.current + delta,
          width: Math.max(originalWidth.current - delta, dayPixelWidth)
        };
      } else if (action === 'resize-right') {
        return {
          left: originalLeft.current,
          width: Math.max(originalWidth.current + delta, dayPixelWidth)
        };
      }
      // Default to drag behavior
      return {
        left: originalLeft.current + delta,
        width: originalWidth.current
      };
    }
    
    // Not saving and not dragging/resizing: use server position
    if (!isDragging && !isResizing) {
      return position;
    }
    
    // Active drag/resize: show live preview
    if (isDragging) {
      return {
        left: originalLeft.current + currentDelta,
        width: originalWidth.current
      };
    } else if (isResizing === 'left') {
      return {
        left: originalLeft.current + currentDelta,
        width: Math.max(originalWidth.current - currentDelta, dayPixelWidth) // Minimum one day
      };
    } else if (isResizing === 'right') {
      return {
        left: originalLeft.current,
        width: Math.max(originalWidth.current + currentDelta, dayPixelWidth) // Minimum one day
      };
    }
    
    return position;
  }, [position, currentDelta, isDragging, isResizing, isSaving, dayPixelWidth]);

  // Tooltip handlers
  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  const handleTooltipMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing]);

  // Calculate tile positioning
  const tileTop = lane * LANE_HEIGHT + LANE_GAP;
  const tileHeight = LANE_HEIGHT - (LANE_GAP * 2);

  // Cursor style
  const cursorClass = isDraggable 
    ? (isDragging ? 'cursor-grabbing' : 'cursor-grab')
    : 'cursor-pointer';

  // Opacity for dragging
  const tileOpacity = isDragging || isResizing ? 0.8 : 1;

  // Calculate utilization percentage
  const utilizationPercentage = useMemo(() => {
    if (!displayDates.start || !displayDates.end || !allocation.allocatedHours) {
      return 0;
    }
    
    const businessDays = calculateBusinessDays(displayDates.start, displayDates.end);
    const availableHours = calculateAvailableHours(displayDates.start, displayDates.end);
    
    if (availableHours === 0) return 0;
    
    return Math.round((allocation.allocatedHours / availableHours) * 100);
  }, [allocation.allocatedHours, displayDates.start, displayDates.end]);

  // Get employee display name
  const employeeDisplayName = allocation.employeeName || allocation.userId.split('@')[0];

  return (
    <div
      ref={tileRef}
      className={`absolute rounded-lg shadow-corporate border-2 ${
        isDraggable ? 'border-white' : 'border-forvis-gray-400'
      } ${cursorClass} hover:shadow-corporate-md overflow-hidden group`}
      style={{
        top: `${tileTop}px`,
        height: `${tileHeight}px`,
        left: `${livePosition.left}px`,
        width: `${livePosition.width}px`,
        minWidth: `${Math.max(dayPixelWidth, 20)}px`,
        pointerEvents: 'auto',
        transition: 'none',
        opacity: isDraggable ? tileOpacity : 0.7
      }}
      onClick={(e) => {
        if (isDraggable && !hasDragged) {
          onEdit(allocation);
        }
      }}
      onDoubleClick={(e) => {
        if (isDraggable) {
          e.stopPropagation();
          onEdit(allocation);
        }
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleTooltipMouseMove}
      onMouseLeave={handleMouseLeave}
      title={utilizationPercentage > 0 ? `${utilizationPercentage.toFixed(0)}% allocated` : undefined}
    >
      {/* Base tile background */}
      <div 
        className="absolute inset-0 rounded-lg"
        style={{ background: gradient }}
      />
      
      {/* Utilization fill layer - darker version of role color */}
      {utilizationPercentage > 0 && (
        <div 
          className="absolute bottom-0 left-0 right-0 rounded-lg"
          style={{
            height: `${Math.min(utilizationPercentage, 100)}%`,
            background: getUtilizationBlendColor(gradient, utilizationPercentage),
            transition: (isDragging || isResizing) ? 'none' : 'height 0.2s ease-in-out'
          }}
        />
      )}

      {/* Content layer */}
      <div className="absolute inset-0 flex items-center px-2 text-white text-[10px] font-semibold truncate pointer-events-none z-10">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="truncate">{employeeDisplayName}</span>
          {allocation.jobGradeCode && (
            <span className="px-1 py-0.5 rounded bg-white/20 text-white text-[9px] font-medium flex-shrink-0">
              {allocation.jobGradeCode}
            </span>
          )}
        </div>
      </div>

      {/* Resize handles - only show when editable and on hover */}
      {isDraggable && livePosition.width >= dayPixelWidth && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors z-20 opacity-0 group-hover:opacity-100"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors z-20 opacity-0 group-hover:opacity-100"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
            onClick={(e) => e.stopPropagation()}
          />
        </>
      )}

      {/* Tooltip */}
      {showTooltip && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] bg-forvis-gray-900 text-white px-3 py-2 rounded-lg shadow-corporate-lg text-xs pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10,
            maxWidth: '280px'
          }}
        >
          <div className="space-y-1">
            <div className="font-semibold text-sm">{employeeDisplayName}</div>
            {allocation.employeeCode && (
              <div className="text-forvis-gray-300">Code: {allocation.employeeCode}</div>
            )}
            {allocation.jobGradeCode && (
              <div className="text-forvis-gray-300">Grade: {allocation.jobGradeCode}</div>
            )}
            {allocation.officeLocation && (
              <div className="text-forvis-gray-300">Office: {allocation.officeLocation}</div>
            )}
            <div className="text-forvis-gray-300">Role: {allocation.role}</div>
            <div className="border-t border-forvis-gray-700 my-1"></div>
            <div className="text-forvis-gray-300">
              {displayDates.start && format(displayDates.start, 'MMM d, yyyy')} - {displayDates.end && format(displayDates.end, 'MMM d, yyyy')}
            </div>
            {allocation.allocatedHours !== null && (
              <div className="text-forvis-gray-300">
                Hours: {formatHours(allocation.allocatedHours)} 
                {allocation.allocatedPercentage !== null && ` (${formatPercentage(allocation.allocatedPercentage)})`}
              </div>
            )}
            {allocation.actualHours !== null && allocation.actualHours > 0 && (
              <div className="text-forvis-gray-300">
                Actual: {formatHours(allocation.actualHours)}
              </div>
            )}
            {utilizationPercentage > 0 && (
              <div className="text-forvis-gray-300">
                Utilization: {utilizationPercentage.toFixed(0)}%
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}











