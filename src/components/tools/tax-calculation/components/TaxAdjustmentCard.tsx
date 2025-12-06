'use client';

import { formatAmount } from '@/lib/utils/formatters';
import { useState } from 'react';

interface TaxAdjustment {
  id: number;
  type: string;
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
  confidenceScore?: number;
  notes?: string;
  createdAt?: string;
}

interface TaxAdjustmentCardProps {
  adjustment: TaxAdjustment;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onModify?: (id: number) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
}

export default function TaxAdjustmentCard({
  adjustment,
  onApprove,
  onReject,
  onModify,
  onDelete,
  showActions = true,
}: TaxAdjustmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUGGESTED':
        return 'bg-forvis-blue-100 text-forvis-blue-800 border-forvis-blue-300';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED':
        return 'bg-forvis-gray-200 text-forvis-gray-800 border-forvis-gray-300';
      case 'MODIFIED':
        return 'bg-forvis-blue-200 text-forvis-blue-900 border-forvis-blue-300';
      default:
        return 'bg-forvis-gray-100 text-forvis-gray-800 border-forvis-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DEBIT':
        return 'text-forvis-blue-700';
      case 'CREDIT':
        return 'text-forvis-blue-600';
      case 'ALLOWANCE':
        return 'text-forvis-blue-800';
      case 'RECOUPMENT':
        return 'text-forvis-blue-900';
      default:
        return 'text-forvis-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DEBIT':
        return 'Add Back';
      case 'CREDIT':
        return 'Deduct';
      case 'ALLOWANCE':
        return 'Allowance';
      case 'RECOUPMENT':
        return 'Recoupment';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-blue-200 hover:shadow-corporate-md transition-shadow p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-sm font-bold ${getTypeColor(adjustment.type)}`}>
              {getTypeLabel(adjustment.type)}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(adjustment.status)}`}>
              {adjustment.status}
            </span>
            {adjustment.confidenceScore && (
              <span className="text-xs text-forvis-blue-700 font-semibold">
                {Math.round(adjustment.confidenceScore * 100)}% confidence
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold text-forvis-gray-900 mb-2">
            {adjustment.description}
          </h3>

          <div className="flex items-center gap-4 text-sm text-forvis-gray-600">
            <span className="font-mono font-bold text-lg text-forvis-gray-900">
              {formatAmount(Math.abs(adjustment.amount))}
            </span>
            {adjustment.sarsSection && (
              <span className="text-xs bg-forvis-blue-100 px-2 py-1 rounded font-medium text-forvis-blue-800">
                {adjustment.sarsSection}
              </span>
            )}
          </div>

          {isExpanded && adjustment.notes && (
            <div className="mt-3 p-3 bg-forvis-blue-50 rounded text-sm text-forvis-gray-700 border border-forvis-blue-200">
              <p className="font-semibold mb-1 text-forvis-blue-900">Reasoning:</p>
              <p>{adjustment.notes}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 text-forvis-gray-400 hover:text-forvis-blue-600 transition-colors"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {showActions && adjustment.status === 'SUGGESTED' && (
        <div className="mt-4 flex flex-wrap gap-3 pt-4 border-t-2 border-forvis-blue-300">
          {onApprove && (
            <button
              onClick={() => onApprove(adjustment.id)}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-corporate-md hover:shadow-corporate-lg flex items-center gap-2 whitespace-nowrap"
              style={{ backgroundColor: '#16A34A', color: 'white' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ color: 'white', fontWeight: '600' }}>Approve</span>
            </button>
          )}
          {onModify && (
            <button
              onClick={() => onModify(adjustment.id)}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-corporate-md hover:shadow-corporate-lg flex items-center gap-2 whitespace-nowrap"
              style={{ backgroundColor: '#2E5AAC', color: 'white' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span style={{ color: 'white', fontWeight: '600' }}>Modify</span>
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(adjustment.id)}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-corporate-md hover:shadow-corporate-lg flex items-center gap-2 whitespace-nowrap"
              style={{ backgroundColor: '#6B7280', color: 'white' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span style={{ color: 'white', fontWeight: '600' }}>Reject</span>
            </button>
          )}
        </div>
      )}

      {showActions && (adjustment.status === 'APPROVED' || adjustment.status === 'MODIFIED') && onDelete && (
        <div className="mt-4 flex gap-2 pt-3 border-t border-forvis-gray-200">
          <button
            onClick={() => onDelete(adjustment.id)}
            className="px-3 py-1.5 text-sm bg-forvis-gray-600 text-white rounded-lg hover:bg-forvis-gray-700 transition-colors shadow-corporate hover:shadow-corporate-md"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}


