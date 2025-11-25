'use client';

import { useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRightIcon, ChartBarIcon, DocumentTextIcon, CalculatorIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { ClientHeader } from '@/components/features/clients/ClientHeader';
import { useClient } from '@/hooks/clients/useClients';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { UploadAnalyzeTab } from '@/components/features/analytics/UploadAnalyzeTab';
import { CreditRatingsTab } from '@/components/features/analytics/CreditRatingsTab';
import { FinancialRatiosTab } from '@/components/features/analytics/FinancialRatiosTab';
import { AnalyticsDocumentsTab } from '@/components/features/analytics/AnalyticsDocumentsTab';

type TabType = 'upload' | 'ratings' | 'ratios' | 'documents';

function ClientAnalyticsContent() {
  const params = useParams();
  const clientId = (params?.id as string) || '';
  const serviceLine = (params?.serviceLine as string)?.toUpperCase();
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  // Fetch client data
  const { data: clientData, isLoading } = useClient(clientId, {
    projectPage: 1,
    projectLimit: 1,
    enabled: !!params && !!clientId,
  });

  const client = clientData
    ? {
        ...clientData,
        Project: clientData.projects || [],
        clientOCFlag: 'clientOCFlag' in clientData ? (clientData as { clientOCFlag?: boolean }).clientOCFlag ?? false : false,
        rolePlayer: 'rolePlayer' in clientData ? (clientData as { rolePlayer?: boolean }).rolePlayer ?? false : false,
      }
    : null;

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
      id: 'upload' as TabType,
      name: 'Upload & Analyze',
      icon: CloudArrowUpIcon,
      description: 'Upload financial documents',
    },
    {
      id: 'ratings' as TabType,
      name: 'Credit Ratings',
      icon: ChartBarIcon,
      description: 'View credit ratings and history',
    },
    {
      id: 'ratios' as TabType,
      name: 'Financial Ratios',
      icon: CalculatorIcon,
      description: 'View financial ratios and metrics',
    },
    {
      id: 'documents' as TabType,
      name: 'Documents',
      icon: DocumentTextIcon,
      description: 'Manage uploaded documents',
    },
  ];

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Dashboard
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}`}
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />

          {isSharedService(serviceLine) && (
            <>
              <Link
                href={`/dashboard/${serviceLine.toLowerCase()}/clients`}
                className="hover:text-forvis-gray-900 transition-colors"
              >
                Client Projects
              </Link>
              <ChevronRightIcon className="h-4 w-4" />
            </>
          )}

          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}/clients/${clientId}`}
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {clientName}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
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
          {activeTab === 'upload' && (
            <UploadAnalyzeTab clientId={clientId} onGenerateComplete={() => setActiveTab('ratings')} />
          )}
          {activeTab === 'ratings' && <CreditRatingsTab clientId={clientId} />}
          {activeTab === 'ratios' && <FinancialRatiosTab clientId={clientId} />}
          {activeTab === 'documents' && <AnalyticsDocumentsTab clientId={clientId} />}
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
        </div>
      }
    >
      <ClientAnalyticsContent />
    </Suspense>
  );
}

