'use client';

import { useState, useEffect } from 'react';
import { AITaxReportData } from '@/lib/tools/tax-opinion/services/aiTaxReportGenerator';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface AITaxReportProps {
  taskId: number;
  onReportLoaded?: (report: AITaxReportData | null) => void;
}

export default function AITaxReport({ taskId, onReportLoaded }: AITaxReportProps) {
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
  }, [taskId]);

  // Notify parent when report changes
  useEffect(() => {
    if (onReportLoaded) {
      onReportLoaded(report);
    }
  }, [report, onReportLoaded]);

  const fetchExistingReport = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/ai-tax-report`);
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
      // If 404, no report exists yet - that's fine
    } catch (err) {
      // Report doesn't exist yet
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/ai-tax-report`, {
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
        return 'text-white border-2';
      case 'medium':
        return 'border-2';
      case 'low':
        return 'border-2';
    }
  };

  const getSeverityStyle = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return { backgroundColor: '#1C3667', borderColor: '#132445' };
      case 'medium':
        return { backgroundColor: '#E8EDF5', borderColor: '#2E5AAC', color: '#1C3667' };
      case 'low':
        return { backgroundColor: '#F5F8FC', borderColor: '#5B93D7', color: '#25488A' };
    }
  };

  const getSeverityIcon = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-5 h-5" style={{ color: '#FFFFFF' }} />;
      case 'medium':
        return <Info className="w-5 h-5" style={{ color: '#2E5AAC' }} />;
      case 'low':
        return <CheckCircle className="w-5 h-5" style={{ color: '#5B93D7' }} />;
    }
  };

  if (!report && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="max-w-3xl w-full">
          {/* Header Card */}
          <div 
            className="rounded-lg p-8 mb-6 text-center shadow-corporate-lg border-2"
            style={{ 
              background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)',
              borderColor: '#25488A'
            }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              AI Tax Report
            </h3>
            <p className="text-white text-base leading-relaxed opacity-90">
              Generate a comprehensive AI-powered tax analysis that reviews your financial statements,
              tax adjustments, and identifies potential risks and tax-sensitive items.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border-2 shadow-corporate" style={{ borderColor: '#5B93D7' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8EDF5' }}>
                  <svg className="w-5 h-5" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-forvis-gray-900">Risk Analysis</h4>
              </div>
              <p className="text-sm text-forvis-gray-600">Identifies tax compliance risks and exposure areas</p>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 shadow-corporate" style={{ borderColor: '#5B93D7' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8EDF5' }}>
                  <svg className="w-5 h-5" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-forvis-gray-900">Sensitive Items</h4>
              </div>
              <p className="text-sm text-forvis-gray-600">Highlights items requiring special attention</p>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 shadow-corporate" style={{ borderColor: '#5B93D7' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8EDF5' }}>
                  <svg className="w-5 h-5" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="font-semibold text-forvis-gray-900">Recommendations</h4>
              </div>
              <p className="text-sm text-forvis-gray-600">Provides actionable tax optimization suggestions</p>
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={generateReport}
              className="px-8 py-4 text-white rounded-lg font-semibold text-lg flex items-center gap-3 shadow-corporate-lg hover:shadow-corporate-md transition-all duration-200 mx-auto transform hover:scale-105"
              style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
            >
              <Sparkles className="w-6 h-6" />
              Generate AI Tax Report
            </button>
            <p className="text-sm text-forvis-gray-600 mt-4 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generation takes approximately 30-60 seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full">
          {/* Main Loading Card */}
          <div 
            className="rounded-lg p-8 text-center shadow-corporate-lg border-2"
            style={{ 
              background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)',
              borderColor: '#25488A'
            }}
          >
            {/* Animated Spinner */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 relative" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
              <div className="absolute inset-3 border-4 border-white/30 rounded-full"></div>
              <div className="absolute inset-3 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-3">
              Generating AI Tax Report
            </h3>
            <p className="text-white text-base leading-relaxed opacity-90 mb-6">
              Our AI is analyzing your financial data, tax adjustments, and identifying potential risks and tax-sensitive items.
            </p>

            {/* Progress Steps */}
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 text-white">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-4 h-4" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Analyzing financial statements</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-4 h-4" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Reviewing tax adjustments</span>
                </div>
                <div className="flex items-center gap-3 text-white animate-pulse">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2E5AAC' }}></div>
                  </div>
                  <span className="text-sm font-medium">Identifying risks and opportunities</span>
                </div>
              </div>
            </div>

            <p className="text-white/80 text-sm mt-6 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              This typically takes 30-60 seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full">
          {/* Error Card */}
          <div className="bg-white rounded-lg p-8 text-center shadow-corporate-lg border-2 border-red-300">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 bg-red-100">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
            
            <h3 className="text-2xl font-bold text-forvis-gray-900 mb-3">
              Error Generating Report
            </h3>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm leading-relaxed">{error}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={generateReport}
                className="px-6 py-3 text-white rounded-lg font-semibold shadow-corporate hover:shadow-corporate-md transition-all duration-200 flex items-center gap-2 justify-center"
                style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={() => setError(null)}
                className="px-6 py-3 bg-white border-2 border-forvis-gray-300 text-forvis-gray-700 rounded-lg hover:bg-forvis-gray-50 transition-colors font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Should never reach here without a report, but TypeScript needs the check
  if (!report) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with regenerate button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-forvis-gray-900">AI Tax Analysis Report</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="px-4 py-2 bg-white border border-forvis-gray-300 text-forvis-gray-700 rounded-lg hover:bg-forvis-gray-50 transition-colors font-medium flex items-center gap-2 shadow-corporate hover:shadow-corporate-md"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate Report
        </button>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden print:shadow-none" style={{ borderColor: '#25488A' }}>
        <button
          onClick={() => toggleSection('executive')}
          className="w-full px-6 py-4 flex justify-between items-center transition-colors print:bg-white"
          style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}
        >
          <h3 className="text-lg font-semibold text-white">Executive Summary</h3>
          <span className="text-white print:hidden">
            {expandedSections.has('executive') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('executive') && (
          <div className="px-6 py-4 prose prose-sm max-w-none">
            <p className="text-forvis-gray-700 whitespace-pre-wrap">{report.executiveSummary}</p>
          </div>
        )}
      </div>

      {/* Risk Analysis */}
      <div className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden print:shadow-none" style={{ borderColor: '#25488A' }}>
        <button
          onClick={() => toggleSection('risks')}
          className="w-full px-6 py-4 flex justify-between items-center transition-colors print:bg-white"
          style={{ background: 'linear-gradient(to bottom right, #25488A, #1C3667)' }}
        >
          <h3 className="text-lg font-semibold text-white">
            Risk Analysis ({report.risks.length} risks identified)
          </h3>
          <span className="text-white print:hidden">
            {expandedSections.has('risks') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('risks') && (
          <div className="px-6 py-4 space-y-4">
            {report.risks.map((risk, idx) => (
              <div
                key={idx}
                className="border border-forvis-gray-200 rounded-lg p-4 hover:shadow-corporate transition-shadow shadow-sm"
              >
                <div className="flex items-start gap-3 mb-2">
                  {getSeverityIcon(risk.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-forvis-gray-900">{risk.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(
                          risk.severity
                        )}`}
                        style={getSeverityStyle(risk.severity)}
                      >
                        {risk.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-forvis-gray-700 mb-3">{risk.description}</p>
                    <div className="rounded p-3 border-2" style={{ backgroundColor: '#F5F8FC', borderColor: '#5B93D7' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: '#1C3667' }}>
                        Recommendation:
                      </p>
                      <p className="text-sm" style={{ color: '#25488A' }}>{risk.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tax-Sensitive Items */}
      <div className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden print:shadow-none" style={{ borderColor: '#25488A' }}>
        <button
          onClick={() => toggleSection('sensitive')}
          className="w-full px-6 py-4 flex justify-between items-center transition-colors print:bg-white"
          style={{ background: 'linear-gradient(to bottom right, #1C3667, #132445)' }}
        >
          <h3 className="text-lg font-semibold text-white">
            Tax-Sensitive Items ({report.taxSensitiveItems.length} items)
          </h3>
          <span className="text-white print:hidden">
            {expandedSections.has('sensitive') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('sensitive') && (
          <div className="px-6 py-4">
            <div className="grid gap-3">
              {report.taxSensitiveItems.map((item, idx) => (
                <div
                  key={idx}
                  className="border-2 rounded-lg p-4 shadow-sm"
                  style={{ borderColor: '#5B93D7', backgroundColor: '#F5F8FC' }}
                >
                  <h4 className="font-semibold text-forvis-gray-900 mb-2">{item.item}</h4>
                  <p className="text-sm text-forvis-gray-700 mb-2">
                    <span className="font-medium">Reason:</span> {item.reason}
                  </p>
                  <p className="text-sm text-forvis-gray-700">
                    <span className="font-medium">Action Required:</span> {item.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Findings */}
      <div className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden print:shadow-none" style={{ borderColor: '#25488A' }}>
        <button
          onClick={() => toggleSection('findings')}
          className="w-full px-6 py-4 flex justify-between items-center transition-colors print:bg-white"
          style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}
        >
          <h3 className="text-lg font-semibold text-white">Detailed Findings</h3>
          <span className="text-white print:hidden">
            {expandedSections.has('findings') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('findings') && (
          <div className="px-6 py-4 prose prose-sm max-w-none">
            <p className="text-forvis-gray-700 whitespace-pre-wrap">{report.detailedFindings}</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden print:shadow-none" style={{ borderColor: '#25488A' }}>
        <button
          onClick={() => toggleSection('recommendations')}
          className="w-full px-6 py-4 flex justify-between items-center transition-colors print:bg-white"
          style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
        >
          <h3 className="text-lg font-semibold text-white">
            Recommendations ({report.recommendations.length} items)
          </h3>
          <span className="text-white print:hidden">
            {expandedSections.has('recommendations') ? '−' : '+'}
          </span>
        </button>
        {expandedSections.has('recommendations') && (
          <div className="px-6 py-4">
            <ul className="space-y-3">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: '#2E5AAC' }}>
                    {idx + 1}
                  </span>
                  <p className="text-forvis-gray-700 flex-1">{rec}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

