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
  Briefcase
} from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';

interface PlanningListItem {
  id: number;
  clientId: number | null;
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
}

interface MyPlanningListProps {
  allocations: PlanningListItem[];
}

type SortField = 'client' | 'task' | 'startDate' | 'endDate' | 'duration' | 'role' | 'allocatedHours' | 'allocatedPercentage' | 'actualHours';
type SortDirection = 'asc' | 'desc';

export function MyPlanningList({ allocations }: MyPlanningListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingToTaskId, setNavigatingToTaskId] = useState<number | null>(null);
  const itemsPerPage = 25;

  // Filter to show only current and future allocations
  const currentAndFutureAllocations = useMemo(() => {
    const today = startOfDay(new Date());
    return allocations.filter(a => !isBefore(startOfDay(a.endDate), today));
  }, [allocations]);

  // Get unique clients for filter (from current/future allocations only)
  const uniqueClients = useMemo(() => {
    const clients = new Set(currentAndFutureAllocations.map(a => `${a.clientName}|${a.clientCode}`));
    return Array.from(clients)
      .map(c => {
        const [name, code] = c.split('|');
        return { name: name || '', code: code || '' };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentAndFutureAllocations]);

  // Filter allocations
  const filteredAllocations = useMemo(() => {
    let filtered = currentAndFutureAllocations;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.clientName.toLowerCase().includes(searchLower) ||
        a.clientCode.toLowerCase().includes(searchLower) ||
        a.taskName.toLowerCase().includes(searchLower) ||
        a.taskCode?.toLowerCase().includes(searchLower)
      );
    }

    // Role filter
    if (roleFilter) {
      filtered = filtered.filter(a => a.role === roleFilter);
    }

    // Client filter
    if (clientFilter) {
      filtered = filtered.filter(a => a.clientCode === clientFilter);
    }

    return filtered;
  }, [currentAndFutureAllocations, searchTerm, roleFilter, clientFilter]);

  // Sort allocations
  const sortedAllocations = useMemo(() => {
    const sorted = [...filteredAllocations];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'client':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'task':
          comparison = a.taskName.localeCompare(b.taskName);
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
          comparison = a.role.localeCompare(b.role);
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

  const getTaskUrl = (allocation: PlanningListItem) => {
    if (!allocation.serviceLine || !allocation.subServiceLineGroup) return null;
    
    return allocation.clientId
      ? `/dashboard/${allocation.serviceLine.toLowerCase()}/${allocation.subServiceLineGroup}/clients/${allocation.clientId}/tasks/${allocation.taskId}`
      : `/dashboard/${allocation.serviceLine.toLowerCase()}/internal/tasks/${allocation.taskId}`;
  };

  const handleRowClick = (allocation: PlanningListItem) => {
    const url = getTaskUrl(allocation);
    if (!url) return;
    
    setIsNavigating(true);
    setNavigatingToTaskId(allocation.taskId);
    router.push(url);
  };

  const handleRowHover = (allocation: PlanningListItem) => {
    const url = getTaskUrl(allocation);
    if (url) {
      // Prefetch the route for faster navigation
      router.prefetch(url);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setClientFilter('');
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 overflow-hidden relative">
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="absolute inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm font-medium text-forvis-gray-700">Loading task details...</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-4 border-b border-forvis-gray-200 space-y-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <input
              type="text"
              placeholder="Search by client, task, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent text-sm"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
          >
            <option value="">All Clients</option>
            {uniqueClients.map(client => (
              <option key={client.code} value={client.code}>
                {client.name} ({client.code})
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="REVIEWER">Reviewer</option>
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>

          {(searchTerm || roleFilter || clientFilter) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm font-medium text-forvis-blue-600 hover:text-forvis-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex justify-between items-center text-sm text-forvis-gray-600">
          <div>
            Showing <span className="font-medium">{paginatedAllocations.length}</span> of{' '}
            <span className="font-medium">{sortedAllocations.length}</span> allocations
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
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
                <td colSpan={10} className="px-4 py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-forvis-gray-400" />
                  <p className="font-semibold text-forvis-gray-900">No Allocations Found</p>
                  <p className="text-sm mt-1 text-forvis-gray-600">
                    {searchTerm || roleFilter || clientFilter
                      ? 'Try adjusting your filters'
                      : "You don't have any task allocations yet"}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedAllocations.map((allocation, index) => {
                const status = getStatusBadge(allocation.startDate, allocation.endDate);
                const duration = differenceInDays(allocation.endDate, allocation.startDate) + 1;

                return (
                  <tr
                    key={`${allocation.id}-${allocation.taskId}`}
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
                      {allocation.taskCode && (
                        <div className="text-xs text-forvis-gray-600">{allocation.taskCode}</div>
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
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex items-center justify-between">
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
