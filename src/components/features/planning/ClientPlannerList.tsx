'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ServiceLineRole } from '@/types';
import { LoadingSpinner } from '@/components/ui';
import { Pagination } from '@/components/shared/Pagination';
import { 
  Calendar,
  Building2,
  Briefcase,
  User
} from 'lucide-react';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { useClientPlanner } from '@/hooks/planning/useClientPlanner';
import type { TaskPlannerRow } from '@/hooks/planning/useClientPlanner';
import { useGlobalClientPlanner } from '@/hooks/planning/useGlobalClientPlanner';

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
  role: ServiceLineRole | string;
  startDate: Date;
  endDate: Date;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  serviceLine?: string;
  subServiceLineGroup?: string;
}

interface ClientPlannerListProps {
  serviceLine: string;
  subServiceLineGroup: string;
  filters: {
    clients: string[];
    groups: string[];
    partners: string[];
    tasks: string[];
    managers: string[];
    serviceLines?: string[];
    subServiceLineGroups?: string[];
  };
  isGlobalView?: boolean;
}

export function ClientPlannerList({ serviceLine, subServiceLineGroup, filters, isGlobalView = false }: ClientPlannerListProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingToTaskId, setNavigatingToTaskId] = useState<number | null>(null);
  const itemsPerPage = 25;

  // Fetch client planner data - use global hook if in global view
  const { 
    data: serviceData,
    isLoading: isLoadingService,
    error: serviceError
  } = useClientPlanner({
    serviceLine,
    subServiceLineGroup,
    clientCodes: filters.clients,
    groupDescs: filters.groups,
    partnerCodes: filters.partners,
    taskCodes: filters.tasks,
    managerCodes: filters.managers,
    page: currentPage,
    limit: itemsPerPage,
    enabled: !isGlobalView && !!serviceLine && !!subServiceLineGroup
  });

  const {
    data: globalData,
    isLoading: isLoadingGlobal,
    error: globalError
  } = useGlobalClientPlanner({
    clientCodes: filters.clients,
    groupDescs: filters.groups,
    partnerCodes: filters.partners,
    taskCodes: filters.tasks,
    managerCodes: filters.managers,
    serviceLines: filters.serviceLines || [],
    subServiceLineGroups: filters.subServiceLineGroups || [],
    page: currentPage,
    limit: itemsPerPage,
    enabled: isGlobalView
  });

  const clientPlannerData = isGlobalView ? globalData : serviceData;
  const isLoadingClientPlanner = isGlobalView ? isLoadingGlobal : isLoadingService;
  const fetchError = isGlobalView ? globalError : serviceError;

  const tasks = clientPlannerData?.tasks || [];
  const pagination = clientPlannerData?.pagination;

  // Debug logging
  console.log('[ClientPlannerList] Data received:', {
    tasksCount: tasks.length,
    filters,
    serviceLine,
    subServiceLineGroup,
    isLoading: isLoadingClientPlanner,
    hasError: !!fetchError,
    pagination,
    firstTaskSample: tasks[0] ? {
      taskId: tasks[0].taskId,
      clientName: tasks[0].clientName,
      allocationsCount: tasks[0].allocations?.length || 0,
      allocations: tasks[0].allocations
    } : null
  });

  // Flatten tasks into allocation items (server already filtered and paginated)
  const allAllocations = useMemo(() => {
    const items: ClientTaskAllocationItem[] = [];
    
    if (!tasks || tasks.length === 0) {
      console.log('[ClientPlannerList] No tasks to process');
      return items;
    }
    
    console.log('[ClientPlannerList] Processing tasks:', tasks.length);
    
    tasks.forEach(task => {
      // Skip tasks without allocations (API returns all tasks for planning purposes)
      if (!task.allocations || task.allocations.length === 0) {
        console.log('[ClientPlannerList] Skipping task without allocations:', task.taskCode);
        return;
      }
      
      console.log('[ClientPlannerList] Processing task with allocations:', task.taskCode, task.allocations.length);
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
          serviceLine: (task as any).serviceLine || serviceLine,
          subServiceLineGroup: (task as any).subServiceLineGroup || subServiceLineGroup
        });
      });
    });
    
    return items;
  }, [tasks, serviceLine, subServiceLineGroup]);

  // Filter to show only client tasks (no internal tasks) - already done by server
  const paginatedAllocations = useMemo(() => {
    return allAllocations.filter(a => 
      a.clientId !== null && 
      a.clientId !== 0
    );
  }, [allAllocations]);

  // Pagination metadata from server
  const totalPages = pagination?.totalPages || 1;

  // Server-side sorting (default: client name, then task name)
  // Sort icons removed - sorting is handled by server

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'PARTNER':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'SUPERVISOR':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'USER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
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

  // Loading state
  if (isLoadingClientPlanner) {
    return (
      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-forvis-gray-600">Loading client planner data...</p>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <p className="font-semibold text-forvis-gray-900">Failed to Load Data</p>
        <p className="text-sm mt-1 text-forvis-gray-600">{fetchError.message}</p>
      </div>
    );
  }

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
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Client</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>Task</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Employee</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Start Date</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>End Date</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Duration</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Role</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Allocated Hours</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Allocated %</span>
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
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex-shrink-0">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

