'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ServiceLineCard } from '@/components/features/service-lines/ServiceLineCard';
import { SharedServiceCard } from '@/components/features/service-lines/SharedServiceCard';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { isSharedService, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { GT3Logo } from '@/components/shared/GT3Logo';

export default function DashboardHomePage() {
  const { availableServiceLines, isLoading, setCurrentServiceLine, refetch } = useServiceLine();
  const searchParams = useSearchParams();
  const [showError, setShowError] = useState(true);

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

  // Separate main service lines from shared services
  const mainServiceLines = availableServiceLines.filter(
    (sl) => !isSharedService(sl.serviceLine)
  );
  const sharedServices = availableServiceLines.filter(
    (sl) => isSharedService(sl.serviceLine)
  );

  // Generate error message based on error type
  const errorMessage = error === 'no_service_line_access' && serviceLine
    ? `You don't have access to ${formatServiceLineName(serviceLine)}. Please contact your administrator to request access.`
    : error === 'invalid_service_line'
    ? 'Invalid service line requested.'
    : null;

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Message */}
        {errorMessage && showError && (
          <div className="mb-6 max-w-3xl mx-auto">
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
          <h1 className="text-3xl md:text-4xl font-semibold text-forvis-gray-900">
            Welcome to Forvis Mazars
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
          <div className="mb-8 max-w-3xl mx-auto">
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

        {/* Stats Summary */}
        {availableServiceLines.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div 
            className="rounded-lg p-4 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Total Service Lines</p>
                <p className="text-2xl font-bold mt-1">{availableServiceLines.length}</p>
              </div>
              <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(28, 54, 103, 0.5)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            className="rounded-lg p-4 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Total Projects</p>
                <p className="text-2xl font-bold mt-1">
                  {availableServiceLines.reduce((sum, sl) => sum + sl.projectCount, 0)}
                </p>
              </div>
              <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(37, 72, 138, 0.5)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            className="rounded-lg p-4 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #25488A, #1C3667)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Active Projects</p>
                <p className="text-2xl font-bold mt-1">
                  {availableServiceLines.reduce((sum, sl) => sum + sl.activeProjectCount, 0)}
                </p>
              </div>
              <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(19, 36, 69, 0.5)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Main Service Line Cards */}
        {mainServiceLines.length > 0 && (
          <div className="mb-6">
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
          <div className="mb-6">
            <div className="bg-gradient-to-r from-forvis-gray-50 to-forvis-blue-50 rounded-lg border-2 border-forvis-gray-200 p-6">
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

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden" style={{ borderColor: '#2E5AAC' }}>
          <div 
            className="px-6 py-4"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
          >
            <h2 className="text-2xl font-bold text-white mb-1">
              About Our Services
            </h2>
            <p className="text-sm text-white opacity-90">
              Comprehensive professional services and shared support functions
            </p>
          </div>
          
          <div className="p-6">
            <h3 className="text-lg font-bold text-forvis-gray-900 mb-4">Main Service Lines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderColor: '#E0EDFB' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-blue-100 border border-blue-200">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-forvis-gray-900 mb-1">
                      Tax
                    </h3>
                    <p className="text-sm text-forvis-gray-700">
                      Comprehensive tax services including compliance, planning, opinions, and administration for individuals and businesses.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderColor: '#E0EDFB' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-green-100 border border-green-200">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-forvis-gray-900 mb-1">
                      Audit
                    </h3>
                    <p className="text-sm text-forvis-gray-700">
                      Professional audit and assurance services ensuring financial statement accuracy and regulatory compliance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderColor: '#E0EDFB' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-purple-100 border border-purple-200">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-forvis-gray-900 mb-1">
                      Accounting
                    </h3>
                    <p className="text-sm text-forvis-gray-700">
                      Full-service accounting solutions from bookkeeping to financial statement preparation and management reporting.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderColor: '#E0EDFB' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-orange-100 border border-orange-200">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-forvis-gray-900 mb-1">
                      Advisory
                    </h3>
                    <p className="text-sm text-forvis-gray-700">
                      Strategic consulting and advisory services to help businesses navigate challenges and seize opportunities.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-forvis-gray-900 mb-4">Shared Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #FEF8F8 0%, #FCEEED 100%)', borderColor: '#FBE0E0' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-red-100 border border-red-200">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-forvis-gray-900 mb-1">
                      Quality & Risk Management
                    </h4>
                    <p className="text-sm text-forvis-gray-700">
                      Quality assurance, risk assessment, and compliance oversight across all service lines.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #F8FEFE 0%, #EDFCFC 100%)', borderColor: '#E0F9F9' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-teal-100 border border-teal-200">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-forvis-gray-900 mb-1">
                      Business Development & Marketing
                    </h4>
                    <p className="text-sm text-forvis-gray-700">
                      Marketing campaigns, proposal development, and market research initiatives.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #F8F9FE 0%, #EEF1FC 100%)', borderColor: '#E0E5FB' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-indigo-100 border border-indigo-200">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-forvis-gray-900 mb-1">
                      Information Technology
                    </h4>
                    <p className="text-sm text-forvis-gray-700">
                      IT implementations, technical support, and infrastructure management.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #FEFEF8 0%, #FCFCED 100%)', borderColor: '#FBF9E0' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-yellow-100 border border-yellow-200">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-forvis-gray-900 mb-1">
                      Finance
                    </h4>
                    <p className="text-sm text-forvis-gray-700">
                      Financial reporting, budgeting, and financial analysis for internal operations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #FEF8FC 0%, #FCEEF8 100%)', borderColor: '#FBE0F4' }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="rounded-lg p-2 bg-pink-100 border border-pink-200">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-forvis-gray-900 mb-1">
                      Human Resources
                    </h4>
                    <p className="text-sm text-forvis-gray-700">
                      Recruitment, training programs, and policy development for firm-wide HR management.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
