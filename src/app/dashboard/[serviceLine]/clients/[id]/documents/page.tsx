'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { ClientDocuments } from '@/components/features/clients/ClientDocuments';
import { ClientHeader } from '@/components/features/clients/ClientHeader';
import { useClient } from '@/hooks/clients/useClients';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { Suspense, useMemo } from 'react';

function ClientDocumentsContent() {
  const params = useParams();
  
  const clientId = (params?.id as string) || '';
  const serviceLine = (params?.serviceLine as string)?.toUpperCase();

  // Fetch client data - hooks must be called unconditionally
  const { data: clientData, isLoading } = useClient(clientId, {
    projectPage: 1,
    projectLimit: 1,
    enabled: !!params && !!clientId,
  });

  // Transform client data to match expected format
  const client = useMemo(() => {
    if (!clientData) return null;
    return {
      ...clientData,
      Project: clientData.projects || [],
    };
  }, [clientData]);

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
          <span className="text-forvis-gray-900 font-medium">Documents</span>
        </nav>

        {/* Client Header */}
        <ClientHeader client={client} />

        {/* Documents Component */}
        <div className="mt-6">
          <ClientDocuments clientId={clientId} />
        </div>
      </div>
    </div>
  );
}

export default function ClientDocumentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
      </div>
    }>
      <ClientDocumentsContent />
    </Suspense>
  );
}

