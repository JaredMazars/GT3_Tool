'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AllocationData, GanttPosition, TimeScale } from './types';
import { getRoleGradient, formatHours, formatPercentage } from './utils';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

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
  const [hasDragged, setHasDragged] = useState(false);
  const dragStartX = useRef(0);
  const originalLeft = useRef(0);
  const originalWidth = useRef(0);
  const savedDelta = useRef(0);
  const savedAction = useRef<'drag' | 'resize-left' | 'resize-right' | null>(null);
  const lastSyncedPosition = useRef({ left: position.left, width: position.width });
  
  const gradient = getRoleGradient(allocation.role);
  
  const progress = allocation.actualHours && allocation.allocatedHours
    ? Math.min((allocation.actualHours / allocation.allocatedHours) * 100, 100)
    : 0;

  // Update refs when not dragging/resizing/saving AND position actually changed
  useEffect(() => {
    if (!isDragging && !isResizing && !isSaving) {
      const positionChanged = 
        Math.abs(position.left - lastSyncedPosition.current.left) > 0.1 ||
        Math.abs(position.width - lastSyncedPosition.current.width) > 0.1;
      
      if (positionChanged) {
        console.log('📍 Refs synced (position changed):', { 
          from: lastSyncedPosition.current,
          to: { left: position.left, width: position.width }
        });
        originalLeft.current = position.left;
        originalWidth.current = position.width;
        lastSyncedPosition.current = { left: position.left, width: position.width };
      }
    }
  }, [position.left, position.width, isDragging, isResizing, isSaving]);
  
  // Clear saving state after refetch completes
  useEffect(() => {
    if (isSaving) {
      const timeout = setTimeout(() => {
        console.log('⏰ Timeout: clearing isSaving (refs will sync automatically)');
        savedDelta.current = 0;
        savedAction.current = null;
        // Just clear isSaving - refs will sync in the effect above on next render
        setIsSaving(false);
      }, 1500);
      
      return () => clearTimeout(timeout);
    }
  }, [isSaving]);

  // Use preview dates during drag/resize for visual feedback
  const displayDates = previewDates || {
    start: allocation.startDate ? new Date(allocation.startDate) : null,
    end: allocation.endDate ? new Date(allocation.endDate) : null
  };

  const pixelsToTimeUnits = (pixels: number) => {
    const units = pixels / columnWidth;
    switch (scale) {
      case 'day':
        return Math.round(units);
      case 'week':
        return Math.round(units * 7);
      case 'month':
        return Math.round(units * 30);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize-left' | 'resize-right') => {
    if (!isDraggable || !allocation.startDate || !allocation.endDate) {
      return;
    }
    
    e.stopPropagation();
    e.preventDefault();
    
    dragStartX.current = e.clientX;
    // Capture current position as snapshot
    originalLeft.current = position.left;
    originalWidth.current = position.width;
    
    console.log('🖱️ Mouse down:', { action, left: position.left, width: position.width });
    
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
    setCurrentDelta(deltaX);
    
    // Mark as dragged if moved more than 10 pixels (increased sensitivity threshold)
    if (Math.abs(deltaX) > 10) {
      setHasDragged(true);
    }
    
    const daysDelta = pixelsToTimeUnits(deltaX);
    
    if (!allocation.startDate || !allocation.endDate) return;
    
    const currentStart = new Date(allocation.startDate);
    const currentEnd = new Date(allocation.endDate);
    
    let newStart: Date;
    let newEnd: Date;
    
    if (isDragging) {
      newStart = addDays(currentStart, daysDelta);
      newEnd = addDays(currentEnd, daysDelta);
    } else if (isResizing === 'left') {
      newStart = addDays(currentStart, daysDelta);
      newEnd = currentEnd;
      if (newStart >= newEnd) {
        newStart = addDays(newEnd, -1);
      }
    } else if (isResizing === 'right') {
      newStart = currentStart;
      newEnd = addDays(currentEnd, daysDelta);
      if (newEnd <= newStart) {
        newEnd = addDays(newStart, 1);
      }
    } else {
      return;
    }
    
    setPreviewDates({ start: newStart, end: newEnd });
  }, [isDragging, isResizing, allocation, scale, columnWidth]);

  const handleMouseUp = useCallback(() => {
    console.log('⬆️ Mouse up:', { currentDelta, hasPreview: !!previewDates });
    
    if (previewDates && onUpdateDates) {
      // Save delta and action type to keep position while saving
      savedDelta.current = currentDelta;
      if (isDragging) {
        savedAction.current = 'drag';
      } else if (isResizing) {
        savedAction.current = isResizing === 'left' ? 'resize-left' : 'resize-right';
      }
      
      console.log('💾 Setting saving state:', { savedDelta: savedDelta.current, savedAction: savedAction.current });
      
      setIsSaving(true);
      onUpdateDates(allocation.id, previewDates.start, previewDates.end);
    }
    
    setIsDragging(false);
    setIsResizing(null);
    setPreviewDates(null);
    setCurrentDelta(0);
    
    setTimeout(() => setHasDragged(false), 100);
  }, [previewDates, onUpdateDates, allocation.id, currentDelta, isDragging, isResizing]);

  // Add/remove global mouse event listeners
  useEffect(() => {
    console.log('🔧 useEffect for event listeners:', { isDragging, isResizing });
    
    if (isDragging || isResizing) {
      console.log('➕ Attaching event listeners');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        console.log('➖ Removing event listeners');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Calculate live position during drag/resize
  const livePosition = useMemo(() => {
    // While saving, ALWAYS use saved calculation until timeout clears isSaving
    if (isSaving && !isDragging && !isResizing) {
      const delta = savedDelta.current;
      const action = savedAction.current;
      
      console.log('⏳ Using saved calculation:', { action, delta });
      
      if (action === 'drag') {
        return {
          left: originalLeft.current + delta,
          width: originalWidth.current
        };
      } else if (action === 'resize-left') {
        return {
          left: originalLeft.current + delta,
          width: originalWidth.current - delta
        };
      } else if (action === 'resize-right') {
        return {
          left: originalLeft.current,
          width: originalWidth.current + delta
        };
      }
    }
    
    if (!isDragging && !isResizing) {
      return position;
    }
    
    if (isDragging) {
      const newLeft = originalLeft.current + currentDelta;
      return {
        left: newLeft,
        width: originalWidth.current
      };
    } else if (isResizing === 'left') {
      const newLeft = originalLeft.current + currentDelta;
      const newWidth = originalWidth.current - currentDelta;
      return {
        left: newLeft,
        width: newWidth
      };
    } else if (isResizing === 'right') {
      const newWidth = originalWidth.current + currentDelta;
      return {
        left: originalLeft.current,
        width: newWidth
      };
    }
    
    return position;
  }, [position, currentDelta, isDragging, isResizing, isSaving]);

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
        transition: isDragging || isResizing ? 'none' : 'all 0.2s'
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
        {position.width > 80 && (
          <>
            <div className="text-white text-xs opacity-90 truncate">
              {allocation.role}
            </div>
            {position.width > 120 && (
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
      {isDraggable && position.width > 60 && !isDragging && !isResizing && (
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


