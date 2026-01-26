
'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Calendar,
  Building2,
  Briefcase,
  User,
  Search
} from 'lucide-react';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { LoadingSpinner } from '@/components/ui';
import { ServiceLineRole } from '@/types';
import { PlannerItem, SortField, SortDirection, PlannerFilters } from '@/hooks/planning/usePlannerTable';

interface PlannerTableProps<T extends PlannerItem> {
  data: T[];
  isLoading?: boolean;
  
  // State from hook
  filters: PlannerFilters;
  setSearchTerm: (val: string) => void;
  setRoleFilter: (val: string) => void;
  setClientFilter: (val: string) => void;
  setTaskFilter: (val: string) => void;
  setEmployeeFilter: (val: string) => void;
  setInternalTaskFilter: (val: string) => void;
  clearFilters: () => void;
  
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  
  // Options
  showEmployeeColumn?: boolean;
  showClientColumn?: boolean;
  showStatusColumn?: boolean;
  
  // Filter Options
  uniqueClients?: { name: string; code: string }[];
  uniqueTasks?: { name: string; code: string }[];
  uniqueEmployees?: { name: string; code: string }[];
  uniqueInternalTasks?: string[];
  
  // Callbacks
  onRowClick?: (item: T) => void;
  onRowHover?: (item: T) => void;
}

