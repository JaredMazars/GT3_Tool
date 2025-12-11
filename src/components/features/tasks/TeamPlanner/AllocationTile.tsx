'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { AllocationData, GanttPosition, TimeScale } from './types';
import { getRoleGradient, formatHours, formatPercentage, getDayPixelWidth, snapToDay, pixelsToDays } from './utils';
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
}

export function AllocationTile({ 
  allocation, 
  position, 
  scale,
  columnWidth,
  onEdit,
  onUpdateDates,
  isDraggable = true 
}: AllocationTileProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
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
  const iconContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Memoize gradient calculation - only depends on role
  const gradient = useMemo(() => getRoleGradient(allocation.role), [allocation.role]);
  
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

  // Debounce the mouse move handler for ~60fps performance
  const handleMouseMove = useMemo(
    () => debounce(handleMouseMoveCore, 16, { leading: true, trailing: true }),
    [handleMouseMoveCore]
  );

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
      const onUp = (e: MouseEvent) => handleMouseUpRef.current(e);
      
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
      if (hideTooltipTimeout.current) {
        clearTimeout(hideTooltipTimeout.current);
      }
    };
  }, []);

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-lg shadow-corporate border-2 border-white ${
        isDragging || isResizing ? 'cursor-grabbing z-20 opacity-80' : 'cursor-grab hover:z-[5]'
      } hover:shadow-corporate-md overflow-hidden group`}
      style={{
        left: `${livePosition.left}px`,
        width: `${livePosition.width}px`,
        background: gradient,
        minWidth: '40px',
        pointerEvents: 'auto', // Allow clicks on tiles even though container has pointer-events: none
        // No transition - instant snapping for responsive feel
        transition: 'none',
        opacity: 1 // No visual feedback during save for seamless UX
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
        {/* Project Name - Always visible */}
        <div className="text-white text-xs font-semibold truncate pr-6">
          {allocation.taskName}
        </div>
        
        {/* Client Name - Show when width > 60px */}
        {livePosition.width > 60 && allocation.clientName && (
          <div className="text-white text-[10px] opacity-90 truncate pr-6">
            {allocation.clientName}
          </div>
        )}
        
        {/* Hours/Percentage - Show when width > 100px */}
        {livePosition.width > 100 && (
          <div className="text-white text-xs opacity-80 truncate pr-6">
            {allocation.allocatedHours 
              ? formatHours(allocation.allocatedHours) 
              : allocation.allocatedPercentage 
                ? formatPercentage(allocation.allocatedPercentage) 
                : ''}
          </div>
        )}
        
        {/* Info Icon */}
        {livePosition.width > 40 && (
          <div 
            ref={iconContainerRef}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1"
            onMouseEnter={(e) => {
              e.stopPropagation();
              // Cancel any pending hide
              if (hideTooltipTimeout.current) {
                clearTimeout(hideTooltipTimeout.current);
                hideTooltipTimeout.current = null;
              }
              setShowInfoTooltip(true);
              setShowTooltip(false);
            }}
            onMouseLeave={(e) => {
              e.stopPropagation();
              // Delay hiding to allow mouse to reach tooltip (300ms gives enough time)
              hideTooltipTimeout.current = setTimeout(() => {
                setShowInfoTooltip(false);
              }, 300);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white bg-opacity-20 hover:bg-opacity-40 rounded p-0.5 backdrop-blur-sm cursor-help transition-all">
              <Info className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
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

      {/* Quick Tooltip (on tile hover) */}
      {showTooltip && !showInfoTooltip && !isDragging && !isResizing && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-forvis-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-xl pointer-events-none" style={{ zIndex: 100 }}>
          <div className="font-semibold">{allocation.taskName}</div>
          {allocation.clientName && (
            <div className="text-xs opacity-90 mt-0.5">{allocation.clientName}</div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-forvis-gray-900" />
        </div>
      )}

      {/* Detailed Info Tooltip (on info icon hover) - Using Portal */}
      {showInfoTooltip && !isDragging && !isResizing && typeof document !== 'undefined' && createPortal(
        <div 
          ref={tooltipRef} 
          className="fixed px-3 py-2.5 bg-forvis-gray-900 text-white rounded-lg shadow-xl min-w-[220px] max-w-[280px]" 
          style={{ 
            zIndex: 9999,
            top: iconContainerRef.current ? `${iconContainerRef.current.getBoundingClientRect().top - 10}px` : '0px',
            right: iconContainerRef.current ? `${window.innerWidth - iconContainerRef.current.getBoundingClientRect().right}px` : '0px',
            transform: 'translateY(-100%)'
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            // Cancel any pending hide
            if (hideTooltipTimeout.current) {
              clearTimeout(hideTooltipTimeout.current);
              hideTooltipTimeout.current = null;
            }
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            // Hide tooltip when leaving
            setShowInfoTooltip(false);
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
            </div>
            {(allocation.allocatedHours || allocation.allocatedPercentage) && (
              <div className="flex justify-between gap-2">
                <span className="opacity-60 shrink-0">Allocated:</span>
                <span className="opacity-90">
                  {allocation.allocatedHours 
                    ? formatHours(allocation.allocatedHours) 
                    : allocation.allocatedPercentage 
                      ? formatPercentage(allocation.allocatedPercentage) 
                      : '-'}
                </span>
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
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-forvis-gray-900" />
        </div>,
        document.body
      )}
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
    prevProps.isDraggable === nextProps.isDraggable
  );
});
