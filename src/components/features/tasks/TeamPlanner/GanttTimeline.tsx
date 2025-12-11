'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { TimeScale, ResourceData, AllocationData, DateSelection, RowMetadata } from './types';
import { TimelineHeader } from './TimelineHeader';
import { ResourceRow } from './ResourceRow';
import { AllocationModal } from './AllocationModal';
import { getDateRange, generateTimelineColumns, calculateTotalHours, calculateTotalPercentage, getColumnWidth, assignLanes, calculateMaxLanes } from './utils';
import { memoizedCalculateTotalHours, memoizedCalculateTotalPercentage } from './optimizations';
import { Button, LoadingSpinner, ErrorModal } from '@/components/ui';
import { Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { TaskRole } from '@/types';
import { startOfDay, format, isSameDay } from 'date-fns';

interface GanttTimelineProps {
  taskId: number;
  teamMembers: any[];
  currentUserRole: TaskRole;
  onAllocationUpdate: () => void;
}

export function GanttTimeline({ 
  taskId, 
  teamMembers, 
  currentUserRole,
  onAllocationUpdate 
}: GanttTimelineProps) {
  const [scale, setScale] = useState<TimeScale>('week');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [creatingForUserId, setCreatingForUserId] = useState<string | null>(null);
  const [scrollToToday, setScrollToToday] = useState(false);
  const [dateSelection, setDateSelection] = useState<DateSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, Partial<AllocationData>>>(new Map());
  const [hoveredRowOffset, setHoveredRowOffset] = useState<{ sourceUserId: string; offset: number } | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string; title?: string }>({ 
    isOpen: false, 
    message: '' 
  });
  
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Determine if user can edit
  const canEdit = currentUserRole === 'ADMIN';

  // Handler to go to today - memoized to prevent recreating on every render
  const handleGoToToday = useCallback(() => {
    setReferenceDate(new Date());
    setScrollToToday(true);
  }, []);

  // Handler for date input change - memoized
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setReferenceDate(newDate);
    }
  }, []);

  // Generate date range and columns
  const dateRange = useMemo(() => getDateRange(scale, referenceDate), [scale, referenceDate]);
  const columns = useMemo(() => generateTimelineColumns(dateRange, scale), [dateRange, scale]);

  // Calculate cumulative row heights for accurate cross-lane drag targeting
  const cumulativeHeights = useMemo(() => {
    const heights: number[] = [];
    let cumulative = 0;
    
    teamMembers.forEach((member, index) => {
      const user = member.User || member.user;
      
      // Check if allocations array exists
      const allocations: AllocationData[] = (member as any).allocations?.length > 0
        ? (member as any).allocations.map((alloc: any) => ({
            ...alloc,
            startDate: startOfDay(new Date(alloc.startDate)),
            endDate: startOfDay(new Date(alloc.endDate))
          }))
        : member.startDate && member.endDate ? [{
            id: member.id,
            taskId: member.taskId,
            taskName: (member as any).taskName || 'Current Task',
            taskCode: (member as any).taskCode,
            clientName: (member as any).clientName,
            clientCode: (member as any).clientCode,
            role: member.role,
            startDate: startOfDay(new Date(member.startDate)),
            endDate: startOfDay(new Date(member.endDate)),
            allocatedHours: member.allocatedHours ? parseFloat(member.allocatedHours.toString()) : null,
            allocatedPercentage: member.allocatedPercentage,
            actualHours: member.actualHours ? parseFloat(member.actualHours.toString()) : null
          }] : [];

      const allocationsWithLanes = assignLanes(allocations);
      const maxLanes = calculateMaxLanes(allocationsWithLanes);
      const rowHeight = maxLanes * 36; // LANE_HEIGHT = 36px
      
      cumulative += rowHeight;
      heights.push(cumulative);
    });
    
    return heights;
  }, [teamMembers]);

  // Transform team members to resource data with optimistic updates applied
  const resources: ResourceData[] = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GanttTimeline.tsx:110',message:'Processing team members',data:{teamMembersCount:teamMembers.length,firstMemberAllocations:(teamMembers[0] as any)?.allocations?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return teamMembers.map(member => {
      const user = member.User || member.user;
      
      // Check if allocations array exists (from /api/tasks/:id/team/allocations endpoint)
      // Otherwise construct from flat member data (from /api/tasks/:id/users endpoint)
      const allocations: AllocationData[] = (member as any).allocations?.length > 0
        ? (member as any).allocations.map((alloc: any) => {
            const normalizedAlloc = {
              ...alloc,
              // Normalize dates to start of day for consistent display
              startDate: startOfDay(new Date(alloc.startDate)),
              endDate: startOfDay(new Date(alloc.endDate)),
              // Preserve isCurrentTask flag (defaults to true for backwards compatibility)
              isCurrentTask: alloc.isCurrentTask !== undefined ? alloc.isCurrentTask : true
            };
            
            // Apply optimistic update if exists (only for current task allocations)
            if (alloc.isCurrentTask !== false) {
              const optimisticUpdate = optimisticUpdates.get(alloc.id);
              if (optimisticUpdate) {
                return { ...normalizedAlloc, ...optimisticUpdate };
              }
            }
            
            return normalizedAlloc;
          })
        : member.startDate && member.endDate ? [{
            id: member.id,
            taskId: member.taskId,
            taskName: (member as any).taskName || 'Current Task',
            taskCode: (member as any).taskCode,
            clientName: (member as any).clientName,
            clientCode: (member as any).clientCode,
            role: member.role,
            // Normalize dates to start of day for consistent display
            startDate: startOfDay(new Date(member.startDate)),
            endDate: startOfDay(new Date(member.endDate)),
            allocatedHours: member.allocatedHours ? parseFloat(member.allocatedHours.toString()) : null,
            allocatedPercentage: member.allocatedPercentage,
            actualHours: member.actualHours ? parseFloat(member.actualHours.toString()) : null,
            isCurrentTask: true // Flat member data is always current task
          }].map(alloc => {
            // Apply optimistic update if exists for flat member data
            const optimisticUpdate = optimisticUpdates.get(alloc.id);
            if (optimisticUpdate) {
              return { ...alloc, ...optimisticUpdate };
            }
            return alloc;
          }) : [];

      // Assign lanes to allocations for multi-lane display
      const allocationsWithLanes = assignLanes(allocations);
      const maxLanes = calculateMaxLanes(allocationsWithLanes);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GanttTimeline.tsx:169',message:'Allocations with lanes',data:{userId:member.userId,totalAllocations:allocationsWithLanes.length,currentTask:allocationsWithLanes.filter(a=>a.isCurrentTask!==false).length,otherTasks:allocationsWithLanes.filter(a=>a.isCurrentTask===false).length,maxLanes},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
      // #endregion

      // Calculate totals only for current task allocations
      const currentTaskAllocations = allocationsWithLanes.filter(alloc => alloc.isCurrentTask !== false);
      
      return {
        userId: member.userId,
        userName: user?.name || '',
        userEmail: user?.email || '',
        userImage: user?.image,
        jobTitle: user?.jobTitle,
        officeLocation: user?.officeLocation,
        role: member.role,
        allocations: allocationsWithLanes, // Show all allocations
        totalAllocatedHours: memoizedCalculateTotalHours(currentTaskAllocations), // Total only current task
        totalAllocatedPercentage: memoizedCalculateTotalPercentage(currentTaskAllocations), // Total only current task
        maxLanes
      };
    });
  }, [teamMembers, optimisticUpdates]);

  const handleEditAllocation = useCallback((allocation: AllocationData) => {
    // Only allow editing current task allocations
    if (allocation.isCurrentTask === false) {
      return;
    }
    setSelectedAllocation(allocation);
    setIsModalOpen(true);
  }, []);

  const handleCreateAllocation = useCallback((userId: string, startDate?: Date, endDate?: Date) => {
    // Find the team member
    const member = teamMembers.find(m => m.userId === userId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GanttTimeline.tsx:201',message:'Creating allocation',data:{userId,foundMember:!!member,memberId:member?.id,memberTaskId:member?.taskId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    if (!member) {
      setErrorModal({ 
        isOpen: true, 
        message: 'Team member not found. Please refresh the page and try again.', 
        title: 'Not Found' 
      });
      return;
    }

    // Use provided dates or default to today + 7 days
    const allocationStartDate = startDate || new Date();
    const allocationEndDate = endDate || (() => {
      const nextWeek = new Date(allocationStartDate);
      nextWeek.setDate(allocationStartDate.getDate() + 7);
      return nextWeek;
    })();

    // Get task/client info from existing allocations if available
    const existingAllocation = (member as any).allocations?.[0];
    
    const newAllocation = {
      id: member.id, // Use team member id (TaskTeam.id)
      taskId: taskId,
      taskName: existingAllocation?.taskName || (member as any).taskName || 'Current Task',
      taskCode: existingAllocation?.taskCode || (member as any).taskCode,
      clientName: existingAllocation?.clientName || (member as any).clientName,
      clientCode: existingAllocation?.clientCode || (member as any).clientCode,
      role: member.role,
      startDate: startOfDay(allocationStartDate),
      endDate: startOfDay(allocationEndDate),
      allocatedHours: null,
      allocatedPercentage: null,
      actualHours: null
    };

    setSelectedAllocation(newAllocation);
    setCreatingForUserId(userId);
    setIsModalOpen(true);
  }, [teamMembers, taskId]);

  const handleSelectionStart = useCallback((userId: string, columnIndex: number) => {
    if (!canEdit) {
      return;
    }
    setIsSelecting(true);
    setDateSelection({
      userId,
      startColumnIndex: columnIndex,
      endColumnIndex: columnIndex
    });
  }, [canEdit]);

  const handleSelectionMove = useCallback((columnIndex: number) => {
    setDateSelection((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        endColumnIndex: columnIndex
      };
    });
  }, []);

  const handleSelectionEnd = useCallback(() => {
    setIsSelecting((currentIsSelecting) => {
      if (!currentIsSelecting) return false;
      
      setDateSelection((currentSelection) => {
        if (!currentSelection) return null;
        
        const { userId, startColumnIndex, endColumnIndex } = currentSelection;
        
        if (endColumnIndex === null) {
          // Single click - use default date range
          handleCreateAllocation(userId);
          return null;
        }

        // Calculate date range from selection
        const minIndex = Math.min(startColumnIndex, endColumnIndex);
        const maxIndex = Math.max(startColumnIndex, endColumnIndex);
        
        const startDate = columns[minIndex]?.date;
        const endDate = columns[maxIndex]?.date;
        
        if (startDate && endDate) {
          handleCreateAllocation(userId, startDate, endDate);
        }
        
        return null;
      });
      
      return false;
    });
  }, [columns, handleCreateAllocation]);

  // Scroll to today when requested
  useEffect(() => {
    if (scrollToToday && timelineContainerRef.current && columns.length > 0) {
      const today = startOfDay(new Date());
      const todayColumnIndex = columns.findIndex(col => 
        isSameDay(startOfDay(col.date), today)
      );
      
      if (todayColumnIndex !== -1) {
        // Get column width based on scale
        const columnWidth = getColumnWidth(scale);
        const scrollPosition = todayColumnIndex * columnWidth;
        
        // Scroll to center the today column
        const containerWidth = timelineContainerRef.current.clientWidth;
        const scrollLeft = Math.max(0, scrollPosition - (containerWidth / 2) + (columnWidth / 2));
        
        timelineContainerRef.current.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
      
      setScrollToToday(false);
    }
  }, [scrollToToday, columns, scale]);

  // Handle global mouse up for drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleSelectionEnd();
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleSelectionEnd]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    try {
      // Find the team member to get their ID
      const member = teamMembers.find(m => m.userId === userId);
      if (!member) return;

      const response = await fetch(`/api/tasks/${taskId}/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      onAllocationUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove team member. Please try again.';
      setErrorModal({ 
        isOpen: true, 
        message, 
        title: 'Remove Failed' 
      });
    }
  }, [teamMembers, taskId, onAllocationUpdate]);

  const handleSaveAllocation = useCallback(async (updates: Partial<AllocationData>) => {
    if (!selectedAllocation) {
      return;
    }

    // Apply optimistic update immediately
    if (updates.startDate || updates.endDate || updates.allocatedHours !== undefined || 
        updates.allocatedPercentage !== undefined || updates.role || updates.actualHours !== undefined) {
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        const optimisticData: Partial<AllocationData> = {};
        
        if (updates.startDate) optimisticData.startDate = startOfDay(updates.startDate);
        if (updates.endDate) optimisticData.endDate = startOfDay(updates.endDate);
        if (updates.allocatedHours !== undefined) optimisticData.allocatedHours = updates.allocatedHours;
        if (updates.allocatedPercentage !== undefined) optimisticData.allocatedPercentage = updates.allocatedPercentage;
        if (updates.role) optimisticData.role = updates.role;
        if (updates.actualHours !== undefined) optimisticData.actualHours = updates.actualHours;
        
        newMap.set(selectedAllocation.id, optimisticData);
        return newMap;
      });
    }

    setIsSaving(true);
    
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/team/${selectedAllocation.id}/allocation`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: updates.startDate?.toISOString(),
            endDate: updates.endDate?.toISOString(),
            allocatedHours: updates.allocatedHours,
            allocatedPercentage: updates.allocatedPercentage,
            actualHours: updates.actualHours,
            role: updates.role
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to update allocation';
        throw new Error(errorMessage);
      }

      // Clear optimistic update immediately - modal save is explicit user action
      // The refetch will provide fresh server data
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(selectedAllocation.id);
        return newMap;
      });
      
      // Trigger refetch to get fresh server data
      onAllocationUpdate();
      
      setIsModalOpen(false);
      setCreatingForUserId(null);
      setSelectedAllocation(null);
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(selectedAllocation.id);
        return newMap;
      });
      
      const message = error instanceof Error ? error.message : 'Failed to save allocation';
      setErrorModal({ 
        isOpen: true, 
        message, 
        title: 'Save Failed' 
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [selectedAllocation, taskId, onAllocationUpdate]);

  const handleClearAllocation = useCallback(async (allocationId: number) => {
    setIsSaving(true);
    
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/team/${allocationId}/allocation`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to clear allocation';
        throw new Error(errorMessage);
      }

      onAllocationUpdate();
      setIsModalOpen(false);
      setSelectedAllocation(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear allocation';
      setErrorModal({ 
        isOpen: true, 
        message, 
        title: 'Clear Failed' 
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [taskId, onAllocationUpdate]);

  const handleUpdateDates = useCallback(async (allocationId: number, startDate: Date, endDate: Date) => {
    // Apply optimistic update immediately for instant UI feedback
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(allocationId, {
        startDate: startOfDay(startDate),
        endDate: startOfDay(endDate)
      });
      return newMap;
    });

    try {
      // Make API call in background
      const response = await fetch(
        `/api/tasks/${taskId}/team/${allocationId}/allocation`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to update dates';
        throw new Error(errorMessage);
      }

      // DON'T refetch - the optimistic update already shows correct data
      // The drag operation saved to DB, so we can trust the optimistic update
      // Next natural refetch (modal save, page refresh, etc) will sync with server
      
      // Keep optimistic update indefinitely - it will be replaced by server data
      // on next refetch or when component unmounts
      // No need to clear since drag already saved the correct dates to DB
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(allocationId);
        return newMap;
      });
      
      const message = error instanceof Error ? error.message : 'Failed to update dates';
      setErrorModal({ isOpen: true, message, title: 'Update Failed' });
    }
  }, [taskId, onAllocationUpdate]);

  const handleTransferAllocation = useCallback(async (
    allocationId: number,
    _unusedTargetUserId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => {
    // Find source resource and determine target based on hoveredRowOffset
    const sourceResource = resources.find(r => 
      r.allocations.some(a => a.id === allocationId)
    );
    
    if (!sourceResource) {
      setErrorModal({ 
        isOpen: true, 
        message: 'Source allocation not found. Please refresh and try again.', 
        title: 'Transfer Failed' 
      });
      return;
    }
    
    // Determine target user ID from hoveredRowOffset
    if (!hoveredRowOffset || hoveredRowOffset.sourceUserId !== sourceResource.userId) {
      setErrorModal({ 
        isOpen: true, 
        message: 'Invalid transfer target. Please try again.', 
        title: 'Transfer Failed' 
      });
      return;
    }
    
    const sourceIndex = resources.findIndex(r => r.userId === sourceResource.userId);
    const targetIndex = sourceIndex + hoveredRowOffset.offset;
    
    if (targetIndex < 0 || targetIndex >= resources.length) {
      setErrorModal({ 
        isOpen: true, 
        message: 'Cannot transfer to that row. Please try a different team member.', 
        title: 'Invalid Target' 
      });
      return;
    }
    
    const targetResource = resources[targetIndex];
    
    if (!targetResource) {
      setErrorModal({ 
        isOpen: true, 
        message: 'Target team member not found. Please refresh and try again.', 
        title: 'Transfer Failed' 
      });
      return;
    }
    
    // Check if trying to transfer to same user
    if (sourceResource.userId === targetResource.userId) {
      // This is just a date change, use normal update
      handleUpdateDates(allocationId, newStartDate, newEndDate);
      return;
    }

    try {
      // Make API call to transfer
      // Note: AllocationTile sets isSaving=true which keeps the tile visually stable during transfer
      const response = await fetch(
        `/api/tasks/${taskId}/team/${allocationId}/transfer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: targetResource.userId,
            startDate: newStartDate.toISOString(),
            endDate: newEndDate.toISOString()
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to transfer allocation';
        throw new Error(errorMessage);
      }

      // Success - refetch to get fresh data
      // The allocation will move from source to target user
      onAllocationUpdate();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transfer allocation';
      setErrorModal({ 
        isOpen: true, 
        message, 
        title: 'Transfer Failed' 
      });
    } finally {
      // Clear hover state
      setHoveredRowOffset(null);
    }
  }, [taskId, resources, hoveredRowOffset, onAllocationUpdate, handleUpdateDates]);

  const handleRowHover = useCallback((sourceUserId: string, offset: number | null) => {
    if (offset === null) {
      setHoveredRowOffset(null);
    } else {
      setHoveredRowOffset({ sourceUserId, offset });
    }
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 overflow-hidden">
      {/* Controls */}
      <div 
        className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between"
        style={{ background: 'linear-gradient(to right, #F0F7FD, #E5F1FB)' }}
      >
        <div className="flex items-center gap-6">
          {/* Time Scale */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-forvis-blue-600" />
              <span className="text-sm font-semibold text-forvis-gray-900">Time Scale:</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setScale('day');
                  setReferenceDate(new Date());
                  setScrollToToday(true);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  scale === 'day'
                    ? 'text-white shadow-corporate'
                    : 'text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 hover:border-forvis-blue-400'
                }`}
                style={scale === 'day' ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' } : {}}
              >
                Days
              </button>
              <button
                onClick={() => {
                  setScale('week');
                  setReferenceDate(new Date());
                  setScrollToToday(true);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  scale === 'week'
                    ? 'text-white shadow-corporate'
                    : 'text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 hover:border-forvis-blue-400'
                }`}
                style={scale === 'week' ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' } : {}}
              >
                Weeks
              </button>
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={format(referenceDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 rounded-lg hover:border-forvis-blue-400 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 transition-all"
            />
            <button
              onClick={handleGoToToday}
              className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:scale-105 shadow-corporate"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              title="Go to today"
            >
              Today
            </button>
          </div>
        </div>

        <div className="text-sm text-forvis-gray-600">
          {resources.length} team {resources.length === 1 ? 'member' : 'members'}
        </div>
      </div>

      {/* Timeline Container */}
      <div ref={timelineContainerRef} className="overflow-x-auto overflow-y-auto max-h-[600px]">
        <div className="min-w-full">
          {/* Header */}
          <div className="flex sticky top-0 z-20">
            {/* User info column header */}
            <div className="w-64 flex-shrink-0 px-4 flex items-center bg-white border-b-2 border-r-2 border-forvis-gray-300 sticky left-0 z-30 h-14">
              <div className="text-sm font-semibold text-forvis-gray-900">Team Member</div>
            </div>
            {/* Timeline header */}
            <div className="flex-1">
              <TimelineHeader columns={columns} scale={scale} />
            </div>
          </div>

          {/* Resource Rows */}
          {resources.length === 0 ? (
            <div className="text-center py-12 text-forvis-gray-600">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">No team members</p>
              <p className="text-sm mt-1">Add team members to see their allocations</p>
            </div>
          ) : (
            resources.map((resource, index) => (
              <ResourceRow
                key={resource.userId}
                resource={resource}
                columns={columns}
                scale={scale}
                dateRange={dateRange}
                onEditAllocation={canEdit ? handleEditAllocation : () => {}}
                onUpdateDates={canEdit ? handleUpdateDates : undefined}
                onTransferAllocation={canEdit ? handleTransferAllocation : undefined}
                onRemoveMember={canEdit ? handleRemoveMember : undefined}
                canEdit={canEdit}
                onSelectionStart={handleSelectionStart}
                onSelectionMove={handleSelectionMove}
                dateSelection={dateSelection}
                isSelecting={isSelecting}
                isHoveredTarget={hoveredRowOffset !== null && (() => {
                  const sourceIndex = resources.findIndex(r => r.userId === hoveredRowOffset.sourceUserId);
                  return sourceIndex !== -1 && (sourceIndex + hoveredRowOffset.offset) === index;
                })()}
                onRowHover={handleRowHover}
                rowMetadata={{
                  rowIndex: index,
                  rowHeight: resource.maxLanes * 36,
                  cumulativeHeights: cumulativeHeights
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div 
        className="px-6 py-3 border-t-2 border-forvis-gray-200 flex items-center justify-between text-xs"
        style={{ background: 'linear-gradient(to right, #F8F9FA, #F0F7FD)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)' }} />
            <span className="text-forvis-gray-700">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }} />
            <span className="text-forvis-gray-700">Reviewer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)' }} />
            <span className="text-forvis-gray-700">Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)' }} />
            <span className="text-forvis-gray-700">Viewer</span>
          </div>
        </div>
        <div className="text-forvis-gray-600">
          {canEdit ? 'Click timeline to create allocation • Click tiles to edit' : 'Click tiles to view details'}
        </div>
      </div>

      {/* Allocation Modal */}
      <AllocationModal
        allocation={selectedAllocation}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAllocation(null);
          setCreatingForUserId(null);
        }}
        onSave={handleSaveAllocation}
        onClear={handleClearAllocation}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}


