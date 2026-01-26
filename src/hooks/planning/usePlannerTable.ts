
import { useState, useMemo } from 'react';
import { differenceInDays, isBefore, startOfDay } from 'date-fns';
import { ServiceLineRole } from '@/types';

export type SortField = 'client' | 'task' | 'employee' | 'startDate' | 'endDate' | 'duration' | 'role' | 'allocatedHours' | 'allocatedPercentage' | 'actualHours';
export type SortDirection = 'asc' | 'desc';

export interface PlannerItem {
  id: string | number; // Unique key
  allocationId?: number;
  clientId?: number | null;
  clientName: string | null;
  clientCode: string | null;
  taskId?: number | null;
  taskName: string | null;
  taskCode?: string | null;
  employeeId?: number | null;
  employeeName?: string | null;
  employeeCode?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  jobGradeCode?: string | null;
  startDate: Date;
  endDate: Date;
  role: ServiceLineRole | string;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  serviceLine?: string;
  subServiceLineGroup?: string;
  isNonClientEvent?: boolean;
  nonClientEventType?: string;
}

interface UsePlannerTableOptions<T> {
  data: T[];
  initialSortField?: SortField;
  initialSortDirection?: SortDirection;
  itemsPerPage?: number;
  filterFn?: (item: T, filters: PlannerFilters) => boolean;
}

export interface PlannerFilters {
  searchTerm: string;
  role: string;
  client: string;
  task: string;
  employee: string;
  internalTask: string;
}

export function usePlannerTable<T extends PlannerItem>({
  data,
  initialSortField = 'startDate',
  initialSortDirection = 'asc',
  itemsPerPage = 25,
  filterFn
}: UsePlannerTableOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [internalTaskFilter, setInternalTaskFilter] = useState('');
  
  const [sortField, setSortField] = useState<SortField>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [currentPage, setCurrentPage] = useState(1);

  const filters: PlannerFilters = {
    searchTerm,
    role: roleFilter,
    client: clientFilter,
    task: taskFilter,
    employee: employeeFilter,
    internalTask: internalTaskFilter
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setClientFilter('');
    setTaskFilter('');
    setEmployeeFilter('');
    setInternalTaskFilter('');
    setCurrentPage(1);
  };

  // Filter
  const filteredData = useMemo(() => {
    if (!filterFn) return data;
    return data.filter(item => filterFn(item, filters));
  }, [data, searchTerm, roleFilter, clientFilter, taskFilter, employeeFilter, internalTaskFilter, filterFn]);

  // Sort
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
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
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case 'duration':
          const durationA = differenceInDays(new Date(a.endDate), new Date(a.startDate));
          const durationB = differenceInDays(new Date(b.endDate), new Date(b.startDate));
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
  }, [filteredData, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  return {
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
    paginatedData,
    sortedCount: sortedData.length
  };
}










