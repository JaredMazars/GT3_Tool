'use client';

import { useState } from 'react';

interface ExtractedData {
  documentType: string;
  summary: string;
  structuredData: Record<string, unknown>;
  confidence: number;
  warnings: string[];
}

interface ExtractionResultsProps {
  extractedData: ExtractedData;
  fileName?: string;
}

export default function ExtractionResults({
  extractedData,
  fileName,
}: ExtractionResultsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const renderStructuredData = (data: unknown, level = 0): React.ReactNode => {
    if (typeof data !== 'object' || data === null) {
      return <span className="text-gray-700">{String(data)}</span>;
    }

    if (Array.isArray(data)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {data.map((item, index) => (
            <li key={index} className="text-sm">
              {renderStructuredData(item, level + 1)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className={`space-y-2 ${level > 0 ? 'ml-4' : ''}`}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="font-semibold text-gray-700">{key}: </span>
            {renderStructuredData(value, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold text-gray-900">
              Extraction Results
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(
                extractedData.confidence
              )}`}
            >
              {Math.round(extractedData.confidence * 100)}% confidence
            </span>
          </div>

          {fileName && (
            <p className="text-sm text-gray-600 mb-2">
              File: <span className="font-mono">{fileName}</span>
            </p>
          )}

          <div className="mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Document Type
            </span>
            <p className="text-sm text-gray-700">{extractedData.documentType}</p>
          </div>

          <div className="mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Summary
            </span>
            <p className="text-sm text-gray-700">{extractedData.summary}</p>
          </div>

          {extractedData.warnings && extractedData.warnings.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs font-semibold text-yellow-800 mb-1">
                ⚠️ Warnings
              </p>
              <ul className="list-disc list-inside space-y-1">
                {extractedData.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 text-gray-400 hover:text-gray-600"
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
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Extracted Data
          </p>
          <div className="bg-gray-50 rounded p-3 max-h-96 overflow-auto">
            {renderStructuredData(extractedData.structuredData)}
          </div>
        </div>
      )}
    </div>
  );
}


