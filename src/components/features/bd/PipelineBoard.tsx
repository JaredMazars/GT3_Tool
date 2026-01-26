/**
 * BD Pipeline Board Component
 * Kanban-style view of opportunities by stage
 */

'use client';

import React from 'react';
import { OpportunityCard } from './OpportunityCard';

interface Opportunity {
  id: number;
  title: string;
  clientId: number | null;  // Internal ID - renamed for clarity
  companyName: string | null;
  value: number | null;
  probability: number | null;
  expectedCloseDate: Date | null;
  Client: {
    id: number;
    clientCode: string;
    clientNameFull: string | null;
  } | null;
  Contact: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  Stage: {
    name: string;
    probability: number;
    color: string | null;
  };
}

interface PipelineBoardProps {
  pipeline: Record<string, Opportunity[]>;
  onOpportunityClick: (opportunityId: number) => void;
}

export function PipelineBoard({ pipeline, onOpportunityClick }: PipelineBoardProps) {
  const stages = Object.keys(pipeline);

  if (stages.length === 0) {
    return (
      <div
        className="mx-4 mb-4 text-center py-16 rounded-xl border-3 border-dashed shadow-lg"
        style={{
          borderColor: '#2E5AAC',
          borderWidth: '3px',
          background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)',
        }}
      >
        <svg
          className="mx-auto h-16 w-16"
          style={{ color: '#2E5AAC' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>
          No opportunities in pipeline
        </h3>
        <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>
          Create your first opportunity to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stageName) => {
        const opportunities = pipeline[stageName] || [];
        const totalValue = opportunities.reduce((sum: number, opp) => sum + (opp.value || 0), 0);

        return (
          <div key={stageName} className="flex-shrink-0 w-80">
            {/* Stage Header */}
            <div
              className="rounded-lg p-3 mb-3 shadow-corporate"
              style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{stageName}</h3>
                  <p className="text-xs text-white opacity-90 mt-1">
                    {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white opacity-90">Total Value</p>
                  <p className="text-sm font-bold text-white">
                    {new Intl.NumberFormat('en-ZA', {
                      style: 'currency',
                      currency: 'ZAR',
                      minimumFractionDigits: 0,
                    }).format(totalValue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Opportunities List */}
            <div className="space-y-3 min-h-[200px]">
              {opportunities.length === 0 ? (
                <div
                  className="rounded-lg p-4 text-center"
                  style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)' }}
                >
                  <p className="text-xs text-forvis-gray-600">No opportunities</p>
                </div>
              ) : (
                opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onClick={() => onOpportunityClick(opportunity.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

