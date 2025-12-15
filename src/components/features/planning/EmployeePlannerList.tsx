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

// Flattened allocation item for employee-centric view
interface EmployeeAllocationItem {
  allocationId: number;
  userId: string;
  employeeId?: number;
  userName: string;
  userEmail: string;
  jobGradeCode?: string | null;
  officeLocation?: string | null;
  clientId?: number | null;
  clientName: string;
  clientCode: string;
  taskId: number;
  taskName: string;
  taskCode?: string;
  startDate: Date;
  endDate: Date;
  role: TaskRole;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  serviceLine?: string;
  subServiceLineGroup?: string;
  isNonClientEvent?: boolean;
  nonClientEventType?: string;
  notes?: string | null;
}

interface EmployeePlannerListProps {
  teamMembers: any[];
  serviceLine?: string;
  subServiceLineGroup?: string;
}

type SortField = 'employee' | 'client' | 'task' | 'startDate' | 'endDate' | 'duration' | 'role' | 'allocatedHours' | 'allocatedPercentage' | 'actualHours';
type SortDirection = 'asc' | 'desc';

export function EmployeePlannerList({ teamMembers, serviceLine, subServiceLineGroup }: EmployeePlannerListProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('employee');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingToTaskId, setNavigatingToTaskId] = useState<number | null>(null);
  const itemsPerPage = 25;

  // Flatten team members into allocation items
  const allAllocations = useMemo(() => {
    const items: EmployeeAllocationItem[] = [];
    
    teamMembers.forEach(member => {
      member.allocations?.forEach((allocation: any) => {
        items.push({
          allocationId: allocation.id,
          userId: member.userId,
          employeeId: member.employeeId,
          userName: member.User?.name || member.User?.email || 'Unknown',
          userEmail: member.User?.email || '',
          jobGradeCode: member.User?.jobGradeCode || null,
          officeLocation: member.User?.officeLocation || null,
          clientId: allocation.clientId,
          clientName: allocation.isNonClientEvent ? 'Internal' : (allocation.clientName || 'Unknown'),
          clientCode: allocation.isNonClientEvent ? 'INTERNAL' : (allocation.clientCode || 'N/A'),
          taskId: allocation.taskId || 0,
          taskName: allocation.taskName,
          taskCode: allocation.taskCode,
          startDate: allocation.startDate,
          endDate: allocation.endDate,
          role: allocation.role,
          allocatedHours: allocation.allocatedHours,
          allocatedPercentage: allocation.allocatedPercentage,
          actualHours: allocation.actualHours,
          serviceLine,
          subServiceLineGroup,
          isNonClientEvent: allocation.isNonClientEvent,
          nonClientEventType: allocation.nonClientEventType,
          notes: allocation.notes
        });
      });
    });
    
    return items;
  }, [teamMembers, serviceLine, subServiceLineGroup]);

  // Filter to show only current and future allocations (not past ones)
  const filteredAllocations = useMemo(() => {
    const today = startOfDay(new Date());
    return allAllocations.filter(a => !isBefore(startOfDay(a.endDate), today));
  }, [allAllocations]);

  // Sort allocations
  const sortedAllocations = useMemo(() => {
    const sorted = [...filteredAllocations];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'employee':
          comparison = (a.userName || '').localeCompare(b.userName || '');
          break;
        case 'client':
          comparison = (a.clientName || '').localeCompare(b.clientName || '');
          break;
        case 'task':
          comparison = (a.taskName || '').localeCompare(b.taskName || '');
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
  }, [filteredAllocations, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedAllocations.length / itemsPerPage);
  const paginatedAllocations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAllocations.slice(start, start + itemsPerPage);
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

    if (isBefore(today, start)) {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { label: 'Active', color: 'bg-green-100 text-green-700' };
    }
  };

  const getTaskUrl = (allocation: EmployeeAllocationItem) => {
    if (!allocation.serviceLine || !allocation.subServiceLineGroup || !allocation.taskId) return null;
    
    // Skip navigation for non-client events
    if (allocation.isNonClientEvent) return null;
    
    return allocation.clientId
      ? `/dashboard/${allocation.serviceLine.toLowerCase()}/${allocation.subServiceLineGroup}/clients/${allocation.clientId}/tasks/${allocation.taskId}`
      : `/dashboard/${allocation.serviceLine.toLowerCase()}/internal/tasks/${allocation.taskId}`;
  };

  const handleRowClick = (allocation: EmployeeAllocationItem) => {
    const url = getTaskUrl(allocation);
    if (!url) return;
    
    setIsNavigating(true);
    setNavigatingToTaskId(allocation.taskId);
    router.push(url);
  };

  const handleRowHover = (allocation: EmployeeAllocationItem) => {
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

      {/* Results Summary */}
      <div className="px-6 py-3 border-b border-forvis-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center text-sm text-forvis-gray-600">
          <div>
            Showing <span className="font-medium">{paginatedAllocations.length}</span> of{' '}
            <span className="font-medium">{sortedAllocations.length}</span> allocations
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="min-w-full divide-y divide-forvis-gray-200">
          <thead className="bg-forvis-gray-50 sticky top-0">
            <tr>
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
              <th
                onClick={() => handleSort('actualHours')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Actual Hours</span>
                  {getSortIcon('actualHours')}
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
                <td colSpan={11} className="px-4 py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-forvis-gray-400" />
                  <p className="font-semibold text-forvis-gray-900">No Allocations Found</p>
                  <p className="text-sm mt-1 text-forvis-gray-600">
                    No employee allocations available
                  </p>
                </td>
              </tr>
            ) : (
              paginatedAllocations.map((allocation, index) => {
                const status = getStatusBadge(allocation.startDate, allocation.endDate);
                const duration = differenceInDays(allocation.endDate, allocation.startDate) + 1;
                const hasTaskUrl = !!getTaskUrl(allocation);

                return (
                  <tr
                    key={`${allocation.allocationId}-${allocation.userId}`}
                    onClick={() => handleRowClick(allocation)}
                    onMouseEnter={() => handleRowHover(allocation)}
                    className={`transition-all ${
                      navigatingToTaskId === allocation.taskId
                        ? 'bg-forvis-blue-100 opacity-50'
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
