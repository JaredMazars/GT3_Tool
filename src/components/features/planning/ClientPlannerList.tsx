'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TaskRole } from '@/types';
import { LoadingSpinner } from '@/components/ui';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Calendar,
  Building2,
  Briefcase,
  User
} from 'lucide-react';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import type { TaskPlannerRow } from '@/hooks/planning/useClientPlanner';

// Flattened allocation item for client/task-centric view
interface ClientTaskAllocationItem {
  allocationId: number;
  clientId: number;
  clientName: string;
  clientCode: string;
  groupDesc: string | null;
  clientPartner: string | null;
  taskId: number;
  taskName: string;
  taskCode: string;
  taskManager: string;
  taskManagerName: string;
  taskPartner: string;
  taskPartnerName: string;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string | null;
  jobGradeCode: string | null;
  officeLocation: string | null;
  userId: string;
  role: TaskRole;
  startDate: Date;
  endDate: Date;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  serviceLine?: string;
  subServiceLineGroup?: string;
}

interface ClientPlannerListProps {
  tasks: TaskPlannerRow[];
  serviceLine?: string;
  subServiceLineGroup?: string;
}

type SortField = 'client' | 'task' | 'employee' | 'startDate' | 'endDate' | 'duration' | 'role' | 'allocatedHours' | 'allocatedPercentage' | 'actualHours';
type SortDirection = 'asc' | 'desc';

