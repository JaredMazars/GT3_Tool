'use client';

import { useState, useEffect, useMemo } from 'react';
import { MyPlanningTimelineView } from './MyPlanningTimelineView';
import { MyPlanningList } from './MyPlanningList';
import { LoadingSpinner } from '@/components/ui';
import { MyPlanningFilters, MyPlanningFiltersType } from './MyPlanningFilters';
import { Calendar, List } from 'lucide-react';
import { ServiceLineRole } from '@/types';

interface ClientAllocationData {
  clientId: number | null;
  clientName: string;
  clientCode: string;
  allocations: any[];
}

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

export function MyPlanningView() {
  const [view, setView] = useState<'timeline' | 'list'>('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [clientsData, setClientsData] = useState<ClientAllocationData[]>([]);
  const [flatList, setFlatList] = useState<PlanningListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MyPlanningFiltersType>({
    search: '',
    clients: [],
    tasks: [],
    roles: [],
  });

  // Fetch user's allocations
  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/users/me/allocations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch allocations');
        }

        const result = await response.json();
        const data = result.data || result;
        setClientsData(data.clients || []);
        
        // Transform flatList dates from strings to Date objects
        const transformedList = (data.flatList || []).map((item: any) => ({
          ...item,
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate)
        }));
        setFlatList(transformedList);
        setError(null);
      } catch (err) {
        console.error('Error fetching allocations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load planning data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllocations();
  }, []);

  // Extract unique filter options from allocations
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, { name: string; code: string }>();
    flatList.forEach(item => {
      if (item.clientCode) {
        clientsMap.set(item.clientCode, {
          name: item.clientName,
          code: item.clientCode,
        });
      }
    });
    return Array.from(clientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [flatList]);

  const uniqueTasks = useMemo(() => {
    const tasksMap = new Map<string, { name: string; code: string }>();
    flatList.forEach(item => {
      const key = item.taskCode || item.taskName;
      if (key && !tasksMap.has(key)) {
        tasksMap.set(key, {
          name: item.taskName,
          code: item.taskCode || '',
        });
      }
    });
    return Array.from(tasksMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [flatList]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-8">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="font-semibold text-forvis-gray-900">Failed to Load Planning Data</p>
          <p className="text-sm mt-1 text-forvis-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Unified Filters */}
      <MyPlanningFilters
        filters={filters}
        onFiltersChange={setFilters}
        clients={uniqueClients}
        tasks={uniqueTasks}
        viewMode={view}
        onViewModeChange={setView}
      />

      {/* Content */}
      {view === 'timeline' ? (
        <MyPlanningTimelineView clientsData={clientsData} filters={filters} />
      ) : (
        <MyPlanningList allocations={flatList} filters={filters} />
      )}
    </div>
  );
}
