'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { TimeScale, AllocationData, DateSelection, RowMetadata, TaskPlannerRow, getAllocationKeyById } from './types';
import { TaskRow } from './TaskRow';
import { EmployeeAllocationModal } from './EmployeeAllocationModal';
import { AddEmployeeModal } from './AddEmployeeModal';
import { 
  getDateRange, 
  generateTimelineColumns, 
  getColumnWidth,
  assignLanes,
  calculateMaxLanes
} from './utils';
import { Button, LoadingSpinner, ErrorModal } from '@/components/ui';
import { Calendar, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { ServiceLineRole } from '@/types';
import { startOfDay, format, addDays, addWeeks } from 'date-fns';
import { useClientPlanner } from '@/hooks/planning/useClientPlanner';
import { useGlobalClientPlanner } from '@/hooks/planning/useGlobalClientPlanner';

// Re-export TimelineHeader from TeamPlanner since it's identical
import { TimelineHeader } from '../TeamPlanner/TimelineHeader';
// Import memoized calculation utilities for performance optimization
import { memoizedCalculateTotalHours, memoizedCalculateTotalPercentage } from '../TeamPlanner/optimizations';

interface ClientPlannerTimelineProps {
  serviceLine: string;
  subServiceLineGroup: string;
  currentUserRole: ServiceLineRole | string;
  filters: {
    clients: string[];
    groups: string[];
    partners: string[];
    tasks: string[];
    managers: string[];
    serviceLines?: string[];
    subServiceLineGroups?: string[];
  };
  onAllocationUpdate: () => void | Promise<void>;
  isGlobalView?: boolean;
}

export function ClientPlannerTimeline({
  serviceLine,
  subServiceLineGroup,
  currentUserRole,
  filters,
  onAllocationUpdate,
  isGlobalView = false
}: ClientPlannerTimelineProps) {
  const [scale, setScale] = useState<TimeScale>('week');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scrollToToday, setScrollToToday] = useState(false);
  const [dateSelection, setDateSelection] = useState<DateSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<AllocationData>>>(new Map());
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string; title?: string }>({ 
    isOpen: false, 
    message: '' 
  });
  const [overlayScrollTop, setOverlayScrollTop] = useState(0);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  
  // Add Employee Modal state
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [selectedTaskForAdd, setSelectedTaskForAdd] = useState<{
    taskId: number;
    clientName: string;
    clientCode: string;
    taskName: string;
    taskCode: string;
  } | null>(null);
  const [addEmployeeDates, setAddEmployeeDates] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);
  
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Determine if user can edit based on ServiceLineRole
  const roleUpper = (currentUserRole || '').toUpperCase();
  const canEdit = roleUpper === 'ADMINISTRATOR' || roleUpper === 'PARTNER' || roleUpper === 'MANAGER' || roleUpper === 'SUPERVISOR' || roleUpper === 'USER';

  // Fetch client planner data - use global hook if in global view
  const { 
    data: serviceData, 
    isLoading: isLoadingService, 
    error: serviceError,
    refetch: serviceRefetch
  } = useClientPlanner({
    serviceLine,
    subServiceLineGroup,
    clientCodes: filters.clients,
    groupDescs: filters.groups,
    partnerCodes: filters.partners,
    taskCodes: filters.tasks,
    managerCodes: filters.managers,
    page,
    limit,
    enabled: !isGlobalView && !!serviceLine && !!subServiceLineGroup
  });

  const {
    data: globalData,
    isLoading: isLoadingGlobal,
    error: globalError,
    refetch: globalRefetch
  } = useGlobalClientPlanner({
    clientCodes: filters.clients,
    groupDescs: filters.groups,
    partnerCodes: filters.partners,
    taskCodes: filters.tasks,
    managerCodes: filters.managers,
    serviceLines: filters.serviceLines || [],
    subServiceLineGroups: filters.subServiceLineGroups || [],
    page,
    limit,
    enabled: isGlobalView
  });

  const data = isGlobalView ? globalData : serviceData;
  const isLoading = isGlobalView ? isLoadingGlobal : isLoadingService;
  const fetchError = isGlobalView ? globalError : serviceError;
  const refetch = isGlobalView ? globalRefetch : serviceRefetch;

  const rawTasks = data?.tasks || [];
  const pagination = data?.pagination;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.clients, filters.groups, filters.partners, filters.tasks, filters.managers]);

  // Process task data with optimistic updates and recalculate lanes
  // This matches TeamPlanner's approach of recalculating lanes when data changes
  const rows: TaskPlannerRow[] = useMemo(() => {
    if (!rawTasks) return [];
    
    return rawTasks.map(task => {
      // 1. Apply optimistic updates to allocations
      const allocationsWithUpdates = task.allocations.map(allocation => {
        const optimisticKey = getAllocationKeyById(allocation.id);
        const optimisticUpdate = optimisticUpdates.get(optimisticKey);
        
        if (optimisticUpdate) {
          return { ...allocation, ...optimisticUpdate };
        }
        return allocation;
      });
      
      // 2. Recalculate lanes with updated positions (prevents overlaps during drag)
      const allocationsWithLanes = assignLanes(allocationsWithUpdates);
      const maxLanes = calculateMaxLanes(allocationsWithLanes);
      
      return {
        ...task,
        allocations: allocationsWithLanes,
        maxLanes
      };
    });
  }, [rawTasks, optimisticUpdates]); // Recalculates when optimistic updates change

  // Handler to go to today
  const handleGoToToday = useCallback(() => {
    setReferenceDate(new Date());
    setScrollToToday(true);
  }, []);

  // Handler for date input change
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

  // Calculate cumulative row heights for accurate positioning
  const cumulativeHeights = useMemo(() => {
    const heights: number[] = [];
    let cumulative = 0;
    
    rows.forEach((row) => {
      const rowHeight = row.maxLanes * 36; // LANE_HEIGHT = 36px
      cumulative += rowHeight;
      heights.push(cumulative);
    });
    
    return heights;
  }, [rows]);

  const handleEditAllocation = useCallback((allocation: AllocationData) => {
    setSelectedAllocation(allocation);
    setIsModalOpen(true);
  }, []);

  const handleSelectionStart = useCallback((taskId: number, columnIndex: number) => {
    if (!canEdit) return;
    
    setIsSelecting(true);
    setDateSelection({
      taskId,
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

  const openAddEmployeeModal = useCallback((taskId: number, startDate: Date, endDate: Date) => {
    const row = rows.find(r => r.taskId === taskId);
    if (!row) return;
    
    setSelectedTaskForAdd({
      taskId: row.taskId,
      clientName: row.clientName,
      clientCode: row.clientCode,
      taskName: row.taskName,
      taskCode: row.taskCode
    });
    setAddEmployeeDates({ startDate: startOfDay(startDate), endDate: startOfDay(endDate) });
    setIsAddEmployeeModalOpen(true);
  }, [rows]);

  const handleSelectionEnd = useCallback(() => {
    if (!dateSelection) {
      setIsSelecting(false);
      return;
    }
    
    const { taskId, startColumnIndex, endColumnIndex } = dateSelection;
    
    if (endColumnIndex === null || endColumnIndex === startColumnIndex) {
      // Single click - use default range (today + 7 days)
      const startDate = new Date();
      const endDate = addDays(startDate, 7);
      openAddEmployeeModal(taskId, startDate, endDate);
    } else {
      // Dragged range - use column dates
      const minIndex = Math.min(startColumnIndex, endColumnIndex);
      const maxIndex = Math.max(startColumnIndex, endColumnIndex);
      const startDate = columns[minIndex]?.date;
      const endDate = columns[maxIndex]?.date;
      
      if (startDate && endDate) {
        openAddEmployeeModal(taskId, startDate, endDate);
      }
    }
    
    setIsSelecting(false);
    setDateSelection(null);
  }, [dateSelection, columns, openAddEmployeeModal]);

  // Scroll to today when requested
  useEffect(() => {
    if (scrollToToday && timelineContainerRef.current && columns.length > 0) {
      const todayColumnIndex = columns.findIndex(col => col.isToday);
      
      if (todayColumnIndex !== -1) {
        const columnWidth = getColumnWidth(scale);
        const scrollPosition = todayColumnIndex * columnWidth;
        
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

  // Sync overlay scroll position with timeline container
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      setOverlayScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isLoading, rows.length]); // Re-run when data loads

  const handleSaveAllocation = useCallback(async (updates: {
    startDate?: Date;
    endDate?: Date;
    allocatedHours?: number | null;
    allocatedPercentage?: number | null;
    role?: ServiceLineRole | string;
    actualHours?: number | null;
  }) => {
    if (!selectedAllocation) return;

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
        
        const optimisticKey = getAllocationKeyById(selectedAllocation.id);
        newMap.set(optimisticKey, optimisticData);
        return newMap;
      });
    }

    setIsSaving(true);
    
    try {
      const response = await fetch(
        `/api/tasks/${selectedAllocation.taskId}/team/${selectedAllocation.id}/allocation`,
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

      // Clear optimistic update and refetch
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        const optimisticKey = getAllocationKeyById(selectedAllocation.id);
        newMap.delete(optimisticKey);
        return newMap;
      });
      
      await onAllocationUpdate(); // Invalidate all planner data for multi-user consistency
      setIsModalOpen(false);
      setSelectedAllocation(null);
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        const optimisticKey = getAllocationKeyById(selectedAllocation.id);
        newMap.delete(optimisticKey);
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
  }, [selectedAllocation, onAllocationUpdate]);

  const handleClearAllocation = useCallback(async (allocationId: number) => {
    setIsSaving(true);
    
    try {
      if (!selectedAllocation) return;
      
      const response = await fetch(
        `/api/tasks/${selectedAllocation.taskId}/team/${allocationId}/allocation`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to clear allocation';
        throw new Error(errorMessage);
      }

      await onAllocationUpdate(); // Invalidate all planner data for multi-user consistency
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
  }, [selectedAllocation, onAllocationUpdate]);

  const handleUpdateDates = useCallback(async (allocationId: number, startDate: Date, endDate: Date) => {
    // Find the allocation to get its taskId
    let taskId: number | null = null;
    
    for (const row of rows) {
      const allocation = row.allocations.find(a => a.id === allocationId);
      if (allocation) {
        taskId = row.taskId;
        break;
      }
    }

    if (!taskId) return;

    // Apply optimistic update immediately for instant UI feedback
    const optimisticKey = getAllocationKeyById(allocationId);
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(optimisticKey, {
        startDate: startOfDay(startDate),
        endDate: startOfDay(endDate)
      });
      return newMap;
    });

    try {
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

      // Invalidate cache to ensure all views stay in sync
      await onAllocationUpdate();
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(optimisticKey);
        return newMap;
      });
      
      const message = error instanceof Error ? error.message : 'Failed to update dates';
      setErrorModal({ isOpen: true, message, title: 'Update Failed' });
    }
  }, [rows, onAllocationUpdate]);

  const handleAddEmployeeSave = useCallback(async () => {
    await onAllocationUpdate(); // Invalidate all planner data for multi-user consistency
    setIsAddEmployeeModalOpen(false);
    setSelectedTaskForAdd(null);
    setAddEmployeeDates(null);
  }, [onAllocationUpdate]);

  // Get client and task info for modal
  const modalTaskInfo = useMemo(() => {
    if (!selectedAllocation) return null;

    for (const row of rows) {
      const allocation = row.allocations.find(a => a.id === selectedAllocation.id);
      if (allocation) {
        return {
          clientName: row.clientName,
          clientCode: row.clientCode,
          taskName: row.taskName,
          taskCode: row.taskCode
        };
      }
    }
    return null;
  }, [selectedAllocation, rows]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-forvis-gray-600">Loading client planner data...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <p className="font-semibold text-forvis-gray-900">Failed to Load Task Data</p>
        <p className="text-sm mt-1 text-forvis-gray-600">{fetchError.message}</p>
        <Button onClick={() => refetch()} className="mt-4">Retry</Button>
      </div>
    );
  }

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
          {pagination ? (
            <>
              Showing {rows.length} of {pagination.total} task{pagination.total !== 1 ? 's' : ''} 
              {pagination.totalPages > 1 && ` (page ${page} of ${pagination.totalPages})`}
            </>
          ) : (
            `${rows.length} task${rows.length !== 1 ? 's' : ''}`
          )}
        </div>
      </div>

      {/* Timeline Container - Wrapper with fixed column */}
      <div className="relative max-h-[600px] overflow-hidden">
        {/* Scrollable container */}
        <div ref={timelineContainerRef} className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <div className="min-w-full">
            {/* Header */}
            <div className="flex sticky top-0 z-20 bg-white">
              {/* Spacer for fixed column */}
              <div className="w-80 flex-shrink-0 h-14 border-b-2 border-forvis-gray-300"></div>
              {/* Timeline header */}
              <div className="flex-1">
                <TimelineHeader 
                  columns={columns} 
                  scale={scale} 
                  resources={rows.map(row => ({ 
                    userId: `task-${row.taskId}`,
                    userName: `${row.clientName} - ${row.taskName}`,
                    userEmail: '',
                    role: '',
                    allocations: row.allocations.map(alloc => ({
                      ...alloc,
                      taskName: row.taskName,
                      clientName: row.clientName,
                      clientCode: row.clientCode
                    })),
                    totalAllocatedHours: 0,
                    totalAllocatedPercentage: 0,
                    maxLanes: 1
                  }))} 
                />
              </div>
            </div>

            {/* Task Rows */}
            {rows.length === 0 ? (
              <div className="text-center py-12 text-forvis-gray-600 ml-80">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">No tasks found</p>
                <p className="text-sm mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              rows.map((row, index) => (
                <TaskRow
                  key={`task-${row.taskId}`}
                  row={row}
                  columns={columns}
                  scale={scale}
                  dateRange={dateRange}
                  onEditAllocation={canEdit ? handleEditAllocation : () => {}}
                  onUpdateDates={canEdit ? handleUpdateDates : undefined}
                  canEdit={canEdit}
                  onSelectionStart={handleSelectionStart}
                  onSelectionMove={handleSelectionMove}
                  dateSelection={dateSelection}
                  isSelecting={isSelecting}
                  rowMetadata={{
                    rowIndex: index,
                    rowHeight: row.maxLanes * 36,
                    cumulativeHeights: cumulativeHeights
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Fixed Task/Client Column Overlay */}
        <div className="absolute top-0 left-0 w-80 pointer-events-none z-30">
          {/* Sticky Header */}
          <div 
            className="h-14 px-4 flex items-center bg-white border-b-2 border-r-2 border-forvis-gray-300 pointer-events-auto sticky top-0 z-10"
          >
            <div className="text-sm font-semibold text-forvis-gray-900">Client / Task</div>
          </div>
          
          {/* Scrolling Task Rows */}
          {rows.length > 0 && (
            <div 
              className="overflow-hidden"
              style={{ 
                transform: `translateY(-${overlayScrollTop}px)`,
              }}
            >
              {rows.map((row) => (
                <div 
                  key={`overlay-task-${row.taskId}`}
                  className="px-3 py-1 bg-white border-b border-r-2 border-forvis-gray-200 border-r-forvis-gray-300 hover:bg-forvis-blue-50 transition-colors flex items-center pointer-events-auto"
                  style={{ height: `${row.maxLanes * 36}px` }}
                >
                  <div className="flex items-center w-full gap-2">
                    {/* Icon */}
                    <div 
                      className="rounded flex items-center justify-center flex-shrink-0 w-6 h-6"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Building2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    {/* Content inline */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="font-semibold text-forvis-gray-900 text-xs truncate">
                        {row.clientName} ({row.clientCode})
                      </div>
                      <div className="text-xs text-forvis-gray-600 truncate">
                        {row.taskName} ({row.taskCode})
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend and Pagination */}
      <div 
        className="px-6 py-3 border-t-2 border-forvis-gray-200 flex flex-col gap-3"
        style={{ background: 'linear-gradient(to right, #F8F9FA, #F0F7FD)' }}
      >
        {/* Legend - Service Line Roles */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' }} />
              <span className="text-forvis-gray-700">Administrator</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' }} />
              <span className="text-forvis-gray-700">Partner</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)' }} />
              <span className="text-forvis-gray-700">Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)' }} />
              <span className="text-forvis-gray-700">Supervisor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }} />
              <span className="text-forvis-gray-700">User</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)' }} />
              <span className="text-forvis-gray-700">Viewer</span>
            </div>
          </div>
          <div className="text-forvis-gray-600">
            {canEdit ? 'Click tiles to edit • Drag to adjust dates' : 'Click tiles to view details'}
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-forvis-gray-200">
            <div className="text-sm text-forvis-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} tasks
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPage(p => Math.max(1, p - 1));
                  if (timelineContainerRef.current) {
                    timelineContainerRef.current.scrollTop = 0;
                  }
                }}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2 px-3 text-sm text-forvis-gray-700">
                Page {page} of {pagination.totalPages}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPage(p => Math.min(pagination.totalPages, p + 1));
                  if (timelineContainerRef.current) {
                    timelineContainerRef.current.scrollTop = 0;
                  }
                }}
                disabled={!pagination.hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Employee Allocation Modal */}
      {modalTaskInfo && (
        <EmployeeAllocationModal
          allocation={selectedAllocation}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAllocation(null);
          }}
          onSave={handleSaveAllocation}
          onClear={handleClearAllocation}
          clientName={modalTaskInfo.clientName}
          clientCode={modalTaskInfo.clientCode}
          taskName={modalTaskInfo.taskName}
          taskCode={modalTaskInfo.taskCode}
        />
      )}

      {/* Add Employee Modal */}
      {selectedTaskForAdd && addEmployeeDates && (
        <AddEmployeeModal
          isOpen={isAddEmployeeModalOpen}
          onClose={() => {
            setIsAddEmployeeModalOpen(false);
            setSelectedTaskForAdd(null);
            setAddEmployeeDates(null);
          }}
          onSave={handleAddEmployeeSave}
          taskId={selectedTaskForAdd.taskId}
          clientName={selectedTaskForAdd.clientName}
          clientCode={selectedTaskForAdd.clientCode}
          taskName={selectedTaskForAdd.taskName}
          taskCode={selectedTaskForAdd.taskCode}
          initialStartDate={addEmployeeDates.startDate}
          initialEndDate={addEmployeeDates.endDate}
          serviceLine={serviceLine}
          subServiceLineGroup={subServiceLineGroup}
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

