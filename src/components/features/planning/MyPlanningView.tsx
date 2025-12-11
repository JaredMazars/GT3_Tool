'use client';

import { useState, useEffect } from 'react';
import { MyPlanningTimelineView } from './MyPlanningTimelineView';
import { MyPlanningList } from './MyPlanningList';
import { LoadingSpinner } from '@/components/ui';
import { Calendar, List } from 'lucide-react';
import { TaskRole } from '@/types';

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
  role: TaskRole;
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
        console.log('[MyPlanningView] API Response:', result);
        console.log('[MyPlanningView] Response structure:', {
          hasSuccess: 'success' in result,
          hasData: 'data' in result,
          resultKeys: Object.keys(result)
        });
        
        const data = result.data || result;
        console.log('[MyPlanningView] Extracted data:', {
          hasClients: 'clients' in data,
          hasFlatList: 'flatList' in data,
          clientsLength: data.clients?.length || 0,
          flatListLength: data.flatList?.length || 0
        });
        
        const clients = data.clients || [];
        console.log('[MyPlanningView] Clients data:', clients);
        console.log('[MyPlanningView] First client sample:', clients[0]);
        
        setClientsData(clients);
        
        // Transform flatList dates from strings to Date objects
        const transformedList = (data.flatList || []).map((item: any) => ({
          ...item,
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate)
        }));
        setFlatList(transformedList);
        setError(null);
        
        console.log('[MyPlanningView] State updated:', {
          clientsDataLength: clients.length,
          flatListLength: transformedList.length
        });
      } catch (err) {
        console.error('[MyPlanningView] Error fetching allocations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load planning data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllocations();
  }, []);

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
      {/* View Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex gap-2 p-1 bg-forvis-gray-200 rounded-lg">
          <button
            onClick={() => setView('timeline')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'timeline'
                ? 'text-white shadow-corporate'
                : 'text-forvis-gray-700 hover:bg-forvis-gray-300'
            }`}
            style={view === 'timeline' ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' } : {}}
          >
            <Calendar className="w-4 h-4" />
            <span>Timeline View</span>
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'list'
                ? 'text-white shadow-corporate'
                : 'text-forvis-gray-700 hover:bg-forvis-gray-300'
            }`}
            style={view === 'list' ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' } : {}}
          >
            <List className="w-4 h-4" />
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'timeline' ? (
        <MyPlanningTimelineView clientsData={clientsData} />
      ) : (
        <MyPlanningList allocations={flatList} />
      )}
    </div>
  );
}
