import { useState, useRef, useCallback } from 'react';
import { addDays } from 'date-fns';
import { AllocationData, TimeScale } from './types';

interface DragDropState {
  state: 'idle' | 'dragging' | 'resizing' | 'syncing';
  action: 'drag' | 'resize-left' | 'resize-right' | null;
  originalDates: { start: Date; end: Date } | null;
  previewDates: { start: Date; end: Date } | null;
  hasMovedMinDistance: boolean;
}

interface UseDragDropOptions {
  allocation: AllocationData;
  scale: TimeScale;
  columnWidth: number;
  minDragDistance?: number;
  onUpdate: (allocationId: number, startDate: Date, endDate: Date) => void;
  onRevert?: () => void;
}

export function useDragDrop({
  allocation,
  scale,
  columnWidth,
  minDragDistance = 5,
  onUpdate,
  onRevert
}: UseDragDropOptions) {
  const [dragState, setDragState] = useState<DragDropState>({
    state: 'idle',
    action: null,
    originalDates: null,
    previewDates: null,
    hasMovedMinDistance: false
  });

  const dragStartX = useRef(0);
  const totalDeltaX = useRef(0);

  const pixelsToTimeUnits = useCallback((pixels: number): number => {
    const units = pixels / columnWidth;
    switch (scale) {
      case 'day':
        return Math.round(units);
      case 'week':
        return Math.round(units * 7);
      case 'month':
        return Math.round(units * 30);
    }
  }, [scale, columnWidth]);

  const startDrag = useCallback((clientX: number, action: 'drag' | 'resize-left' | 'resize-right') => {
    if (!allocation.startDate || !allocation.endDate) {
      return;
    }

    dragStartX.current = clientX;
    totalDeltaX.current = 0;

    const state: 'dragging' | 'resizing' = action === 'drag' ? 'dragging' : 'resizing';

    setDragState({
      state,
      action,
      originalDates: {
        start: new Date(allocation.startDate),
        end: new Date(allocation.endDate)
      },
      previewDates: null,
      hasMovedMinDistance: false
    });
  }, [allocation]);

  const updateDrag = useCallback((clientX: number) => {
    if (dragState.state === 'idle' || !dragState.originalDates) {
      return;
    }

    const deltaX = clientX - dragStartX.current;
    totalDeltaX.current = deltaX;

    // Check if moved minimum distance
    const hasMovedEnough = Math.abs(deltaX) > minDragDistance;
    
    if (!hasMovedEnough && !dragState.hasMovedMinDistance) {
      return; // Don't update preview until minimum distance reached
    }

    const daysDelta = pixelsToTimeUnits(deltaX);
    const { start: currentStart, end: currentEnd } = dragState.originalDates;
    
    let newStart: Date;
    let newEnd: Date;
    
    if (dragState.action === 'drag') {
      newStart = addDays(currentStart, daysDelta);
      newEnd = addDays(currentEnd, daysDelta);
    } else if (dragState.action === 'resize-left') {
      newStart = addDays(currentStart, daysDelta);
      newEnd = currentEnd;
      // Ensure at least 1 day duration
      if (newStart >= newEnd) {
        newStart = addDays(newEnd, -1);
      }
    } else if (dragState.action === 'resize-right') {
      newStart = currentStart;
      newEnd = addDays(currentEnd, daysDelta);
      // Ensure at least 1 day duration
      if (newEnd <= newStart) {
        newEnd = addDays(newStart, 1);
      }
    } else {
      return;
    }

    setDragState(prev => ({
      ...prev,
      previewDates: { start: newStart, end: newEnd },
      hasMovedMinDistance: hasMovedEnough || prev.hasMovedMinDistance
    }));
  }, [dragState, minDragDistance, pixelsToTimeUnits]);

  const finishDrag = useCallback(() => {
    if (dragState.state === 'idle' || !dragState.originalDates) {
      return;
    }

    // Only save if moved minimum distance
    if (dragState.hasMovedMinDistance && dragState.previewDates) {
      setDragState(prev => ({
        ...prev,
        state: 'syncing'
      }));
      
      onUpdate(allocation.id, dragState.previewDates.start, dragState.previewDates.end);
    } else {
      // Cancel drag if didn't move enough
      setDragState({
        state: 'idle',
        action: null,
        originalDates: null,
        previewDates: null,
        hasMovedMinDistance: false
      });
    }
  }, [dragState, allocation.id, onUpdate]);

  const completeSave = useCallback(() => {
    setDragState({
      state: 'idle',
      action: null,
      originalDates: null,
      previewDates: null,
      hasMovedMinDistance: false
    });
  }, []);

  const revertDrag = useCallback(() => {
    setDragState({
      state: 'idle',
      action: null,
      originalDates: null,
      previewDates: null,
      hasMovedMinDistance: false
    });
    
    onRevert?.();
  }, [onRevert]);

  const cancelDrag = useCallback(() => {
    setDragState({
      state: 'idle',
      action: null,
      originalDates: null,
      previewDates: null,
      hasMovedMinDistance: false
    });
  }, []);

  return {
    dragState,
    startDrag,
    updateDrag,
    finishDrag,
    completeSave,
    revertDrag,
    cancelDrag
  };
}