export function PlannerTable<T extends PlannerItem>({
  data,
  isLoading,
  filters,
  setSearchTerm,
  setRoleFilter,
  setClientFilter,
  setTaskFilter,
  setEmployeeFilter,
  setInternalTaskFilter,
  clearFilters,
  sortField,
  sortDirection,
  handleSort,
  currentPage,
  setCurrentPage,
  totalPages,
  showEmployeeColumn = true,
  showClientColumn = true,
  showStatusColumn = true,
  uniqueClients = [],
  uniqueTasks = [],
  uniqueEmployees = [],
  uniqueInternalTasks = [],
  onRowClick,
  onRowHover
}: PlannerTableProps<T>) {

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-forvis-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-forvis-blue-600" />
      : <ArrowDown className="w-4 h-4 text-forvis-blue-600" />;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR': return 'bg-red-100 text-red-800 border-red-300';
      case 'PARTNER': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MANAGER': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'SUPERVISOR': return 'bg-green-100 text-green-800 border-green-300';
      case 'USER': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'VIEWER': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBadge = (startDate: Date, endDate: Date) => {
    const today = startOfDay(new Date());
    const start = startOfDay(new Date(startDate));
    const end = startOfDay(new Date(endDate));

    if (isBefore(end, today)) {
      return { label: 'Completed', color: 'bg-gray-100 text-gray-700' };
    } else if (isBefore(today, start)) {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { label: 'Active', color: 'bg-green-100 text-green-700' };
    }
  };

  const hasActiveFilters = filters.searchTerm || filters.role || filters.client || filters.task || filters.employee || filters.internalTask;

  return (
    <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 overflow-hidden relative flex flex-col max-h-[calc(100vh-280px)]">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm font-medium text-forvis-gray-700">Loading...</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-4 border-b border-forvis-gray-200 space-y-4 flex-shrink-0">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={filters.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent text-sm"
            />
          </div>

          {showClientColumn && uniqueClients.length > 0 && (
            <select
              value={filters.client}
              onChange={(e) => setClientFilter(e.target.value)}
              className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
            >
              <option value="">All Clients</option>
              {uniqueClients.map(client => (
                <option key={client.code} value={client.code}>
                  {client.name} ({client.code})
                </option>
              ))}
            </select>
          )}

          {uniqueTasks.length > 0 && (
            <select
              value={filters.task}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
            >
              <option value="">All Tasks</option>
              {uniqueTasks.map(task => (
                <option key={`${task.name}-${task.code}`} value={task.code}>
                  {task.name} {task.code && task.code !== task.name ? `(${task.code})` : ''}
                </option>
              ))}
            </select>
          )}

          {uniqueInternalTasks.length > 0 && (
             <select
              value={filters.internalTask}
              onChange={(e) => setInternalTaskFilter(e.target.value)}
              className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
            >
              <option value="">All Internal Tasks</option>
              {uniqueInternalTasks.map(task => (
                <option key={task} value={task}>{task}</option>
              ))}
            </select>
          )}

          {showEmployeeColumn && uniqueEmployees.length > 0 && (
            <select
              value={filters.employee}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
            >
              <option value="">All Employees</option>
              {uniqueEmployees.map(emp => (
                <option key={emp.code || emp.name} value={emp.code}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={filters.role}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="REVIEWER">Reviewer</option>
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm font-medium text-forvis-blue-600 hover:text-forvis-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="min-w-full divide-y divide-forvis-gray-200">
          <thead className="bg-forvis-gray-50 sticky top-0 z-10">
            <tr>
              {showEmployeeColumn && (
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
              )}
              {showClientColumn && (
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
              )}
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
                  <span>Hours</span>
                  {getSortIcon('allocatedHours')}
                </div>
              </th>
              <th
                onClick={() => handleSort('allocatedPercentage')}
                className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider cursor-pointer hover:bg-forvis-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>%</span>
                  {getSortIcon('allocatedPercentage')}
                </div>
              </th>
              {showStatusColumn && (
                <th className="px-4 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                  Status
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-forvis-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-forvis-gray-400" />
                  <p className="font-semibold text-forvis-gray-900">No Allocations Found</p>
                  <p className="text-sm mt-1 text-forvis-gray-600">
                    {hasActiveFilters ? 'Try adjusting your filters' : 'No allocations available'}
                  </p>
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const status = getStatusBadge(item.startDate, item.endDate);
                const duration = differenceInDays(new Date(item.endDate), new Date(item.startDate)) + 1;
                const isClickable = !!onRowClick && (!item.isNonClientEvent);

                return (
                  <tr
                    key={item.id}
                    onClick={() => isClickable && onRowClick?.(item)}
                    onMouseEnter={() => onRowHover?.(item)}
                    className={`transition-all ${
                      index % 2 === 0 
                        ? `bg-white ${isClickable ? 'hover:bg-forvis-blue-50 cursor-pointer' : ''}` 
                        : `bg-forvis-gray-50 ${isClickable ? 'hover:bg-forvis-blue-50 cursor-pointer' : ''}`
                    }`}
                  >
                    {showEmployeeColumn && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-forvis-gray-900">
                          {item.employeeName || 'Unknown'}
                        </div>
                        {item.jobGradeCode && (
                          <div className="text-xs text-forvis-gray-600">{item.jobGradeCode}</div>
                        )}
                      </td>
                    )}
                    {showClientColumn && (
                      <td className="px-4 py-3 whitespace-nowrap">
                         <div className={`text-sm font-medium ${item.isNonClientEvent ? 'text-forvis-gray-600 italic' : 'text-forvis-gray-900'}`}>
                          {item.clientName || 'N/A'}
                        </div>
                        {!item.isNonClientEvent && item.clientCode && (
                          <div className="text-xs text-forvis-gray-600">{item.clientCode}</div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-forvis-blue-600">
                        {item.taskName || 'Untitled'}
                      </div>
                      {!item.isNonClientEvent && item.taskCode && (
                        <div className="text-xs text-forvis-gray-600">{item.taskCode}</div>
                      )}
                      {item.isNonClientEvent && (
                        <div className="text-xs text-forvis-gray-600 italic">Non-client event</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {format(new Date(item.startDate), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {format(new Date(item.endDate), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {duration} {duration === 1 ? 'day' : 'days'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadgeColor(item.role)}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {item.allocatedHours?.toFixed(1) || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-forvis-gray-900">
                      {item.allocatedPercentage ? `${item.allocatedPercentage}%` : '-'}
                    </td>
                    {showStatusColumn && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                    )}
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










