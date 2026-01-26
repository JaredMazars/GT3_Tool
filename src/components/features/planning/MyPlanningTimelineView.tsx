'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { TimeScale, ResourceData, AllocationData, DateSelection } from '../tasks/TeamPlanner/types';
import { TimelineHeader } from '../tasks/TeamPlanner/TimelineHeader';
import { ResourceRow } from '../tasks/TeamPlanner/ResourceRow';
import { getDateRange, generateTimelineColumns, getColumnWidth, assignLanes, calculateMaxLanes } from '../tasks/TeamPlanner/utils';
import { memoizedCalculateTotalHours, memoizedCalculateTotalPercentage } from '../tasks/TeamPlanner/optimizations';
import { Calendar, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfDay, format, isSameDay, addDays, addWeeks } from 'date-fns';
import { MyPlanningFiltersType } from './MyPlanningFilters';

interface ClientAllocationData {
  clientId: number | null;
  clientName: string;
  clientCode: string;
  allocations: any[];
}

interface MyPlanningTimelineViewProps {
  clientsData: ClientAllocationData[];
  filters: MyPlanningFiltersType;
}

export function MyPlanningTimelineView({ clientsData, filters }: MyPlanningTimelineViewProps) {
  const [scale, setScale] = useState<TimeScale>('week');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [scrollToToday, setScrollToToday] = useState(false);
  const [overlayScrollTop, setOverlayScrollTop] = useState(0);
  
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Sync overlay scroll with timeline scroll
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setOverlayScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Filter clients based on filters
  const filteredClients = useMemo(() => {
    let result = clientsData;

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(client =>
        client.clientName.toLowerCase().includes(searchLower) ||
        client.clientCode.toLowerCase().includes(searchLower)
      );
    }

    // Client filter
    if (filters.clients.length > 0) {
      result = result.filter(client =>
        filters.clients.includes(client.clientCode)
      );
    }

    // Task filter - filter clients that have allocations for selected tasks
    if (filters.tasks.length > 0) {
      result = result.filter(client =>
        client.allocations.some((alloc: any) => {
          const taskKey = alloc.taskCode || alloc.taskName;
          return taskKey && filters.tasks.includes(taskKey);
        })
      );
    }

    // Role filter - filter clients that have allocations with selected roles
    if (filters.roles.length > 0) {
      result = result.filter(client =>
        client.allocations.some((alloc: any) =>
          filters.roles.includes(alloc.role)
        )
      );
    }

    return result;
  }, [clientsData, filters]);

  // Calculate cumulative row heights
  const cumulativeHeights = useMemo(() => {
    const heights: number[] = [];
    let cumulative = 0;
    
    filteredClients.forEach((client) => {
      const allocations: AllocationData[] = client.allocations.map((alloc: any) => ({
        ...alloc,
        startDate: startOfDay(new Date(alloc.startDate)),
        endDate: startOfDay(new Date(alloc.endDate))
      }));

      const allocationsWithLanes = assignLanes(allocations);
      const maxLanes = calculateMaxLanes(allocationsWithLanes);
      const rowHeight = maxLanes * 36; // LANE_HEIGHT = 36px
      
      cumulative += rowHeight;
      heights.push(cumulative);
    });
    
    return heights;
  }, [filteredClients]);

  // Transform clients to resource data format
  const resources: ResourceData[] = useMemo(() => {
    return filteredClients.map(client => {
      const allocations: AllocationData[] = client.allocations.map((alloc: any) => ({
        ...alloc,
        startDate: startOfDay(new Date(alloc.startDate)),
        endDate: startOfDay(new Date(alloc.endDate))
      }));

      const allocationsWithLanes = assignLanes(allocations);
      const maxLanes = calculateMaxLanes(allocationsWithLanes);

      return {
        userId: `client-${client.clientId}`, // Fake userId for compatibility
        userName: `${client.clientName} (${client.clientCode})`, // Display name with code
        userEmail: client.clientCode,
        userImage: null,
        jobTitle: null,
        officeLocation: null,
        role: '', // Not applicable for clients
        allocations: allocationsWithLanes,
        totalAllocatedHours: memoizedCalculateTotalHours(allocationsWithLanes),
        totalAllocatedPercentage: memoizedCalculateTotalPercentage(allocationsWithLanes),
        maxLanes
      };
    });
  }, [filteredClients]);

  // Scroll to today when requested
  useEffect(() => {
    if (scrollToToday && timelineContainerRef.current && columns.length > 0) {
      const today = startOfDay(new Date());
      const todayColumnIndex = columns.findIndex(col => 
        isSameDay(startOfDay(col.date), today)
      );
      
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
          {resources.length} {resources.length === 1 ? 'client' : 'clients'}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative max-h-[600px] overflow-hidden">
        {/* Scrollable container */}
        <div ref={timelineContainerRef} className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <div className="min-w-full">
            {/* Header */}
            <div className="flex sticky top-0 z-20 bg-white">
              {/* Spacer for fixed column */}
              <div className="w-64 flex-shrink-0 h-14 border-b-2 border-forvis-gray-300"></div>
              {/* Timeline header */}
              <div className="flex-1">
                <TimelineHeader columns={columns} scale={scale} resources={resources} />
              </div>
            </div>

          {/* Resource Rows */}
          {resources.length === 0 ? (
            <div className="text-center py-12 text-forvis-gray-600">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">{(filters.search || filters.clients.length > 0 || filters.tasks.length > 0 || filters.roles.length > 0) ? 'No Matching Allocations' : 'No Allocations'}</p>
              <p className="text-sm mt-1">
                {(filters.search || filters.clients.length > 0 || filters.tasks.length > 0 || filters.roles.length > 0) ? 'No allocations match your filters' : "You don't have any task allocations yet"}
              </p>
            </div>
          ) : (
            resources.map((resource, index) => (
              <ResourceRow
                key={resource.userId}
                resource={resource}
                columns={columns}
                scale={scale}
                dateRange={dateRange}
                onEditAllocation={() => {}} // Read-only
                onUpdateDates={undefined} // No drag/drop
                onRemoveMember={undefined} // No remove
                canEdit={false} // Read-only mode
                onSelectionStart={() => {}} // No selection
                onSelectionMove={() => {}} // No selection
                dateSelection={null}
                isSelecting={false}
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

        {/* Fixed Client Column Overlay */}
        <div className="absolute top-0 left-0 w-64 pointer-events-none z-30">
          {/* Sticky Header */}
          <div 
            className="h-14 px-4 flex items-center bg-white border-b-2 border-r-2 border-forvis-gray-300 pointer-events-auto sticky top-0 z-10"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-forvis-gray-600" />
              <span className="text-sm font-semibold text-forvis-gray-900">Client</span>
            </div>
          </div>
          
          {/* Scrolling Client Rows */}
          {resources.length > 0 && (
            <div 
              className="overflow-hidden"
              style={{ 
                transform: `translateY(-${overlayScrollTop}px)`,
              }}
            >
              {resources.map((resource) => (
                <div 
                  key={resource.userId}
                  className="px-3 py-1 bg-white border-b border-r-2 border-forvis-gray-200 border-r-forvis-gray-300 hover:bg-forvis-blue-50 transition-colors flex items-center pointer-events-auto"
                  style={{ height: `${resource.maxLanes * 36}px` }}
                >
                  <div className="flex items-center w-full gap-2">
                    <div 
                      className="rounded-full flex items-center justify-center text-white font-bold shadow-corporate flex-shrink-0 w-8 h-8 text-xs"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-forvis-gray-900 text-xs truncate">
                        {resource.userName?.split('(')[0]?.trim() || resource.userName}
                      </div>
                      <div className="text-[10px] text-forvis-gray-600 truncate">
                        {resource.userEmail}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          Read-only view of your task allocations
        </div>
      </div>
    </div>
  );
}
