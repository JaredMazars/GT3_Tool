'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ClientDocuments } from '@/components/features/clients/ClientDocuments';
import { ClientHeader } from '@/components/features/clients/ClientHeader';
import { useClient } from '@/hooks/clients/useClients';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { Suspense, useMemo } from 'react';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { LoadingSpinner } from '@/components/ui';

function ClientDocumentsContent() {
  const params = useParams();
  
  const GSClientID = (params?.id as string) || '';
  const serviceLine = (params?.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params?.subServiceLineGroup as string;

  // Fetch sub-service line groups to get the description
  const { data: subGroups } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine,
  });
  
  // Find the current sub-service line group to get its description
  const currentSubGroup = subGroups?.find(sg => sg.code === subServiceLineGroup);
  const subServiceLineGroupDescription = currentSubGroup?.description || subServiceLineGroup;

  // Fetch client data - hooks must be called unconditionally
  const { data: clientData, isLoading } = useClient(GSClientID, {
    taskPage: 1,
    taskLimit: 1,
    enabled: !!params && !!GSClientID,
  });

  // Transform client data to match expected format
  const client = useMemo(() => {
    if (!clientData) return null;
    return {
      ...clientData,
      Task: clientData.tasks || [],
      clientOCFlag: false,
      rolePlayer: false,
      createdAt: new Date(clientData.createdAt),
      updatedAt: new Date(clientData.updatedAt),
    };
  }, [clientData]);

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
          <span className="text-forvis-gray-900 font-medium">Documents</span>
        </nav>

        {/* Client Header */}
        <ClientHeader client={client} />

        {/* Documents Component */}
        <div className="mt-6">
          <ClientDocuments GSClientID={GSClientID} />
        </div>
      </div>
    </div>
  );
}

export default function ClientDocumentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <ClientDocumentsContent />
    </Suspense>
  );
}

