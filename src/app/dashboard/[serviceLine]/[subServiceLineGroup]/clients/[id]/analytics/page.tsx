'use client';

import { useState, Suspense, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, BarChart3, FileText, Calculator, CloudUpload, Briefcase, Banknote, TrendingUp } from 'lucide-react';
import { ClientHeader } from '@/components/features/clients/ClientHeader';
import { useClient } from '@/hooks/clients/useClients';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { LoadingSpinner } from '@/components/ui';
import { TabLoadingSkeleton, ChartSkeleton } from '@/components/features/analytics/TabLoadingSkeleton';
import { clientWipKeys } from '@/hooks/clients/useClientWip';
import { clientDebtorsKeys } from '@/hooks/clients/useClientDebtors';
import { clientGraphDataKeys } from '@/hooks/clients/useClientGraphData';

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

const UploadAnalyzeTab = dynamic(
  () => import('@/components/features/analytics/UploadAnalyzeTab').then(m => ({ default: m.UploadAnalyzeTab })),
  { loading: () => <TabLoadingSkeleton />, ssr: false }
);

const CreditRatingsTab = dynamic(
  () => import('@/components/features/analytics/CreditRatingsTab').then(m => ({ default: m.CreditRatingsTab })),
  { loading: () => <TabLoadingSkeleton />, ssr: false }
);

const FinancialRatiosTab = dynamic(
  () => import('@/components/features/analytics/FinancialRatiosTab').then(m => ({ default: m.FinancialRatiosTab })),
  { loading: () => <TabLoadingSkeleton />, ssr: false }
);

const AnalyticsDocumentsTab = dynamic(
  () => import('@/components/features/analytics/AnalyticsDocumentsTab').then(m => ({ default: m.AnalyticsDocumentsTab })),
  { loading: () => <TabLoadingSkeleton />, ssr: false }
);

type TabType = 'profitability' | 'recoverability' | 'graphs' | 'upload' | 'ratings' | 'ratios' | 'documents';

function ClientAnalyticsContent() {
  const params = useParams();
  const GSClientID = (params?.id as string) || '';
  const serviceLine = (params?.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params?.subServiceLineGroup as string;
  const [activeTab, setActiveTab] = useState<TabType>('profitability');
  const queryClient = useQueryClient();

  // Prefetch next most likely tab data when current tab renders
  useEffect(() => {
    if (!GSClientID) return;

    // Prefetch strategy based on current tab
    if (activeTab === 'profitability') {
      // User likely to view recoverability next
      queryClient.prefetchQuery({
        queryKey: clientDebtorsKeys.detail(GSClientID),
        queryFn: async () => {
          const response = await fetch(`/api/clients/${GSClientID}/debtors`);
          if (!response.ok) return null;
          const result = await response.json();
          return result.success ? result.data : null;
        },
      });
    } else if (activeTab === 'recoverability') {
      // User likely to view graphs next
      queryClient.prefetchQuery({
        queryKey: clientGraphDataKeys.detail(GSClientID),
        queryFn: async () => {
          const response = await fetch(`/api/clients/${GSClientID}/analytics/graphs`);
          if (!response.ok) return null;
          const result = await response.json();
          return result.success ? result.data : null;
        },
      });
    }
  }, [activeTab, GSClientID, queryClient]);

  // Fetch sub-service line groups to get the description
  const { data: subGroups } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine,
  });
  
  // Find the current sub-service line group to get its description
  const currentSubGroup = subGroups?.find(sg => sg.code === subServiceLineGroup);
  const subServiceLineGroupDescription = currentSubGroup?.description || subServiceLineGroup;

  // Fetch client data
  const { data: clientData, isLoading } = useClient(GSClientID, {
    taskPage: 1,
    taskLimit: 1,
    enabled: !!params && !!GSClientID,
  });

  const client = clientData
    ? {
        ...clientData,
        Task: clientData.tasks || [],
        clientOCFlag: 'clientOCFlag' in clientData ? (clientData as { clientOCFlag?: boolean }).clientOCFlag ?? false : false,
        rolePlayer: 'rolePlayer' in clientData ? (clientData as { rolePlayer?: boolean }).rolePlayer ?? false : false,
        createdAt: new Date(clientData.createdAt),
        updatedAt: new Date(clientData.updatedAt),
      }
    : null;

  if (!params) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Client Not Found</h2>
          <p className="mt-2 text-gray-600">The client you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const clientName = client.clientNameFull || client.clientCode;

  const tabs = [
    {
      id: 'profitability' as TabType,
      name: 'Profitability',
      icon: BarChart3,
      description: 'View client profitability analysis',
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
      description: 'View revenue and billing trends',
    },
    {
      id: 'upload' as TabType,
      name: 'Upload & Analyze',
      icon: CloudUpload,
      description: 'Upload financial documents',
    },
    {
      id: 'ratings' as TabType,
      name: 'Credit Ratings',
      icon: BarChart3,
      description: 'View credit ratings and history',
    },
    {
      id: 'ratios' as TabType,
      name: 'Financial Ratios',
      icon: Calculator,
      description: 'View financial ratios and metrics',
    },
    {
      id: 'documents' as TabType,
      name: 'Documents',
      icon: FileText,
      description: 'Manage uploaded documents',
    },
  ];

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}`}
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}`}
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {subServiceLineGroupDescription}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${GSClientID}`}
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {clientName}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Analytics</span>
        </nav>

        {/* Client Header */}
        <ClientHeader client={client} />

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
          {activeTab === 'profitability' && <ProfitabilityTab clientId={GSClientID} />}
          {activeTab === 'recoverability' && <RecoverabilityTab clientId={GSClientID} />}
          {activeTab === 'graphs' && <GraphsTab clientId={GSClientID} />}
          {activeTab === 'upload' && (
            <UploadAnalyzeTab clientId={GSClientID} onGenerateComplete={() => setActiveTab('ratings')} />
          )}
          {activeTab === 'ratings' && <CreditRatingsTab clientId={GSClientID} />}
          {activeTab === 'ratios' && <FinancialRatiosTab clientId={GSClientID} />}
          {activeTab === 'documents' && <AnalyticsDocumentsTab clientId={GSClientID} />}
        </div>
      </div>
    </div>
  );
}

export default function ClientAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ClientAnalyticsContent />
    </Suspense>
  );
}

