'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AllocationData, GanttPosition, TimeScale } from './types';
import { getRoleGradient, formatHours, formatPercentage, getDayPixelWidth, snapToDay, pixelsToDays } from './utils';
import { format, addDays, startOfDay } from 'date-fns';

interface AllocationTileProps {
  allocation: AllocationData;
  position: GanttPosition;
  scale: TimeScale;
  columnWidth: number;
  onEdit: (allocation: AllocationData) => void;
  onUpdateDates?: (allocationId: number, startDate: Date, endDate: Date) => void;
  isDraggable?: boolean;
}

export function AllocationTile({ 
  allocation, 
  position, 
  scale,
  columnWidth,
  onEdit,
  onUpdateDates,
  isDraggable = true 
}: AllocationTileProps) {
  const [showTooltip, setShowTooltip] = useState(false);
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
  
  const gradient = getRoleGradient(allocation.role);
  
  // Calculate day pixel width based on current scale
  const dayPixelWidth = useMemo(() => 
    getDayPixelWidth(scale, columnWidth), 
    [scale, columnWidth]
  );
  
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

  // Detect when server data matches expected dates (server sync detection)
  useEffect(() => {
    if (isSaving && expectedDates && allocation.startDate && allocation.endDate) {
      // Normalize all dates to start of day for accurate comparison
      const serverStart = startOfDay(new Date(allocation.startDate)).getTime();
      const serverEnd = startOfDay(new Date(allocation.endDate)).getTime();
      const expectedStart = startOfDay(expectedDates.start).getTime();
      const expectedEnd = startOfDay(expectedDates.end).getTime();

      // Day-level tolerance (dates normalized to midnight)
      const DAY_IN_MS = 24 * 60 * 60 * 1000;
      const startMatches = Math.abs(serverStart - expectedStart) < DAY_IN_MS;
      const endMatches = Math.abs(serverEnd - expectedEnd) < DAY_IN_MS;

      if (startMatches && endMatches) {
        // Server confirmed our expected dates
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
    // Capture current VISUAL position as snapshot (use livePosition, not position)
    // This ensures we capture what the user actually sees, not the server position
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
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    const deltaX = e.clientX - dragStartX.current;
    
    // Snap delta to day boundaries
    const snappedDelta = snapToDay(deltaX, dayPixelWidth);
    setCurrentDelta(snappedDelta);
    
    // Mark as dragged if moved more than half a day
    if (Math.abs(snappedDelta) > dayPixelWidth / 2) {
      setHasDragged(true);
    }
    
    // Convert to days
    const daysDelta = pixelsToDays(snappedDelta, dayPixelWidth);
    
    if (!allocation.startDate || !allocation.endDate) return;
    
    // Normalize dates to start of day to match position calculations
    const currentStart = startOfDay(new Date(allocation.startDate));
    const currentEnd = startOfDay(new Date(allocation.endDate));
    
    let newStart: Date;
    let newEnd: Date;
    
    if (isDragging) {
      // Drag: move both dates by same amount
      newStart = addDays(currentStart, daysDelta);
      newEnd = addDays(currentEnd, daysDelta);
    } else if (isResizing === 'left') {
      // Resize left: change start date, keep end date
      newStart = addDays(currentStart, daysDelta);
      newEnd = currentEnd;
      // Enforce minimum 1 day
      if (newStart >= newEnd) {
        newStart = addDays(newEnd, -1);
      }
    } else if (isResizing === 'right') {
      // Resize right: keep start date, change end date
      newStart = currentStart;
      newEnd = addDays(currentEnd, daysDelta);
      // Enforce minimum 1 day
      if (newEnd <= newStart) {
        newEnd = addDays(newStart, 1);
      }
    } else {
      return;
    }
    
    setPreviewDates({ start: newStart, end: newEnd });
  }, [isDragging, isResizing, allocation.startDate, allocation.endDate, dayPixelWidth]);

  const handleMouseUp = useCallback(() => {
    if (previewDates && onUpdateDates) {
      lastAppliedDelta.current = currentDelta; // Store for isSaving state
      // Store which action was performed BEFORE clearing the states
      if (isDragging) {
        lastAction.current = 'drag';
      } else if (isResizing === 'left') {
        lastAction.current = 'resize-left';
      } else if (isResizing === 'right') {
        lastAction.current = 'resize-right';
      }
      setIsSaving(true);
      setExpectedDates(previewDates); // Store expected dates
      onUpdateDates(allocation.id, previewDates.start, previewDates.end);
    }
    
    setIsDragging(false);
    setIsResizing(null);
    setPreviewDates(null);
    // Don't reset currentDelta here if saving - keep it for position calculation
    if (!previewDates) {
      setCurrentDelta(0);
    }
    
    setTimeout(() => setHasDragged(false), 100);
  }, [previewDates, onUpdateDates, allocation.id, currentDelta, isDragging, isResizing]);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Calculate live position during drag/resize/saving
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

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-lg shadow-corporate border-2 border-white ${
        isDragging || isResizing ? 'cursor-grabbing z-20 opacity-80' : 'cursor-grab hover:z-10'
      } hover:shadow-corporate-md overflow-hidden group`}
      style={{
        left: `${livePosition.left}px`,
        width: `${livePosition.width}px`,
        background: gradient,
        minWidth: '40px',
        // Smooth transition when not dragging (includes when isSaving completes)
        transition: (isDragging || isResizing) 
          ? 'none' 
          : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isSaving ? 0.9 : 1 // Visual feedback during save
      }}
      onClick={(e) => {
        // Don't open modal if this was a drag operation
        if (!hasDragged) {
          onEdit(allocation);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit(allocation);
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
      onMouseEnter={() => !isDragging && !isResizing && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Content */}
      <div className="px-2 py-1 h-full flex flex-col justify-center relative">
        <div className="text-white text-xs font-semibold truncate">
          {allocation.taskName}
        </div>
        {livePosition.width > 80 && (
          <>
            <div className="text-white text-xs opacity-90 truncate">
              {allocation.role}
            </div>
            {livePosition.width > 120 && (
              <div className="text-white text-xs opacity-80">
                {allocation.allocatedHours ? formatHours(allocation.allocatedHours) : formatPercentage(allocation.allocatedPercentage)}
              </div>
            )}
          </>
        )}
        
        {/* Progress bar */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-20">
            <div 
              className="h-full bg-white bg-opacity-50"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Resize handles */}
      {isDraggable && livePosition.width > 60 && !isDragging && !isResizing && (
        <>
          <div 
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
            onClick={(e) => e.stopPropagation()}
          />
          <div 
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
            onClick={(e) => e.stopPropagation()}
          />
        </>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-forvis-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-corporate-lg pointer-events-none">
          <div className="font-semibold mb-1">{allocation.taskName}</div>
          <div className="space-y-0.5 text-xs opacity-90">
            <div>Role: {allocation.role}</div>
            <div>
              {allocation.startDate && format(new Date(allocation.startDate), 'MMM d, yyyy')}
              {' - '}
              {allocation.endDate && format(new Date(allocation.endDate), 'MMM d, yyyy')}
            </div>
            {allocation.allocatedHours && (
              <div>Allocated: {formatHours(allocation.allocatedHours)}</div>
            )}
            {allocation.allocatedPercentage && (
              <div>Capacity: {formatPercentage(allocation.allocatedPercentage)}</div>
            )}
            {allocation.actualHours && (
              <div>Actual: {formatHours(allocation.actualHours)} ({progress.toFixed(0)}%)</div>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-forvis-gray-900" />
        </div>
      )}
    </div>
  );
}


