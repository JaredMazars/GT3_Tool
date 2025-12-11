'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { TimeScale, ResourceData, AllocationData, DateSelection, RowMetadata } from './types';
import { TimelineHeader } from './TimelineHeader';
import { ResourceRow } from './ResourceRow';
import { AllocationModal } from './AllocationModal';
import { AdminPlanningModal } from './AdminPlanningModal';
import { getDateRange, generateTimelineColumns, calculateTotalHours, calculateTotalPercentage, getColumnWidth, assignLanes, calculateMaxLanes } from './utils';
import { memoizedCalculateTotalHours, memoizedCalculateTotalPercentage } from './optimizations';
import { Button, LoadingSpinner, ErrorModal } from '@/components/ui';
import { Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { TaskRole } from '@/types';
import { startOfDay, format, isSameDay, addDays, addWeeks } from 'date-fns';

interface GanttTimelineProps {
  taskId: number;
  teamMembers: any[];
  currentUserRole: TaskRole;
  onAllocationUpdate: () => void;
  serviceLine?: string;
  subServiceLineGroup?: string;
}

export function GanttTimeline({ 
  taskId, 
  teamMembers, 
  currentUserRole,
  onAllocationUpdate,
  serviceLine,
  subServiceLineGroup
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
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string; title?: string }>({ 
    isOpen: false, 
    message: '' 
  });
  const [isAdminPlanningModalOpen, setIsAdminPlanningModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adminModalInitialDates, setAdminModalInitialDates] = useState<{ startDate?: Date; endDate?: Date }>({});
  
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Determine if user can edit
  // For planner view (taskId === 0), allow ADMIN, REVIEWER, and EDITOR roles to create allocations
  const canEdit = taskId === 0 
    ? (currentUserRole === 'ADMIN' || currentUserRole === 'REVIEWER' || currentUserRole === 'EDITOR')
    : currentUserRole === 'ADMIN';

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

  // Handler to go to previous period
  const handlePrevious = useCallback(() => {
    const amount = scale === 'day' ? 50 : 14;
    const newDate = scale === 'day' ? addDays(referenceDate, -amount) : addWeeks(referenceDate, -amount);
    setReferenceDate(newDate);
  }, [scale, referenceDate]);

  // Handler to go to next period
  const handleNext = useCallback(() => {
    const amount = scale === 'day' ? 50 : 14;
    const newDate = scale === 'day' ? addDays(referenceDate, amount) : addWeeks(referenceDate, amount);
    setReferenceDate(newDate);
  }, [scale, referenceDate]);

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

      // Calculate totals only for current task allocations
      const currentTaskAllocations = allocationsWithLanes.filter(alloc => alloc.isCurrentTask !== false);
      
      return {
        userId: member.userId,
        userName: user?.name || '',
        userEmail: user?.email || '',
        userImage: user?.image,
        jobTitle: user?.jobTitle,
        jobGradeCode: (user as any)?.jobGradeCode,
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
    if (!member) {
      setErrorModal({ 
        isOpen: true, 
        message: 'Team member not found. Please refresh the page and try again.', 
        title: 'Not Found' 
      });
      return;
    }

    // If admin and service line context available, show admin planning modal
    if (canEdit && serviceLine && subServiceLineGroup) {
      setSelectedUserId(userId);
      // Store the selected dates or use defaults
      const allocationStartDate = startDate || new Date();
      const allocationEndDate = endDate || (() => {
        const nextWeek = new Date(allocationStartDate);
        nextWeek.setDate(allocationStartDate.getDate() + 7);
        return nextWeek;
      })();
      setAdminModalInitialDates({ 
        startDate: startOfDay(allocationStartDate), 
        endDate: startOfDay(allocationEndDate) 
      });
      setIsAdminPlanningModalOpen(true);
      return;
    }

    // Otherwise, use existing flow for current task
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
  }, [teamMembers, taskId, canEdit, serviceLine, subServiceLineGroup]);

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
  }, [canEdit, currentUserRole]);

  const handleSelectionMove = useCallback((columnIndex: number) => {
    setDateSelection((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        endColumnIndex: columnIndex
      };
    });
  }, [isSelecting]);

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
  }, [columns, handleCreateAllocation, isSelecting, dateSelection]);

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
      // For planner view (taskId=0), use the allocation's actual taskId
      const actualTaskId = taskId === 0 ? selectedAllocation.taskId : taskId;
      
      const response = await fetch(
        `/api/tasks/${actualTaskId}/team/${selectedAllocation.id}/allocation`,
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
      // For planner view (taskId=0), use the allocation's actual taskId
      const actualTaskId = taskId === 0 && selectedAllocation ? selectedAllocation.taskId : taskId;
      
      const response = await fetch(
        `/api/tasks/${actualTaskId}/team/${allocationId}/allocation`,
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
  }, [taskId, selectedAllocation, onAllocationUpdate]);

  const handleAdminPlanningModalSave = useCallback(async (data: {
    taskId: number;
    startDate: Date;
    endDate: Date;
    allocatedHours: number;
    allocatedPercentage: number;
    role: TaskRole;
  }) => {
    if (!selectedUserId) return;

    setIsSaving(true);

    try {
      let teamMemberId: number | undefined;

      // First, try to add the user to the task team
      const addResponse = await fetch(`/api/tasks/${data.taskId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          role: data.role
        })
      });

      if (addResponse.ok) {
        // User was successfully added to the team
        const addResult = await addResponse.json();
        teamMemberId = addResult.data?.id || addResult.id;
      } else if (addResponse.status === 400) {
        // User is already on the team - fetch their team member ID
        const errorData = await addResponse.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes('already on this project')) {
          // Fetch the task team members to get the team member ID
          const teamResponse = await fetch(`/api/tasks/${data.taskId}/users`);
          if (teamResponse.ok) {
            const teamResult = await teamResponse.json();
            const teamMembers = teamResult.data || teamResult;
            const existingMember = teamMembers.find((m: any) => m.userId === selectedUserId);
            if (existingMember) {
              teamMemberId = existingMember.id;
            }
          }
        }
        if (!teamMemberId) {
          throw new Error(errorData.error || 'Failed to add user to task');
        }
      } else {
        const errorData = await addResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add user to task');
      }

      if (!teamMemberId) {
        throw new Error('Could not determine team member ID');
      }

      // Now create the allocation for this user on this task
      const allocResponse = await fetch(
        `/api/tasks/${data.taskId}/team/${teamMemberId}/allocation`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: data.startDate.toISOString(),
            endDate: data.endDate.toISOString(),
            allocatedHours: data.allocatedHours,
            allocatedPercentage: data.allocatedPercentage,
            role: data.role
          })
        }
      );

      if (!allocResponse.ok) {
        const errorData = await allocResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create allocation');
      }

      // Refresh the planner data
      onAllocationUpdate();
      
      setIsAdminPlanningModalOpen(false);
      setSelectedUserId(null);
    } catch (error) {
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
  }, [selectedUserId, onAllocationUpdate]);

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
      // For planner view (taskId=0), find the allocation's actual taskId
      let actualTaskId = taskId;
      if (taskId === 0) {
        // Find the allocation in resources to get its taskId
        for (const resource of resources) {
          const allocation = resource.allocations.find(a => a.id === allocationId);
          if (allocation) {
            actualTaskId = allocation.taskId;
            break;
          }
        }
      }
      
      // Make API call in background
      const response = await fetch(
        `/api/tasks/${actualTaskId}/team/${allocationId}/allocation`,
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
  }, [taskId, resources, onAllocationUpdate]);


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
            <button
              onClick={handlePrevious}
              className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:scale-105 shadow-corporate"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:scale-105 shadow-corporate"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
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
                onRemoveMember={canEdit ? handleRemoveMember : undefined}
                canEdit={canEdit}
                onSelectionStart={handleSelectionStart}
                onSelectionMove={handleSelectionMove}
                dateSelection={dateSelection}
                isSelecting={isSelecting}
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

      {/* Admin Planning Modal */}
      {serviceLine && subServiceLineGroup && selectedUserId && (
        <AdminPlanningModal
          isOpen={isAdminPlanningModalOpen}
          onClose={() => {
            setIsAdminPlanningModalOpen(false);
            setSelectedUserId(null);
            setAdminModalInitialDates({});
          }}
          onSave={handleAdminPlanningModalSave}
          serviceLine={serviceLine}
          subServiceLineGroup={subServiceLineGroup}
          userId={selectedUserId}
          userName={resources.find(r => r.userId === selectedUserId)?.userName || 'Employee'}
          initialStartDate={adminModalInitialDates.startDate}
          initialEndDate={adminModalInitialDates.endDate}
        />
      )}

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


