/**
 * BD Opportunity Detail Page
 */

'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useOpportunity } from '@/hooks/bd/useOpportunities';
import { useActivities } from '@/hooks/bd/useActivities';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';

export default function OpportunityDetailPage() {
  const params = useParams();
  const serviceLine = params.serviceLine as string;
  const router = useRouter();
  const opportunityId = parseInt(params.id as string);

  const { data: opportunity, isLoading } = useOpportunity(opportunityId);
  const { data: activitiesData } = useActivities({ opportunityId, page: 1, pageSize: 10 });

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
          <span className="text-forvis-gray-900 font-medium">{opportunity.name}</span>
        </nav>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-semibold text-forvis-gray-900">{opportunity.name}</h1>
              <p className="text-sm text-forvis-gray-600 mt-1">{opportunity.description || 'No description'}</p>
            </div>
        <div className="flex gap-3">
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50"
          >
            Edit
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            Convert to Client
          </button>
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
                {activitiesData.activities.map((activity: any) => (
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
                <p className="text-sm font-medium text-forvis-gray-900">
                  {opportunity.serviceLine}
                </p>
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
    </div>
  );
}

