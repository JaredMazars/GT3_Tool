'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isBefore, startOfDay } from 'date-fns';
import { ServiceLineRole } from '@/types';
import { PlannerTable } from './PlannerTable';
import { usePlannerTable, PlannerItem, PlannerFilters } from '@/hooks/planning/usePlannerTable';
import { MyPlanningFiltersType } from './MyPlanningFilters';

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
  role: ServiceLineRole | string;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  serviceLine?: string;
  subServiceLineGroup?: string;
}

interface MyPlanningListProps {
  allocations: PlanningListItem[];
  filters: MyPlanningFiltersType;
}

export function MyPlanningList({ allocations, filters }: MyPlanningListProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Transform to PlannerItems
  const data = useMemo<PlannerItem[]>(() => {
    return allocations.map(item => ({
      id: `${item.id}-${item.taskId}`,
      allocationId: item.id,
      clientId: item.clientId,
      clientName: item.clientName,
      clientCode: item.clientCode,
      taskId: item.taskId,
      taskName: item.taskName,
      taskCode: item.taskCode,
      startDate: item.startDate,
      endDate: item.endDate,
      role: item.role,
      allocatedHours: item.allocatedHours,
      allocatedPercentage: item.allocatedPercentage,
      actualHours: item.actualHours,
      serviceLine: item.serviceLine,
      subServiceLineGroup: item.subServiceLineGroup,
      // "My" planning implies the employee is the user
      employeeName: 'Me', 
    }));
  }, [allocations]);

  // Filter to show only current and future allocations (consistent with original)
  const currentAndFutureData = useMemo(() => {
    const today = startOfDay(new Date());
    return data.filter(a => !isBefore(startOfDay(new Date(a.endDate)), today));
  }, [data]);

  // Apply filters from MyPlanningFilters component
  const filteredData = useMemo(() => {
    let result = currentAndFutureData;
    
    // Search filter
    if (filters.search) {
      const lower = filters.search.toLowerCase();
      result = result.filter(item =>
        item.clientName?.toLowerCase().includes(lower) ||
        item.clientCode?.toLowerCase().includes(lower) ||
        item.taskName?.toLowerCase().includes(lower) ||
        item.taskCode?.toLowerCase().includes(lower)
      );
    }
    
    // Client filter
    if (filters.clients.length > 0) {
      result = result.filter(item =>
        item.clientCode && filters.clients.includes(item.clientCode)
      );
    }
    
    // Task filter
    if (filters.tasks.length > 0) {
      result = result.filter(item => {
        const taskKey = item.taskCode || item.taskName;
        return taskKey && filters.tasks.includes(taskKey);
      });
    }
    
    // Role filter
    if (filters.roles.length > 0) {
      result = result.filter(item =>
        filters.roles.includes(item.role)
      );
    }
    
    return result;
  }, [currentAndFutureData, filters]);

  const uniqueClients = useMemo(() => {
    const clients = new Set(filteredData.map(i => `${i.clientName}|${i.clientCode}`));
    return Array.from(clients).map(c => {
      const [name = '', code = ''] = c.split('|');
      return { name, code };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  // Use custom filter logic - now just for internal PlannerTable features (sorting, pagination)
  const filterFn = (item: PlannerItem, _filters: PlannerFilters) => {
    // All filtering is handled above, this is just for the table's internal logic
    return true;
  };

  const tableState = usePlannerTable({
    data: filteredData,
    initialSortField: 'startDate',
    initialSortDirection: 'desc',
    filterFn
  });

  const handleRowClick = (item: PlannerItem) => {
    if (!item.serviceLine || !item.subServiceLineGroup || !item.taskId) return;
    
    const url = item.clientId
      ? `/dashboard/${item.serviceLine.toLowerCase()}/${item.subServiceLineGroup}/clients/${item.clientId}/tasks/${item.taskId}`
      : `/dashboard/${item.serviceLine.toLowerCase()}/internal/tasks/${item.taskId}`;
      
    setIsNavigating(true);
    router.push(url);
  };

  const handleRowHover = (item: PlannerItem) => {
    if (!item.serviceLine || !item.subServiceLineGroup || !item.taskId) return;
    
    const url = item.clientId
      ? `/dashboard/${item.serviceLine.toLowerCase()}/${item.subServiceLineGroup}/clients/${item.clientId}/tasks/${item.taskId}`
      : `/dashboard/${item.serviceLine.toLowerCase()}/internal/tasks/${item.taskId}`;
      
    router.prefetch(url);
  };

  return (
    <PlannerTable
      data={tableState.paginatedData}
      isLoading={isNavigating}
      filters={tableState.filters}
      setSearchTerm={tableState.setSearchTerm}
      setRoleFilter={tableState.setRoleFilter}
      setClientFilter={tableState.setClientFilter}
      setTaskFilter={tableState.setTaskFilter}
      setEmployeeFilter={tableState.setEmployeeFilter}
      setInternalTaskFilter={tableState.setInternalTaskFilter}
      clearFilters={tableState.clearFilters}
      sortField={tableState.sortField}
      sortDirection={tableState.sortDirection}
      handleSort={tableState.handleSort}
      currentPage={tableState.currentPage}
      setCurrentPage={tableState.setCurrentPage}
      totalPages={tableState.totalPages}
      uniqueClients={uniqueClients}
      showEmployeeColumn={false}
      onRowClick={handleRowClick}
      onRowHover={handleRowHover}
    />
  );
}
