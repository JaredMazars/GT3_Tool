'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { 
  Calendar,
  Building2,
  Briefcase,
  User
} from 'lucide-react';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { useEmployeePlanner, type EmployeeAllocationData } from '@/hooks/planning/useEmployeePlanner';
import { useGlobalEmployeePlanner, type GlobalEmployeeAllocationData } from '@/hooks/planning/useGlobalEmployeePlanner';

interface EmployeePlannerListProps {
  serviceLine: string;
  subServiceLineGroup: string;
  filters: {
    employees: string[];
    jobGrades: string[];
    offices: string[];
    clients: string[];
    taskCategories: string[];
    serviceLines?: string[];
    subServiceLineGroups?: string[];
  };
  isGlobalView?: boolean;
}

export function EmployeePlannerList({ serviceLine, subServiceLineGroup, filters, isGlobalView = false }: EmployeePlannerListProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingToTaskId, setNavigatingToTaskId] = useState<number | null>(null);
  const itemsPerPage = 50;

  // Fetch employee planner data - use global hook if in global view
  const { 
    data: servicePlannerData,
    isLoading: isLoadingServicePlanner,
    error: serviceError
  } = useEmployeePlanner({
    serviceLine,
    subServiceLineGroup,
    employees: filters.employees,
    jobGrades: filters.jobGrades,
    offices: filters.offices,
    clients: filters.clients,
    taskCategories: filters.taskCategories,
    page: currentPage,
    limit: itemsPerPage,
    enabled: !isGlobalView && !!serviceLine && !!subServiceLineGroup
  });

  const {
    data: globalPlannerData,
    isLoading: isLoadingGlobalPlanner,
    error: globalError
  } = useGlobalEmployeePlanner({
    employees: filters.employees,
    jobGrades: filters.jobGrades,
    offices: filters.offices,
    clients: filters.clients,
    taskCategories: filters.taskCategories,
    serviceLines: filters.serviceLines || [],
    subServiceLineGroups: filters.subServiceLineGroups || [],
    page: currentPage,
    limit: itemsPerPage,
    enabled: isGlobalView
  });

  const employeePlannerData = isGlobalView ? globalPlannerData : servicePlannerData;
  const isLoadingEmployeePlanner = isGlobalView ? isLoadingGlobalPlanner : isLoadingServicePlanner;
  const fetchError = isGlobalView ? globalError : serviceError;

  const allocations = (employeePlannerData?.allocations || []) as (EmployeeAllocationData | GlobalEmployeeAllocationData)[];
  const pagination = employeePlannerData?.pagination;

  // Pagination metadata from server
  const totalPages = pagination?.totalPages || 1;

  // Server-side sorting (default: employee name, then start date)
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

    if (isBefore(today, start)) {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { label: 'Active', color: 'bg-green-100 text-green-700' };
    }
  };

  const getTaskUrl = (allocation: EmployeeAllocationData | GlobalEmployeeAllocationData) => {
    if (!allocation.taskId) return null;
    
    // Skip navigation for non-client events
    if (allocation.isNonClientEvent) return null;
    
    // For global view, use the allocation's service line info if available
    const allocServiceLine = (allocation as GlobalEmployeeAllocationData).serviceLine || serviceLine;
    const allocSubGroup = (allocation as GlobalEmployeeAllocationData).subServiceLineGroup || subServiceLineGroup;
    
    if (!allocServiceLine) return null;
    
    return allocation.clientId && allocSubGroup
      ? `/dashboard/${allocServiceLine.toLowerCase()}/${allocSubGroup}/clients/${allocation.clientId}/tasks/${allocation.taskId}`
      : `/dashboard/${allocServiceLine.toLowerCase()}/internal/tasks/${allocation.taskId}`;
  };

  const handleRowClick = (allocation: EmployeeAllocationData | GlobalEmployeeAllocationData) => {
    const url = getTaskUrl(allocation);
    if (!url) return;
    
    setIsNavigating(true);
    setNavigatingToTaskId(allocation.taskId);
    router.push(url);
  };

  const handleRowHover = (allocation: EmployeeAllocationData | GlobalEmployeeAllocationData) => {
    const url = getTaskUrl(allocation);
    if (url) {
      router.prefetch(url);
    }
  };

  // Loading state
  if (isLoadingEmployeePlanner) {
    return (
      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-forvis-gray-600">Loading employee planner data...</p>
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

      {/* Results Summary */}
      <div className="px-6 py-3 border-b border-forvis-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center text-sm text-forvis-gray-600">
          <div>
            Showing <span className="font-medium">{allocations.length}</span> of{' '}
            <span className="font-medium">{pagination?.total || 0}</span> allocations
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="min-w-full divide-y divide-forvis-gray-200">
          <thead className="bg-forvis-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Employee</span>
                </div>
              </th>
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
                <div className="flex items-center gap-2">
                  <span>Actual Hours</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-forvis-gray-200">
            {allocations.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-forvis-gray-400" />
                  <p className="font-semibold text-forvis-gray-900">No Allocations Found</p>
                  <p className="text-sm mt-1 text-forvis-gray-600">
                    No employee allocations available
                  </p>
                </td>
              </tr>
            ) : (
              allocations.map((allocation, index) => {
                const status = getStatusBadge(allocation.startDate, allocation.endDate);
                const duration = differenceInDays(allocation.endDate, allocation.startDate) + 1;
                const hasTaskUrl = !!getTaskUrl(allocation);
                const isOtherServiceLine = (allocation as GlobalEmployeeAllocationData).isCurrentTask === false;

                return (
                  <tr
                    key={`${allocation.allocationId}-${allocation.userId}`}
                    onClick={() => handleRowClick(allocation)}
                    onMouseEnter={() => handleRowHover(allocation)}
                    className={`transition-all ${
                      navigatingToTaskId === allocation.taskId
                        ? 'bg-forvis-blue-100 opacity-50'
                        : isOtherServiceLine
                          ? 'bg-gray-100 text-gray-500 opacity-70'
                          : index % 2 === 0 
                            ? `bg-white ${hasTaskUrl ? 'hover:bg-forvis-blue-50 cursor-pointer' : ''}` 
                            : `bg-forvis-gray-50 ${hasTaskUrl ? 'hover:bg-forvis-blue-50 cursor-pointer' : ''}`
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-forvis-gray-900">
                        {allocation.userName}
                      </div>
                      <div className="text-xs text-forvis-gray-600">{allocation.userEmail}</div>
                      {allocation.jobGradeCode && (
                        <div className="text-xs text-forvis-gray-500">{allocation.jobGradeCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm font-medium ${allocation.isNonClientEvent ? 'text-forvis-gray-600 italic' : 'text-forvis-gray-900'}`}>
                        {allocation.clientName}
                      </div>
                      {!allocation.isNonClientEvent && (
                        <div className="text-xs text-forvis-gray-600">{allocation.clientCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-forvis-blue-600">
                        {allocation.taskName}
                      </div>
                      {!allocation.isNonClientEvent && allocation.taskCode && (
                        <div className="text-xs text-forvis-gray-600">{allocation.taskCode}</div>
                      )}
                      {allocation.isNonClientEvent && (
                        <div className="text-xs text-forvis-gray-600 italic">Non-client event</div>
                      )}
                      {isGlobalView && 'serviceLine' in allocation && allocation.serviceLine && (
                        <div className="text-xs text-gray-500 mt-1">
                          [{allocation.serviceLine}]
                        </div>
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {allocation.actualHours?.toFixed(1) || '-'}
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
