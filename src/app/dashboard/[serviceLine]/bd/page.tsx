/**
 * BD Pipeline Dashboard Page
 */

'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { usePipeline, useCreateOpportunity } from '@/hooks/bd/useOpportunities';
import { usePipelineAnalytics } from '@/hooks/bd/useBDAnalytics';
import { PipelineBoard } from '@/components/features/bd/PipelineBoard';
import { OpportunityForm } from '@/components/features/bd/OpportunityForm';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';

export default function BDPipelinePage() {
  const params = useParams();
  const serviceLine = params.serviceLine as string;
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load stages
  const { data: stages = [] } = useQuery({
    queryKey: ['bd-stages', serviceLine],
    queryFn: async () => {
      const res = await fetch(`/api/bd/stages?serviceLine=${serviceLine.toUpperCase()}`);
      if (!res.ok) throw new Error('Failed to fetch stages');
      const data = await res.json();
      return data.data || [];
    },
  });

  // When viewing from BUSINESS_DEV service line, show all opportunities
  // Otherwise, filter by the current service line
  const pipelineFilters = serviceLine.toUpperCase() === 'BUSINESS_DEV' 
    ? {} 
    : { serviceLine: serviceLine.toUpperCase() };

  const { data: pipelineData, isLoading } = usePipeline(pipelineFilters);

  const analyticsFilters = serviceLine.toUpperCase() === 'BUSINESS_DEV'
    ? {}
    : { serviceLine: serviceLine.toUpperCase() };

  const { data: analytics } = usePipelineAnalytics(analyticsFilters);

  const createMutation = useCreateOpportunity();

  const handleCreateOpportunity = async (data: Record<string, unknown>) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create opportunity:', error);
    }
  };

  const handleOpportunityClick = (opportunityId: number) => {
    router.push(`/dashboard/${serviceLine}/bd/${opportunityId}`);
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
          <span className="text-forvis-gray-900 font-medium">BD Pipeline</span>
        </nav>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-forvis-gray-900">
            Business Development Pipeline
          </h1>
          <p className="text-sm text-forvis-gray-600 mt-1">
            {serviceLine.toUpperCase() === 'BUSINESS_DEV' 
              ? 'Viewing all opportunities across all service lines'
              : `Track opportunities for ${formatServiceLineName(serviceLine.toUpperCase())}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Opportunity
        </button>
      </div>

      {/* Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div
            className="rounded-lg p-3 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Total Pipeline Value</p>
                <p className="text-2xl font-bold mt-1">
                  {new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: 'ZAR',
                    minimumFractionDigits: 0,
                  }).format(analytics.totalValue || 0)}
                </p>
              </div>
              <div
                className="rounded-full p-2"
                style={{ backgroundColor: 'rgba(28, 54, 103, 0.5)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-3 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Weighted Value</p>
                <p className="text-2xl font-bold mt-1">
                  {new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: 'ZAR',
                    minimumFractionDigits: 0,
                  }).format(analytics.weightedValue || 0)}
                </p>
              </div>
              <div
                className="rounded-full p-2"
                style={{ backgroundColor: 'rgba(37, 72, 138, 0.5)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-3 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #25488A, #1C3667)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Open Opportunities</p>
                <p className="text-2xl font-bold mt-1">{analytics.opportunityCount || 0}</p>
              </div>
              <div
                className="rounded-full p-2"
                style={{ backgroundColor: 'rgba(28, 54, 103, 0.5)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-3 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #1C3667, #132445)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Active Stages</p>
                <p className="text-2xl font-bold mt-1">{analytics.byStage?.length || 0}</p>
              </div>
              <div
                className="rounded-full p-2"
                style={{ backgroundColor: 'rgba(28, 54, 103, 0.5)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-500"></div>
        </div>
      ) : pipelineData ? (
        <PipelineBoard pipeline={pipelineData} onOpportunityClick={handleOpportunityClick} />
      ) : null}

      {/* Create Opportunity Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-forvis-gray-900 mb-4">
              Create New Opportunity
            </h2>
            <OpportunityForm
              stages={stages}
              onSubmit={handleCreateOpportunity}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