export function ClientPlannerList({ tasks, serviceLine, subServiceLineGroup }: ClientPlannerListProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('client');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingToTaskId, setNavigatingToTaskId] = useState<number | null>(null);
  const itemsPerPage = 25;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ClientPlannerList.tsx:73',message:'Component render - tasks prop',data:{tasksCount:tasks?.length || 0,tasksIsArray:Array.isArray(tasks),firstTaskSample:tasks?.[0] ? {taskId:tasks[0].taskId,clientId:tasks[0].clientId,clientName:tasks[0].clientName,allocationsCount:tasks[0].allocations?.length || 0} : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Flatten tasks into allocation items
  const allAllocations = useMemo(() => {
    const items: ClientTaskAllocationItem[] = [];
    
    if (!tasks || tasks.length === 0) {
      return items;
    }
    
    tasks.forEach(task => {
      // Skip tasks without allocations (API returns all tasks for planning purposes)
      if (!task.allocations || task.allocations.length === 0) {
        return;
      }
      task.allocations.forEach((allocation) => {
        items.push({
          allocationId: allocation.id,
          clientId: task.clientId,
          clientName: task.clientName,
          clientCode: task.clientCode,
          groupDesc: task.groupDesc,
          clientPartner: task.clientPartner,
          taskId: task.taskId,
          taskName: task.taskName,
          taskCode: task.taskCode,
          taskManager: task.taskManager,
          taskManagerName: task.taskManagerName,
          taskPartner: task.taskPartner,
          taskPartnerName: task.taskPartnerName,
          employeeId: allocation.employeeId,
          employeeName: allocation.employeeName,
          employeeCode: allocation.employeeCode,
          jobGradeCode: allocation.jobGradeCode,
          officeLocation: allocation.officeLocation,
          userId: allocation.userId,
          role: allocation.role,
          startDate: allocation.startDate,
          endDate: allocation.endDate,
          allocatedHours: allocation.allocatedHours,
          allocatedPercentage: allocation.allocatedPercentage,
          actualHours: allocation.actualHours,
          serviceLine,
          subServiceLineGroup
        });
      });
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ClientPlannerList.tsx:121',message:'After allAllocations transform',data:{allAllocationsCount:items.length,firstAllocation:items[0] ? {clientId:items[0].clientId,clientName:items[0].clientName,taskId:items[0].taskId,employeeName:items[0].employeeName} : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    return items;
  }, [tasks, serviceLine, subServiceLineGroup]);

  // Filter to show only client tasks (no internal tasks)
  const clientAllocations = useMemo(() => {
    const filtered = allAllocations.filter(a => 
      a.clientId !== null && 
      a.clientId !== 0
    );
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ClientPlannerList.tsx:131',message:'After clientAllocations filter',data:{beforeFilterCount:allAllocations.length,afterFilterCount:filtered.length,filteredOutCount:allAllocations.length - filtered.length,sampleFiltered:allAllocations.slice(0,3).map(a=>({clientId:a.clientId,clientName:a.clientName,passedFilter:a.clientId !== null && a.clientId !== 0}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return filtered;
  }, [allAllocations]);

  // Sort allocations
  const sortedAllocations = useMemo(() => {
    const sorted = [...clientAllocations];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'client':
          comparison = (a.clientName || '').localeCompare(b.clientName || '');
          break;
        case 'task':
          comparison = (a.taskName || '').localeCompare(b.taskName || '');
          break;
        case 'employee':
          comparison = (a.employeeName || '').localeCompare(b.employeeName || '');
          break;
        case 'startDate':
          comparison = a.startDate.getTime() - b.startDate.getTime();
          break;
        case 'endDate':
          comparison = a.endDate.getTime() - b.endDate.getTime();
          break;
        case 'duration':
          const durationA = differenceInDays(a.endDate, a.startDate) + 1;
          const durationB = differenceInDays(b.endDate, b.startDate) + 1;
          comparison = durationA - durationB;
          break;
        case 'role':
          comparison = (a.role || '').localeCompare(b.role || '');
          break;
        case 'allocatedHours':
          comparison = (a.allocatedHours || 0) - (b.allocatedHours || 0);
          break;
        case 'allocatedPercentage':
          comparison = (a.allocatedPercentage || 0) - (b.allocatedPercentage || 0);
          break;
        case 'actualHours':
          comparison = (a.actualHours || 0) - (b.actualHours || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [clientAllocations, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedAllocations.length / itemsPerPage);
  const paginatedAllocations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = sortedAllocations.slice(start, start + itemsPerPage);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ClientPlannerList.tsx:271',message:'After pagination',data:{sortedAllocationsCount:sortedAllocations.length,paginatedCount:paginated.length,currentPage,itemsPerPage,totalPages:Math.ceil(sortedAllocations.length / itemsPerPage),start},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return paginated;
  }, [sortedAllocations, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-forvis-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-forvis-blue-600" />
      : <ArrowDown className="w-4 h-4 text-forvis-blue-600" />;
  };

  const getRoleBadgeColor = (role: TaskRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'REVIEWER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'EDITOR':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBadge = (startDate: Date, endDate: Date) => {
    const today = startOfDay(new Date());
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);

    if (isBefore(end, today)) {
      return { label: 'Completed', color: 'bg-gray-100 text-gray-700' };
    } else if (isBefore(today, start)) {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { label: 'Active', color: 'bg-green-100 text-green-700' };
    }
  };

  const getTaskUrl = (allocation: ClientTaskAllocationItem) => {
    if (!allocation.serviceLine || !allocation.subServiceLineGroup || !allocation.taskId) return null;
    
    return allocation.clientId
      ? `/dashboard/${allocation.serviceLine.toLowerCase()}/${allocation.subServiceLineGroup}/clients/${allocation.clientId}/tasks/${allocation.taskId}`
      : `/dashboard/${allocation.serviceLine.toLowerCase()}/internal/tasks/${allocation.taskId}`;
  };

  const handleRowClick = (allocation: ClientTaskAllocationItem) => {
    const url = getTaskUrl(allocation);
    if (!url) return;
    
    setIsNavigating(true);
    setNavigatingToTaskId(allocation.taskId);
    router.push(url);
  };

  const handleRowHover = (allocation: ClientTaskAllocationItem) => {
    const url = getTaskUrl(allocation);
    if (url) {
      router.prefetch(url);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 overflow-hidden relative flex flex-col max-h-[calc(100vh-280px)]">
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="absolute inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm font-medium text-forvis-gray-700">Loading task details...</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="min-w-full divide-y divide-forvis-gray-200">
          <thead className="bg-forvis-gray-50 sticky top-0">
            <tr>
              <th
                onClick={() => handleSort('client')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Client</span>
                  {getSortIcon('client')}
                </div>
              </th>
              <th
                onClick={() => handleSort('task')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>Task</span>
                  {getSortIcon('task')}
                </div>
              </th>
              <th
                onClick={() => handleSort('employee')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Employee</span>
                  {getSortIcon('employee')}
                </div>
              </th>
              <th
                onClick={() => handleSort('startDate')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Start Date</span>
                  {getSortIcon('startDate')}
                </div>
              </th>
              <th
                onClick={() => handleSort('endDate')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>End Date</span>
                  {getSortIcon('endDate')}
                </div>
              </th>
              <th
                onClick={() => handleSort('duration')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Duration</span>
                  {getSortIcon('duration')}
                </div>
              </th>
              <th
                onClick={() => handleSort('role')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Role</span>
                  {getSortIcon('role')}
                </div>
              </th>
              <th
                onClick={() => handleSort('allocatedHours')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Allocated Hours</span>
                  {getSortIcon('allocatedHours')}
                </div>
              </th>
              <th
                onClick={() => handleSort('allocatedPercentage')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Allocated %</span>
                  {getSortIcon('allocatedPercentage')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-forvis-gray-200">
            {paginatedAllocations.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-forvis-gray-400" />
                  <p className="font-semibold text-forvis-gray-900">No Allocations Found</p>
                  <p className="text-sm mt-1 text-forvis-gray-600">
                    {tasks.length === 0 
                      ? 'No tasks with allocations available. Tasks need employee allocations to appear in the client planner list.'
                      : 'No client-based allocations found'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedAllocations.map((allocation, index) => {
                const status = getStatusBadge(allocation.startDate, allocation.endDate);
                const duration = differenceInDays(allocation.endDate, allocation.startDate) + 1;

                return (
                  <tr
                    key={`${allocation.allocationId}-${allocation.taskId}`}
                    onClick={() => handleRowClick(allocation)}
                    onMouseEnter={() => handleRowHover(allocation)}
                    className={`cursor-pointer transition-all ${
                      navigatingToTaskId === allocation.taskId
                        ? 'bg-forvis-blue-100 opacity-50'
                        : index % 2 === 0 
                          ? 'bg-white hover:bg-forvis-blue-50' 
                          : 'bg-forvis-gray-50 hover:bg-forvis-blue-50'
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-forvis-gray-900">
                        {allocation.clientName}
                      </div>
                      <div className="text-xs text-forvis-gray-600">{allocation.clientCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-forvis-blue-600">
                        {allocation.taskName}
                      </div>
                      <div className="text-xs text-forvis-gray-600">{allocation.taskCode}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-forvis-gray-900">
                        {allocation.employeeName}
                      </div>
                      {allocation.jobGradeCode && (
                        <div className="text-xs text-forvis-gray-600">{allocation.jobGradeCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {format(allocation.startDate, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {format(allocation.endDate, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {duration} {duration === 1 ? 'day' : 'days'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadgeColor(allocation.role)}`}>
                        {allocation.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {allocation.allocatedHours?.toFixed(1) || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {allocation.allocatedPercentage ? `${allocation.allocatedPercentage}%` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-forvis-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

