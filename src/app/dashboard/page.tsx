'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ServiceLineCard } from '@/components/features/service-lines/ServiceLineCard';
import { SharedServiceCard } from '@/components/features/service-lines/SharedServiceCard';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { isSharedService, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { GT3Logo } from '@/components/shared/GT3Logo';
import { useCurrentUser } from '@/hooks/auth/usePermissions';

export default function DashboardHomePage() {
  const { availableServiceLines, isLoading, setCurrentServiceLine, refetch } = useServiceLine();
  const { data: currentUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const [showError, setShowError] = useState(true);

  // Get user's first name for personalized greeting
  const firstName = currentUser?.name?.split(' ')[0] || '';

  // Get error parameters from URL
  const error = searchParams.get('error');
  const serviceLine = searchParams.get('serviceLine');

  // Clear any stored service line when landing on this page and refetch
  useEffect(() => {
    setCurrentServiceLine(null);
    // Refetch service lines when landing on dashboard to ensure fresh data
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-forvis-gray-700 font-medium">Loading service lines...</p>
        </div>
      </div>
    );
  }

  // Separate main service lines from shared services and sort alphabetically
  const mainServiceLines = availableServiceLines
    .filter((sl) => !isSharedService(sl.serviceLine))
    .sort((a, b) => a.serviceLine.localeCompare(b.serviceLine));
  
  const sharedServices = availableServiceLines
    .filter((sl) => isSharedService(sl.serviceLine))
    .sort((a, b) => a.serviceLine.localeCompare(b.serviceLine));

  // Generate error message based on error type
  const errorMessage = error === 'no_service_line_access' && serviceLine
    ? `You don't have access to ${formatServiceLineName(serviceLine)}. Please contact your administrator to request access.`
    : error === 'invalid_service_line'
    ? 'Invalid service line requested.'
    : null;

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Message */}
        {errorMessage && showError && (
          <div className="mb-8">
            <div className="rounded-xl p-4 border-2 shadow-corporate bg-red-50" style={{ borderColor: '#DC2626' }}>
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-red-100">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold mb-1 text-red-900">
                    Access Denied
                  </h3>
                  <p className="text-sm text-red-800">
                    {errorMessage}
                  </p>
                </div>
                <button
                  onClick={() => setShowError(false)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Dismiss error"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center" style={{ overflow: 'visible' }}>
          <p className="text-sm font-medium text-forvis-blue-600 mb-1">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome'}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-forvis-gray-900">
            Forvis Mazars
          </h1>
          <div className="flex justify-center" style={{ overflow: 'visible' }}>
            <GT3Logo />
          </div>
          <p className="text-sm text-forvis-gray-600">
            {availableServiceLines.length > 0 
              ? 'Select a service line to get started'
              : 'Learn more about our services below'}
          </p>
        </div>

        {/* Info Banner - No Service Lines */}
        {availableServiceLines.length === 0 && (
          <div className="mb-8">
            <div className="rounded-xl p-4 border-2 shadow-corporate" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}>
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2" style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold mb-1" style={{ color: '#1C3667' }}>
                    No Service Lines Assigned
                  </h3>
                  <p className="text-sm text-forvis-gray-700">
                    You don't have access to any service lines yet. Please contact your administrator to request access to the service lines you need. In the meantime, explore our service offerings below.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Service Line Cards */}
        {mainServiceLines.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-forvis-gray-900 mb-4">
              Main Service Lines
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mainServiceLines.map((serviceLineData) => (
                <ServiceLineCard
                  key={serviceLineData.serviceLine}
                  serviceLineData={serviceLineData}
                />
              ))}
            </div>
          </div>
        )}

        {/* Shared Services Cards */}
        {sharedServices.length > 0 && (
          <div className="mb-8">
            <div 
              className="rounded-lg border-2 p-6"
              style={{
                background: 'linear-gradient(135deg, #E0EDFB 0%, #C7DDEF 100%)',
                borderColor: '#2E5AAC',
              }}
            >
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-forvis-gray-900 mb-1">
                  Shared Services
                </h2>
                <p className="text-sm text-forvis-gray-600">
                  Support departments that contribute across all service lines
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sharedServices.map((serviceLineData) => (
                  <SharedServiceCard
                    key={serviceLineData.serviceLine}
                    serviceLineData={serviceLineData}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
