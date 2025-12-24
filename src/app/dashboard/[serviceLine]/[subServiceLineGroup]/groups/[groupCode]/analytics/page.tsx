'use client';

import { useState, Suspense, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, BarChart3, Banknote, TrendingUp } from 'lucide-react';
import { GroupHeader } from '@/components/features/clients/GroupHeader';
import { useClientGroup } from '@/hooks/clients/useClientGroup';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { ChartSkeleton, TabLoadingSkeleton } from '@/components/features/analytics/TabLoadingSkeleton';
import { groupGraphDataKeys } from '@/hooks/groups/useGroupGraphData';
import { groupWipKeys } from '@/hooks/groups/useGroupWip';
import { groupDebtorsKeys } from '@/hooks/groups/useGroupDebtors';

// Lazy load analytics tab components for better performance
const ProfitabilityTab = dynamic(
  () => import('@/components/features/analytics/ProfitabilityTab').then(m => ({ default: m.ProfitabilityTab })),
  { loading: () => <TabLoadingSkeleton />, ssr: false }
);

const RecoverabilityTab = dynamic(
  () => import('@/components/features/analytics/RecoverabilityTab').then(m => ({ default: m.RecoverabilityTab })),
  { loading: () => <TabLoadingSkeleton />, ssr: false }
);

const GraphsTab = dynamic(
  () => import('@/components/features/analytics/GraphsTab').then(m => ({ default: m.GraphsTab })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

type TabType = 'profitability' | 'recoverability' | 'graphs';

function GroupAnalyticsContent() {
  const params = useParams();
  const queryClient = useQueryClient();
  const groupCode = decodeURIComponent((params?.groupCode as string) || '');
  const serviceLine = (params?.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params?.subServiceLineGroup as string;
  const [activeTab, setActiveTab] = useState<TabType>('profitability');

  // Fetch sub-service line groups to get the description
  const { data: subGroups } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine,
  });
  
  // Find the current sub-service line group to get its description
  const currentSubGroup = subGroups?.find(sg => sg.code === subServiceLineGroup);
  const subServiceLineGroupDescription = currentSubGroup?.description || subServiceLineGroup;

  // Fetch group data to get client count
  const { data: groupData, isLoading } = useClientGroup(groupCode, {
    page: 1,
    limit: 1,
    type: 'clients',
    enabled: !!params && !!groupCode,
  });

  // Sequential tab prefetching for better performance
  // Must be called before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!groupCode) return; // Ensure groupCode is available
    
    if (activeTab === 'profitability') {
      // Prefetch Debtors data for Recoverability tab
      queryClient.prefetchQuery({
        queryKey: groupDebtorsKeys.detail(groupCode),
        queryFn: async () => {
          const response = await fetch(`/api/groups/${encodeURIComponent(groupCode)}/debtors`);
          if (!response.ok) throw new Error('Failed to prefetch group debtor data');
          const result = await response.json();
          return result.success ? result.data : result;
        },
        staleTime: 30 * 60 * 1000, // 30 minutes
      });
    } else if (activeTab === 'recoverability') {
      // Prefetch Graphs data when on recoverability tab
      queryClient.prefetchQuery({
        queryKey: groupGraphDataKeys.detail(groupCode),
        queryFn: async () => {
          const response = await fetch(`/api/groups/${encodeURIComponent(groupCode)}/analytics/graphs`);
          if (!response.ok) throw new Error('Failed to prefetch group graph data');
          const result = await response.json();
          return result.success ? result.data : result;
        },
        staleTime: 30 * 60 * 1000, // 30 minutes
      });
    }
  }, [activeTab, groupCode, queryClient]);

  if (!params) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Group Not Found</h2>
          <p className="mt-2 text-gray-600">The group you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'profitability' as TabType,
      name: 'Profitability',
      icon: BarChart3,
      description: 'View group profitability analysis',
    },
    {
      id: 'recoverability' as TabType,
      name: 'Recoverability',
      icon: Banknote,
      description: 'View recoverability information',
    },
    {
      id: 'graphs' as TabType,
      name: 'Graphs',
      icon: TrendingUp,
      description: 'View transaction trends',
    },
  ];

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}`}
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}`}
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {subServiceLineGroupDescription}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/groups/${encodeURIComponent(groupCode)}`}
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {groupData.groupDesc || groupCode}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Analytics</span>
        </nav>

        {/* Group Header */}
        <GroupHeader
          groupCode={groupData.groupCode || groupCode}
          groupDesc={groupData.groupDesc || ''}
          clientCount={groupData.pagination?.total || 0}
        />

        {/* Tabs */}
        <div className="mt-6 mb-6 border-b border-forvis-gray-200">
          <nav className="flex -mb-px space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-forvis-blue-600 text-forvis-blue-600'
                      : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'profitability' && <ProfitabilityTab groupCode={groupCode} />}
          {activeTab === 'recoverability' && <RecoverabilityTab groupCode={groupCode} />}
          {activeTab === 'graphs' && <GraphsTab groupCode={groupCode} />}
        </div>
      </div>
    </div>
  );
}

export default function GroupAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
        </div>
      }
    >
      <GroupAnalyticsContent />
    </Suspense>
  );
}









