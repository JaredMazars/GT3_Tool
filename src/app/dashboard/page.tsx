'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ServiceLineCard } from '@/components/features/service-lines/ServiceLineCard';
import { SharedServiceCard } from '@/components/features/service-lines/SharedServiceCard';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { isSharedService, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { GT3Logo } from '@/components/shared/GT3Logo';
import { useCurrentUser } from '@/hooks/auth/usePermissions';
import { Banner } from '@/components/ui';

export default function DashboardHomePage() {
  const { availableServiceLines, isLoading, setCurrentServiceLine } = useServiceLine();
  const { data: currentUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const [showError, setShowError] = useState(true);

  // Get user's first name for personalized greeting
  const firstName = currentUser?.name?.split(' ')[0] || '';

  // Get error parameters from URL
  const error = searchParams.get('error');
  const serviceLine = searchParams.get('serviceLine');

  // Clear any stored service line when landing on this page
  // React Query handles data freshness automatically - no refetch needed
  useEffect(() => {
    setCurrentServiceLine(null);
  }, [setCurrentServiceLine]);

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
  const page = searchParams.get('page');
  const errorMessage = error === 'no_service_line_access' && serviceLine
    ? `You don't have access to ${formatServiceLineName(serviceLine)}. Please contact your administrator to request access.`
    : error === 'invalid_service_line'
    ? 'Invalid service line requested.'
    : error === 'access_denied'
    ? `You don't have permission to access ${page || 'this page'}. This page is restricted to administrators only.`
    : null;

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Message */}
        {errorMessage && showError && (
          <div className="mb-8">
            <Banner
              variant="error"
              title="Access Denied"
              message={errorMessage}
              dismissible
              onDismiss={() => setShowError(false)}
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-24 text-center flex flex-col items-center" style={{ overflow: 'visible' }}>
          <p className="text-sm font-medium text-forvis-blue-600 mb-0">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome'}
          </p>
          <div className="relative" style={{ width: '800px', height: '300px', overflow: 'visible' }}>
            {/* Mazars Logo - Base Layer (No Animation) */}
            <div className="absolute" style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
              <div 
                className="rounded-2xl" 
                style={{ 
                  border: '3px solid #2975c6',
                  padding: '6px',
                  background: 'white',
                  display: 'inline-block'
                }}
              >
                <Image
                  src="/Forvis Mazars Logo.png"
                  alt="Forvis Mazars Logo"
                  width={450}
                  height={135}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            </div>
            
            {/* GT3 Logo - Overlapping Layer (With Animation) */}
            <div className="absolute" style={{ top: '-90px', left: '50%', transform: 'translateX(-50%) scale(0.6)', zIndex: 10 }}>
              <GT3Logo />
            </div>
          </div>
          <p className="text-sm text-forvis-gray-600 mt-8">
            {availableServiceLines.length > 0 
              ? 'Select a service line to get started'
              : 'Learn more about our services below'}
          </p>
        </div>

        {/* Info Banner - No Service Lines */}
        {availableServiceLines.length === 0 && (
          <div className="mb-8">
            <div className="rounded-xl p-4 border-2 shadow-corporate bg-gradient-dashboard-card border-forvis-blue-500">
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-gradient-icon-standard">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold mb-1 text-forvis-blue-900">
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
            <div className="rounded-lg border-2 p-6 bg-gradient-premium-gold border-[#C9BCAA]">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white mb-1">
                  Shared Services
                </h2>
                <p className="text-sm text-white opacity-90">
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
