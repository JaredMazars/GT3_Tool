/**
 * BD Opportunity Detail Page
 */

'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useOpportunity, useUpdateOpportunity, useConvertOpportunity } from '@/hooks/bd/useOpportunities';
import { useActivities } from '@/hooks/bd/useActivities';
import { 
  formatServiceLineName, 
  getServiceLineColor, 
  getServiceLineBgColor,
  getServiceLineBorderColor 
} from '@/lib/utils/serviceLineUtils';
import { OpportunityForm } from '@/components/features/bd/OpportunityForm';
import { useQuery } from '@tanstack/react-query';

export default function OpportunityDetailPage() {
  const params = useParams();
  const serviceLine = params.serviceLine as string;
  const router = useRouter();
  const opportunityId = parseInt(params.id as string);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isServiceLineModalOpen, setIsServiceLineModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedServiceLine, setSelectedServiceLine] = useState<string>('');
  const [createProject, setCreateProject] = useState(false);

  const { data: opportunity, isLoading } = useOpportunity(opportunityId);
  const { data: activitiesData } = useActivities({ opportunityId, page: 1, pageSize: 10 });
  const updateOpportunity = useUpdateOpportunity(opportunityId);
  const convertOpportunity = useConvertOpportunity(opportunityId);

  // Fetch stages for the form
  const { data: stagesData } = useQuery({
    queryKey: ['bd-stages'],
    queryFn: async () => {
      const res = await fetch('/api/bd/stages');
      if (!res.ok) throw new Error('Failed to fetch stages');
      const data = await res.json();
      return data.data;
    },
  });

  const handleUpdateOpportunity = async (data: Record<string, unknown>) => {
    try {
      await updateOpportunity.mutateAsync(data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update opportunity:', error);
    }
  };

  const handleServiceLineChange = async () => {
    if (!selectedServiceLine || selectedServiceLine === opportunity?.serviceLine) {
      setIsServiceLineModalOpen(false);
      return;
    }

    try {
      await updateOpportunity.mutateAsync({
        title: opportunity!.title,
        description: opportunity!.description || undefined,
        clientId: opportunity!.clientId || undefined,
        companyName: opportunity!.companyName || undefined,
        serviceLine: selectedServiceLine as 'TAX' | 'AUDIT' | 'ACCOUNTING' | 'ADVISORY' | 'QRM' | 'BUSINESS_DEV' | 'IT' | 'FINANCE' | 'HR',
        stageId: opportunity!.stageId,
        value: opportunity!.value || undefined,
        probability: opportunity!.probability || undefined,
        expectedCloseDate: opportunity!.expectedCloseDate ? new Date(opportunity!.expectedCloseDate) : undefined,
        source: opportunity!.source || undefined,
      });
      setIsServiceLineModalOpen(false);
    } catch (error) {
      console.error('Failed to update service line:', error);
    }
  };

  const handleConvertToClient = async () => {
    try {
      const result = await convertOpportunity.mutateAsync({
        createProject,
      });
      setIsConvertModalOpen(false);
      // Navigate to the new client page
      if (result.client) {
        router.push(`/dashboard/${serviceLine}/clients/${result.client.id}`);
      }
    } catch (error) {
      console.error('Failed to convert opportunity:', error);
      alert('Failed to convert opportunity to client. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium text-forvis-gray-900 mb-1">
              Opportunity not found
            </h3>
            <button
              onClick={() => router.push(`/dashboard/${serviceLine}/bd`)}
              className="text-sm font-medium text-forvis-blue-500 hover:text-forvis-blue-600"
            >
              Return to BD Pipeline
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 py-4 mb-2">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Dashboard
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine.toUpperCase())}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/bd`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            BD Pipeline
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">{opportunity.title}</span>
        </nav>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold text-forvis-gray-900">{opportunity.title}</h1>
                <button
                  onClick={() => {
                    setSelectedServiceLine(opportunity.serviceLine);
                    setIsServiceLineModalOpen(true);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all hover:shadow-md ${getServiceLineBgColor(opportunity.serviceLine)} ${getServiceLineColor(opportunity.serviceLine)} ${getServiceLineBorderColor(opportunity.serviceLine)}`}
                  title="Click to change service line"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {formatServiceLineName(opportunity.serviceLine)}
                </button>
              </div>
              <p className="text-sm text-forvis-gray-600">{opportunity.description || 'No description'}</p>
            </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 transition-colors"
          >
            Edit
          </button>
          {opportunity.status !== 'WON' && !opportunity.convertedToClientId && (
            <button
              onClick={() => setIsConvertModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Convert to Client
            </button>
          )}
          {opportunity.convertedToClientId && (
            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Converted to Client
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
          <p className="text-xs font-medium text-forvis-gray-600">Value</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#2E5AAC' }}>
            {formatCurrency(opportunity.value)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
          <p className="text-xs font-medium text-forvis-gray-600">Stage</p>
          <p className="text-lg font-bold mt-1 text-forvis-gray-900">{opportunity.Stage.name}</p>
        </div>

        <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
          <p className="text-xs font-medium text-forvis-gray-600">Probability</p>
          <p className="text-2xl font-bold mt-1 text-forvis-gray-900">
            {opportunity.probability || opportunity.Stage.probability}%
          </p>
        </div>

        <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
          <p className="text-xs font-medium text-forvis-gray-600">Status</p>
          <p className="text-lg font-bold mt-1 text-forvis-gray-900">{opportunity.status}</p>
        </div>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {opportunity.description && (
            <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
              <h3 className="text-sm font-semibold text-forvis-gray-900 mb-2">Description</h3>
              <p className="text-sm text-forvis-gray-700">{opportunity.description}</p>
            </div>
          )}

          {/* Activities */}
          <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
            <h3 className="text-sm font-semibold text-forvis-gray-900 mb-4">Activity Timeline</h3>
            {activitiesData && activitiesData.activities.length > 0 ? (
              <div className="space-y-3">
                {activitiesData.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#EBF2FA' }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: '#2E5AAC' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-forvis-gray-900">
                        {activity.subject}
                      </p>
                      <p className="text-xs text-forvis-gray-600 mt-1">
                        {activity.activityType} • {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-forvis-gray-600">No activities yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          {opportunity.Contact && (
            <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
              <h3 className="text-sm font-semibold text-forvis-gray-900 mb-3">Contact</h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-forvis-gray-900">
                  {opportunity.Contact.firstName} {opportunity.Contact.lastName}
                </p>
                {opportunity.Contact.email && (
                  <p className="text-sm text-forvis-gray-600">{opportunity.Contact.email}</p>
                )}
                {opportunity.Contact.phone && (
                  <p className="text-sm text-forvis-gray-600">{opportunity.Contact.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
            <h3 className="text-sm font-semibold text-forvis-gray-900 mb-3">Details</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-forvis-gray-600">Service Line</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getServiceLineBgColor(opportunity.serviceLine)} ${getServiceLineColor(opportunity.serviceLine)}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {formatServiceLineName(opportunity.serviceLine)}
                  </span>
                </div>
              </div>
              {opportunity.source && (
                <div>
                  <p className="text-xs text-forvis-gray-600">Source</p>
                  <p className="text-sm font-medium text-forvis-gray-900">{opportunity.source}</p>
                </div>
              )}
              {opportunity.expectedCloseDate && (
                <div>
                  <p className="text-xs text-forvis-gray-600">Expected Close</p>
                  <p className="text-sm font-medium text-forvis-gray-900">
                    {new Date(opportunity.expectedCloseDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-forvis-gray-600">Created</p>
                <p className="text-sm font-medium text-forvis-gray-900">
                  {new Date(opportunity.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-forvis-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-forvis-gray-900">Edit Opportunity</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {stagesData && (
                <OpportunityForm
                  initialData={{
                    title: opportunity.title,
                    description: opportunity.description || undefined,
                    clientId: opportunity.clientId || undefined,
                    companyName: opportunity.companyName || undefined,
                    serviceLine: opportunity.serviceLine,
                    stageId: opportunity.stageId,
                    value: opportunity.value || undefined,
                    probability: opportunity.probability || undefined,
                    expectedCloseDate: opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate) : undefined,
                    source: opportunity.source || undefined,
                  }}
                  stages={stagesData}
                  onSubmit={handleUpdateOpportunity}
                  onCancel={() => setIsEditModalOpen(false)}
                  isLoading={updateOpportunity.isPending}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert to Client Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-forvis-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-semibold text-forvis-gray-900">Convert to Client</h2>
              <button
                onClick={() => setIsConvertModalOpen(false)}
                className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-forvis-gray-700 mb-2">
                  This will create a new client record{opportunity.companyName ? ` for "${opportunity.companyName}"` : ''} 
                  {opportunity.Client ? ` linked to "${opportunity.Client.clientNameFull}"` : ''}.
                </p>
                {!opportunity.Client && !opportunity.companyName && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-yellow-800">
                      <strong>Warning:</strong> This opportunity has no company name. Please edit the opportunity to add a company name before converting.
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createProject}
                    onChange={(e) => setCreateProject(e.target.checked)}
                    className="mt-1 h-4 w-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-forvis-gray-900">Create initial project</p>
                    <p className="text-xs text-forvis-gray-600 mt-1">
                      Automatically create a project for this client in the {formatServiceLineName(opportunity.serviceLine)} service line
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-forvis-blue-800">
                  <strong>Note:</strong> This action will mark the opportunity as "WON" and link it to the new client record.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsConvertModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertToClient}
                  disabled={convertOpportunity.isPending || (!opportunity.Client && !opportunity.companyName)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  {convertOpportunity.isPending ? 'Converting...' : 'Convert to Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Line Change Modal */}
      {isServiceLineModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-forvis-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-semibold text-forvis-gray-900">Change Service Line</h2>
              <button
                onClick={() => setIsServiceLineModalOpen(false)}
                className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-forvis-gray-600 mb-4">
                Select the service line that best classifies this opportunity.
              </p>
              
              <div className="space-y-2">
                {[
                  { value: 'TAX', label: 'Tax Services' },
                  { value: 'AUDIT', label: 'Audit Services' },
                  { value: 'ACCOUNTING', label: 'Accounting Services' },
                  { value: 'ADVISORY', label: 'Advisory Services' },
                  { value: 'QRM', label: 'Quality & Risk Management' },
                  { value: 'BUSINESS_DEV', label: 'Business Development & Marketing' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedServiceLine(option.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedServiceLine === option.value
                        ? `${getServiceLineBgColor(option.value)} ${getServiceLineBorderColor(option.value)} ${getServiceLineColor(option.value)} font-bold`
                        : 'border-forvis-gray-200 hover:border-forvis-gray-300 bg-white text-forvis-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {option.label}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsServiceLineModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleServiceLineChange}
                  disabled={updateOpportunity.isPending}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  {updateOpportunity.isPending ? 'Saving...' : 'Save Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

