'use client';

import { useState, useEffect } from 'react';
import { AITaxReportData } from '@/lib/aiTaxReportGenerator';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  InformationCircleIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface AITaxReportProps {
  projectId: number;
  onReportLoaded?: (report: AITaxReportData | null) => void;
}

export default function AITaxReport({ projectId, onReportLoaded }: AITaxReportProps) {
  const [report, setReport] = useState<AITaxReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['executive', 'risks', 'sensitive'])
  );

  // Fetch existing report on mount
  useEffect(() => {
    fetchExistingReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Notify parent when report changes
  useEffect(() => {
    if (onReportLoaded) {
      onReportLoaded(report);
    }
  }, [report, onReportLoaded]);

  const fetchExistingReport = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-tax-report`);
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
      // If 404, no report exists yet - that's fine
    } catch (err) {
      console.error('Error fetching existing report:', err);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/ai-tax-report`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getSeverityIcon = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <InformationCircleIcon className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <CheckCircleIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  if (!report && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <SparklesIcon className="w-16 h-16 text-indigo-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          AI Tax Report
        </h3>
        <p className="text-gray-600 text-center mb-6 max-w-2xl">
          Generate a comprehensive AI-powered tax analysis that reviews your financial statements,
          tax adjustments, and identifies potential risks and tax-sensitive items.
        </p>
        <button
          onClick={generateReport}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
        >
          <SparklesIcon className="w-5 h-5" />
          Generate AI Tax Report
        </button>
        <p className="text-sm text-gray-500 mt-3">
          This process takes approximately 30-60 seconds
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Generating AI Tax Report...
        </h3>
        <p className="text-gray-600 text-center max-w-md">
          Our AI is analyzing your financial data, tax adjustments, and identifying risks.
          This may take up to 60 seconds.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Error Generating Report
        </h3>
        <p className="text-red-600 text-center mb-6 max-w-md">{error}</p>
        <button
          onClick={generateReport}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with regenerate button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Tax Analysis Report</h2>
          <p className="text-sm text-gray-600 mt-1">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Regenerate Report
        </button>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none">
        <button
          onClick={() => toggleSection('executive')}
          className="w-full px-6 py-4 flex justify-between items-center bg-indigo-50 hover:bg-indigo-100 transition-colors print:bg-white"
        >
          <h3 className="text-lg font-semibold text-gray-900">Executive Summary</h3>
          <span className="text-gray-500 print:hidden">
            {expandedSections.has('executive') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('executive') && (
          <div className="px-6 py-4 prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{report.executiveSummary}</p>
          </div>
        )}
      </div>

      {/* Risk Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none">
        <button
          onClick={() => toggleSection('risks')}
          className="w-full px-6 py-4 flex justify-between items-center bg-red-50 hover:bg-red-100 transition-colors print:bg-white"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Risk Analysis ({report.risks.length} risks identified)
          </h3>
          <span className="text-gray-500 print:hidden">
            {expandedSections.has('risks') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('risks') && (
          <div className="px-6 py-4 space-y-4">
            {report.risks.map((risk, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-2">
                  {getSeverityIcon(risk.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{risk.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(
                          risk.severity
                        )}`}
                      >
                        {risk.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{risk.description}</p>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs font-medium text-blue-900 mb-1">
                        Recommendation:
                      </p>
                      <p className="text-sm text-blue-800">{risk.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tax-Sensitive Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none">
        <button
          onClick={() => toggleSection('sensitive')}
          className="w-full px-6 py-4 flex justify-between items-center bg-yellow-50 hover:bg-yellow-100 transition-colors print:bg-white"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Tax-Sensitive Items ({report.taxSensitiveItems.length} items)
          </h3>
          <span className="text-gray-500 print:hidden">
            {expandedSections.has('sensitive') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('sensitive') && (
          <div className="px-6 py-4">
            <div className="grid gap-3">
              {report.taxSensitiveItems.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-yellow-200 rounded-lg p-4 bg-yellow-50"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">{item.item}</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Reason:</span> {item.reason}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Action Required:</span> {item.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Findings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none">
        <button
          onClick={() => toggleSection('findings')}
          className="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors print:bg-white"
        >
          <h3 className="text-lg font-semibold text-gray-900">Detailed Findings</h3>
          <span className="text-gray-500 print:hidden">
            {expandedSections.has('findings') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('findings') && (
          <div className="px-6 py-4 prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{report.detailedFindings}</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none">
        <button
          onClick={() => toggleSection('recommendations')}
          className="w-full px-6 py-4 flex justify-between items-center bg-green-50 hover:bg-green-100 transition-colors print:bg-white"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Recommendations ({report.recommendations.length} items)
          </h3>
          <span className="text-gray-500 print:hidden">
            {expandedSections.has('recommendations') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('recommendations') && (
          <div className="px-6 py-4">
            <ul className="space-y-3">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {idx + 1}
                  </span>
                  <p className="text-gray-700 flex-1">{rec}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

