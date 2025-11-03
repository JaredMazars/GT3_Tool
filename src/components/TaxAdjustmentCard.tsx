'use client';

import { formatAmount } from '@/lib/formatters';
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MODIFIED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DEBIT':
        return 'text-red-600';
      case 'CREDIT':
        return 'text-green-600';
      case 'ALLOWANCE':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
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
      default:
        return type;
    }
  };

  return (
    <div className="card-hover p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-semibold ${getTypeColor(adjustment.type)}`}>
              {getTypeLabel(adjustment.type)}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(adjustment.status)}`}>
              {adjustment.status}
            </span>
            {adjustment.confidenceScore && (
              <span className="text-xs text-forvis-gray-500">
                {Math.round(adjustment.confidenceScore * 100)}% confidence
              </span>
            )}
          </div>

          <h3 className="text-base font-medium text-forvis-gray-900 mb-1">
            {adjustment.description}
          </h3>

          <div className="flex items-center gap-4 text-sm text-forvis-gray-600">
            <span className="font-mono font-semibold text-lg">
              {formatAmount(Math.abs(adjustment.amount))}
            </span>
            {adjustment.sarsSection && (
              <span className="text-xs bg-forvis-gray-100 px-2 py-1 rounded">
                {adjustment.sarsSection}
              </span>
            )}
          </div>

          {isExpanded && adjustment.notes && (
            <div className="mt-3 p-3 bg-forvis-gray-50 rounded text-sm text-forvis-gray-700">
              <p className="font-semibold mb-1">Reasoning:</p>
              <p>{adjustment.notes}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 text-forvis-gray-400 hover:text-forvis-gray-600"
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
        <div className="mt-4 flex gap-2 pt-3 border-t border-forvis-gray-200">
          {onApprove && (
            <button
              onClick={() => onApprove(adjustment.id)}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-corporate hover:shadow-corporate-md"
            >
              Approve
            </button>
          )}
          {onModify && (
            <button
              onClick={() => onModify(adjustment.id)}
              className="px-3 py-1.5 text-sm bg-forvis-blue-500 text-white rounded-lg hover:bg-forvis-blue-600 transition-colors shadow-corporate hover:shadow-corporate-md"
            >
              Modify
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(adjustment.id)}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-corporate hover:shadow-corporate-md"
            >
              Reject
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


