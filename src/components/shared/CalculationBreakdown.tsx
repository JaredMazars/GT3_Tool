'use client';

import { useState } from 'react';
import { formatAmount } from '@/lib/utils/formatters';

interface CalculationDetails {
  method: string;
  inputs: Record<string, unknown>;
  formula?: string;
}

interface CalculationBreakdownProps {
  calculationDetails: CalculationDetails;
  amount: number;
}

export default function CalculationBreakdown({
  calculationDetails,
  amount,
}: CalculationBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderInput = (key: string, value: unknown): React.ReactNode => {
    if (typeof value === 'number') {
      return formatAmount(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
    }
    return String(value);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">
            Calculation Method: {calculationDetails.method.replace(/_/g, ' ').toUpperCase()}
          </h4>
          
          {calculationDetails.formula && !isExpanded && (
            <p className="text-xs text-blue-700 font-mono">
              {calculationDetails.formula}
            </p>
          )}

          <p className="text-sm text-blue-800 mt-1">
            Result: <span className="font-bold">{formatAmount(amount)}</span>
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 text-blue-600 hover:text-blue-800"
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

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-300">
          {calculationDetails.formula && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-blue-900 uppercase mb-1">
                Formula
              </p>
              <p className="text-sm font-mono bg-white p-2 rounded border border-blue-200">
                {calculationDetails.formula}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase mb-2">
              Inputs
            </p>
            <div className="space-y-2 bg-white p-3 rounded border border-blue-200">
              {Object.entries(calculationDetails.inputs).map(([key, value]) => (
                <div key={key} className="flex justify-between items-start text-sm">
                  <span className="text-gray-700 font-medium">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-gray-900 font-mono ml-4">
                    {renderInput(key, value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


