/**
 * BD Opportunity Card Component
 * Used in pipeline kanban view
 */

'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { formatAmount } from '@/lib/utils/formatters';

interface OpportunityCardProps {
  opportunity: {
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
    } | null;
  };
  onClick?: () => void;
}

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  return (
    <div
      className="bg-white rounded-lg border-2 shadow-corporate hover:shadow-corporate-md transition-shadow cursor-pointer p-3"
      style={{ borderColor: '#2E5AAC' }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-forvis-gray-900 line-clamp-2">
          {opportunity.title}
        </h3>
        <p className="text-xs text-forvis-gray-600 mt-1">
          {opportunity.Client 
            ? `${opportunity.Client.clientNameFull || opportunity.Client.clientCode} (${opportunity.Client.clientCode})`
            : opportunity.companyName || 'No company'}
        </p>
        {opportunity.Client && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-green-100 text-forvis-green-800 mt-1">
            Current Client
          </span>
        )}
      </div>

      {/* Value */}
      {opportunity.value && (
        <div className="mb-2">
          <p className="text-lg font-bold tabular-nums" style={{ color: '#2E5AAC' }}>
            {opportunity.value ? formatAmount(opportunity.value) : 'N/A'}
          </p>
        </div>
      )}

      {/* Probability */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-forvis-gray-600">Probability</span>
          <span className="font-bold" style={{ color: '#1C3667' }}>
            {opportunity.probability ?? opportunity.Stage?.probability ?? 0}%
          </span>
        </div>
        <div
          className="rounded-full h-1.5"
          style={{ backgroundColor: 'rgba(28, 54, 103, 0.2)' }}
        >
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${opportunity.probability ?? opportunity.Stage?.probability ?? 0}%`,
              background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
            }}
          />
        </div>
      </div>

      {/* Contact */}
      {opportunity.Contact && (
        <div className="flex items-center gap-2 text-xs text-forvis-gray-700 mb-2">
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="font-medium">
            {opportunity.Contact.firstName} {opportunity.Contact.lastName}
          </span>
        </div>
      )}

      {/* Expected Close Date */}
      {opportunity.expectedCloseDate && (
        <div className="flex items-center gap-2 text-xs text-forvis-gray-700">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="font-medium">
            {formatDistanceToNow(new Date(opportunity.expectedCloseDate), { addSuffix: true })}
          </span>
        </div>
      )}
    </div>
  );
}

