'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AllocationData, GanttPosition, TimeScale, RowMetadata } from './types';
import { getRoleGradient, formatHours, formatPercentage, getDayPixelWidth, snapToDay, pixelsToDays, calculateBusinessDays, calculateAvailableHours } from './utils';
import { debounce } from './optimizations';
import { format, addDays, startOfDay } from 'date-fns';

interface AllocationTileProps {
  allocation: AllocationData;
  position: GanttPosition;
  scale: TimeScale;
  columnWidth: number;
  onEdit: (allocation: AllocationData) => void;
  onUpdateDates?: (allocationId: number, startDate: Date, endDate: Date) => void;
  isDraggable?: boolean;
  currentUserId?: string;
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
  currentUserId,
  lane,
  rowMetadata
}: AllocationTileProps): JSX.Element {
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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memoize gradient calculation - only depends on role and whether it's current task
  const gradient = useMemo(() => {
    // Grey out other task allocations
    if (allocation.isCurrentTask === false) {
      return 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'; // Grey gradient
    }
    return getRoleGradient(allocation.role);
  }, [allocation.role, allocation.isCurrentTask]);
  
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
    // Disable dragging/resizing for other task allocations
    if (!isDraggable || !allocation.startDate || !allocation.endDate || allocation.isCurrentTask === false) {
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

  // Debounced mouse move handler for smoother performance
  const handleMouseMoveCore = useCallback((e: MouseEvent) => {
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
      // Enforce minimum 1 day (endDate INCLUSIVE model: end must be >= start)
      if (newStart > newEnd) {
        newStart = newEnd;
      }
    } else if (isResizing === 'right') {
      // Resize right: keep start date, change end date
      newStart = currentStart;
      newEnd = addDays(currentEnd, daysDelta);
      // Enforce minimum 1 day (endDate INCLUSIVE model: end must be >= start)
      if (newEnd < newStart) {
        newEnd = newStart;
      }
    } else {
      return;
    }
    
    setPreviewDates({ start: newStart, end: newEnd });
  }, [isDragging, isResizing, allocation.startDate, allocation.endDate, dayPixelWidth]);

  // Debounce the mouse move handler for ~60fps performance
  const handleMouseMove = useMemo(
    () => debounce(handleMouseMoveCore, 16, { leading: true, trailing: true }),
    [handleMouseMoveCore]
  );

  const handleMouseUp = useCallback(() => {
    // Handle date update if there are preview dates
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

  // Store handlers in refs to avoid recreating listeners on every render
  const handleMouseMoveRef = useRef(handleMouseMove);
  const handleMouseUpRef = useRef(handleMouseUp);

  // Update refs when handlers change (without causing re-renders)
  useEffect(() => {
    handleMouseMoveRef.current = handleMouseMove;
    handleMouseUpRef.current = handleMouseUp;
  }, [handleMouseMove, handleMouseUp]);

  // Add/remove global mouse event listeners with optimized cleanup
  useEffect(() => {
    if (isDragging || isResizing) {
      const onMove = (e: MouseEvent) => handleMouseMoveRef.current(e);
      const onUp = () => handleMouseUpRef.current();
      
      // Use passive: false for mouseup to allow preventDefault if needed
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      
      return () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
    }
    return undefined;
  }, [isDragging, isResizing]);

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
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle mouse enter with 2 second delay
  const handleMouseEnter = useCallback(() => {
    if (isDragging || isResizing) return;
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set tooltip to show after 2 seconds
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 2000);
  }, [isDragging, isResizing]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    // Clear the timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  // Determine opacity based on drag state
  const tileOpacity = useMemo(() => {
    if (isSaving) return 1;
    if (isDragging || isResizing) return 0.8;
    return 1;
  }, [isDragging, isResizing, isSaving]);
  
  // Calculate tile positioning based on lane
  const LANE_HEIGHT = 36;
  const TILE_GAP = 3;
  const tileTop = lane * LANE_HEIGHT + TILE_GAP;
  const tileHeight = LANE_HEIGHT - TILE_GAP * 2;
  
  // Determine if this allocation is editable
  const isEditable = allocation.isCurrentTask !== false;
  const cursorClass = isEditable 
    ? (isDragging || isResizing ? 'cursor-grabbing z-20' : 'cursor-grab hover:z-[5]')
    : 'cursor-default hover:z-[5]';

  return (
    <div
      ref={tileRef}
      className={`absolute rounded-lg shadow-corporate border-2 ${
        isEditable ? 'border-white' : 'border-forvis-gray-400'
      } ${cursorClass} hover:shadow-corporate-md overflow-hidden group`}
      style={{
        top: `${tileTop}px`,
        height: `${tileHeight}px`,
        left: `${livePosition.left}px`,
        width: `${livePosition.width}px`,
        background: gradient,
        minWidth: `${Math.max(dayPixelWidth, 20)}px`, // Dynamic minimum: at least 1 day width or 20px
        pointerEvents: 'auto', // Allow clicks on tiles even though container has pointer-events: none
        // No transition - instant snapping for responsive feel
        transition: 'none',
        opacity: isEditable ? tileOpacity : 0.7
      }}
      onClick={(e) => {
        // Only open modal for current task allocations, and only if not dragged
        if (isEditable && !hasDragged) {
          onEdit(allocation);
        }
      }}
      onDoubleClick={(e) => {
        // Only open modal for current task allocations
        if (isEditable) {
          e.stopPropagation();
          onEdit(allocation);
        }
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Content - Progressive reveal from left to right */}
      <div className="px-1.5 h-full flex items-center relative overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0 w-full">
          {/* Client Name - Always visible, left-most priority, never truncates */}
          {allocation.clientName && (
            <>
              <div className="text-white text-[9px] opacity-90 font-medium whitespace-nowrap flex-shrink-0">
                {allocation.clientName}
              </div>
              <div className="text-white text-[9px] opacity-60 flex-shrink-0">•</div>
            </>
          )}
          
          {/* Task Name - Always visible, can truncate if needed */}
          <div className="text-white text-[10px] font-semibold truncate min-w-0 flex-1">
            {allocation.taskName}
          </div>
          
          {/* Hours/Percentage - Only shows when tile is wide enough (>150px) */}
          {livePosition.width > 150 && (allocation.allocatedHours || allocation.allocatedPercentage) && (
            <>
              <div className="text-white text-[9px] opacity-60 flex-shrink-0">•</div>
              <div className="text-white text-[9px] opacity-80 whitespace-nowrap flex-shrink-0">
                {allocation.allocatedHours 
                  ? formatHours(allocation.allocatedHours) 
                  : allocation.allocatedPercentage 
                    ? formatPercentage(allocation.allocatedPercentage) 
                    : ''}
              </div>
            </>
          )}
        </div>
      </div>
        
      {/* Progress bar */}
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-20">
          <div 
            className="h-full bg-white bg-opacity-50"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Resize handles - only for current task allocations */}
      {isEditable && isDraggable && livePosition.width >= dayPixelWidth && !isDragging && !isResizing && (
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

      {/* Detailed Tooltip (on tile hover for 2+ seconds) - Using Portal */}
      {showTooltip && !isDragging && !isResizing && typeof document !== 'undefined' && tileRef.current && (() => {
        // Calculate business days and available hours for tooltip
        const businessDays = allocation.startDate && allocation.endDate 
          ? calculateBusinessDays(new Date(allocation.startDate), new Date(allocation.endDate))
          : 0;
        const availableHours = allocation.startDate && allocation.endDate
          ? calculateAvailableHours(new Date(allocation.startDate), new Date(allocation.endDate))
          : 0;
        
        return createPortal(
          <div 
            ref={tooltipRef} 
            className="fixed px-3 py-2.5 bg-forvis-gray-900 text-white rounded-lg shadow-xl min-w-[220px] max-w-[280px]" 
            style={{ 
              zIndex: 9999,
              top: `${tileRef.current.getBoundingClientRect().top - 10}px`,
              left: `${tileRef.current.getBoundingClientRect().left + (tileRef.current.getBoundingClientRect().width / 2)}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-semibold mb-2 text-sm border-b border-white border-opacity-20 pb-1.5">
              {allocation.taskName}
            </div>
            <div className="space-y-1.5 text-xs">
              {allocation.taskCode && (
                <div className="flex justify-between gap-2">
                  <span className="opacity-60 shrink-0">Project:</span>
                  <span className="opacity-90 text-right">{allocation.taskCode}</span>
                </div>
              )}
              {allocation.clientName && (
                <div className="flex justify-between gap-2">
                  <span className="opacity-60 shrink-0">Client:</span>
                  <span className="opacity-90 text-right truncate">
                    {allocation.clientName}
                    {allocation.clientCode && <span className="opacity-60 ml-1">({allocation.clientCode})</span>}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="opacity-60 shrink-0">Role:</span>
                <span className="opacity-90">{allocation.role}</span>
              </div>
              <div className="pt-1 border-t border-white border-opacity-10">
                <div className="opacity-60 mb-1">Period:</div>
                <div className="opacity-90 text-xs">
                  {allocation.startDate && format(new Date(allocation.startDate), 'MMM d, yyyy')}
                  {' → '}
                  {allocation.endDate && format(new Date(allocation.endDate), 'MMM d, yyyy')}
                </div>
                {businessDays > 0 && (
                  <div className="opacity-70 text-[10px] mt-0.5">
                    {businessDays} business days × 8h = {availableHours}h available
                  </div>
                )}
              </div>
              {allocation.allocatedHours && (
                <div className="pt-1 border-t border-white border-opacity-10">
                  <div className="flex justify-between gap-2">
                    <span className="opacity-60 shrink-0">Allocated:</span>
                    <span className="text-white font-medium">
                      {formatHours(allocation.allocatedHours)}
                      {availableHours > 0 && (
                        <span className="opacity-70 ml-1">
                          of {availableHours}h ({allocation.allocatedPercentage || Math.round((allocation.allocatedHours / availableHours) * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
              {!allocation.allocatedHours && allocation.allocatedPercentage && (
                <div className="flex justify-between gap-2">
                  <span className="opacity-60 shrink-0">Allocated:</span>
                  <span className="opacity-90">{formatPercentage(allocation.allocatedPercentage)}</span>
                </div>
              )}
              {allocation.actualHours && (
                <div className="flex justify-between gap-2">
                  <span className="opacity-60 shrink-0">Actual:</span>
                  <span className="text-white font-medium">
                    {formatHours(allocation.actualHours)} <span className="opacity-80">({progress.toFixed(0)}%)</span>
                  </span>
                </div>
              )}
            </div>
            {/* Tooltip arrow pointing down to tile */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-forvis-gray-900" />
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

// Wrap with React.memo for optimized re-rendering
// Custom comparison function to prevent unnecessary re-renders
export default React.memo(AllocationTile, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.allocation.id === nextProps.allocation.id &&
    prevProps.allocation.role === nextProps.allocation.role &&
    prevProps.allocation.startDate === nextProps.allocation.startDate &&
    prevProps.allocation.endDate === nextProps.allocation.endDate &&
    prevProps.allocation.allocatedHours === nextProps.allocation.allocatedHours &&
    prevProps.allocation.allocatedPercentage === nextProps.allocation.allocatedPercentage &&
    prevProps.allocation.actualHours === nextProps.allocation.actualHours &&
    prevProps.position.left === nextProps.position.left &&
    prevProps.position.width === nextProps.position.width &&
    prevProps.scale === nextProps.scale &&
    prevProps.columnWidth === nextProps.columnWidth &&
    prevProps.isDraggable === nextProps.isDraggable &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.rowMetadata.rowIndex === nextProps.rowMetadata.rowIndex &&
    prevProps.rowMetadata.rowHeight === nextProps.rowMetadata.rowHeight
  );
});
