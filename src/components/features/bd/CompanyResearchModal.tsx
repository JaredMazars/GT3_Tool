/**
 * Company Research Modal Component
 * Displays AI-powered company research results
 */

'use client';

import React from 'react';
import { X, Building2, AlertTriangle, TrendingUp, FileCheck, ExternalLink, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import type { CompanyResearchResult } from '@/lib/services/bd/companyResearchAgent';
import { LoadingSpinner } from '@/components/ui';

interface CompanyResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  result: CompanyResearchResult | null;
  isLoading: boolean;
  error: Error | null;
}

export function CompanyResearchModal({
  isOpen,
  onClose,
  companyName,
  result,
  isLoading,
  error,
}: CompanyResearchModalProps) {
  if (!isOpen) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-forvis-gray-600 bg-forvis-gray-50 border-forvis-gray-200';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600';
      case 'STABLE': return 'text-blue-600';
      case 'CONCERNING': return 'text-red-600';
      default: return 'text-forvis-gray-600';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'bg-green-100 text-green-700';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700';
      case 'LOW': return 'bg-red-100 text-red-700';
      default: return 'bg-forvis-gray-100 text-forvis-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Company Research</h2>
              <p className="text-sm text-white/80">{companyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-forvis-gray-600">
                Researching company information...
              </p>
              <p className="mt-1 text-xs text-forvis-gray-500">
                This may take a few moments
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-sm text-red-600 font-medium">Research Failed</p>
              <p className="mt-1 text-xs text-forvis-gray-500">{error.message}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-forvis-gray-100 rounded-lg hover:bg-forvis-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-6">
              {/* Confidence Badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                  {result.confidence} Confidence
                </span>
                <span className="text-xs text-forvis-gray-500">
                  Searched: {new Date(result.searchedAt).toLocaleString()}
                </span>
              </div>

              {/* Overview Section */}
              <div
                className="rounded-lg p-5 border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-forvis-blue-600" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900">Company Overview</h3>
                </div>
                <p className="text-sm text-forvis-gray-700 mb-4">{result.overview.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Industry</p>
                    <p className="text-sm font-medium text-forvis-gray-900">{result.overview.industry}</p>
                  </div>
                  <div>
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Sector</p>
                    <p className="text-sm font-medium text-forvis-gray-900">{result.overview.sector}</p>
                  </div>
                  <div>
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Size</p>
                    <p className="text-sm font-medium text-forvis-gray-900">{result.overview.estimatedSize}</p>
                  </div>
                  {result.overview.headquarters && (
                    <div>
                      <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Headquarters</p>
                      <p className="text-sm font-medium text-forvis-gray-900">{result.overview.headquarters}</p>
                    </div>
                  )}
                  {result.overview.founded && (
                    <div>
                      <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Founded</p>
                      <p className="text-sm font-medium text-forvis-gray-900">{result.overview.founded}</p>
                    </div>
                  )}
                  {result.overview.website && (
                    <div>
                      <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Website</p>
                      <a
                        href={result.overview.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-forvis-blue-600 hover:underline flex items-center gap-1"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Assessment Section */}
              <div className="rounded-lg border border-forvis-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-forvis-gray-600" />
                    <h3 className="text-sm font-semibold text-forvis-gray-900">Risk Assessment</h3>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(result.riskAssessment.overallRisk)}`}>
                    {result.riskAssessment.overallRisk} Risk
                  </span>
                </div>

                {/* Positive Indicators */}
                {result.riskAssessment.positiveIndicators.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider mb-2">Positive Indicators</p>
                    <ul className="space-y-1">
                      {result.riskAssessment.positiveIndicators.map((indicator, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-forvis-gray-700">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Factors */}
                {result.riskAssessment.riskFactors.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider mb-2">Risk Factors</p>
                    <ul className="space-y-2">
                      {result.riskAssessment.riskFactors.map((factor, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            factor.severity === 'HIGH' ? 'text-red-500' :
                            factor.severity === 'MEDIUM' ? 'text-amber-500' : 'text-forvis-gray-400'
                          }`} />
                          <div>
                            <span className="font-medium text-forvis-gray-900">{factor.category}:</span>{' '}
                            <span className="text-forvis-gray-700">{factor.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Concerns */}
                {result.riskAssessment.concerns.length > 0 && (
                  <div>
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider mb-2">Concerns</p>
                    <ul className="space-y-1">
                      {result.riskAssessment.concerns.map((concern, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-forvis-gray-700">
                          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Financial Health Section */}
              <div className="rounded-lg border border-forvis-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-forvis-gray-600" />
                    <h3 className="text-sm font-semibold text-forvis-gray-900">Financial Health</h3>
                  </div>
                  <span className={`text-sm font-medium ${getHealthColor(result.financialHealth.status)}`}>
                    {result.financialHealth.status}
                  </span>
                </div>

                {result.financialHealth.indicators.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider mb-2">Indicators</p>
                    <ul className="space-y-1">
                      {result.financialHealth.indicators.map((indicator, i) => (
                        <li key={i} className="text-sm text-forvis-gray-700">• {indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.financialHealth.recentNews.length > 0 && (
                  <div>
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider mb-2">Recent News</p>
                    <ul className="space-y-1">
                      {result.financialHealth.recentNews.map((news, i) => (
                        <li key={i} className="text-sm text-forvis-gray-700">• {news}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.financialHealth.indicators.length === 0 && result.financialHealth.recentNews.length === 0 && (
                  <p className="text-sm text-forvis-gray-500 italic">No financial information found</p>
                )}
              </div>

              {/* CIPC Status Section */}
              <div className="rounded-lg border border-forvis-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck className="h-5 w-5 text-forvis-gray-600" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900">CIPC Registration Status</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Registration Status</p>
                    <p className="text-sm font-medium text-forvis-gray-900">{result.cipcStatus.registrationStatus}</p>
                  </div>
                  {result.cipcStatus.companyType && (
                    <div>
                      <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Company Type</p>
                      <p className="text-sm font-medium text-forvis-gray-900">{result.cipcStatus.companyType}</p>
                    </div>
                  )}
                  {result.cipcStatus.registrationNumber && (
                    <div>
                      <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Registration Number</p>
                      <p className="text-sm font-medium text-forvis-gray-900">{result.cipcStatus.registrationNumber}</p>
                    </div>
                  )}
                  {result.cipcStatus.status && (
                    <div>
                      <p className="text-xs text-forvis-gray-500 uppercase tracking-wider">Business Status</p>
                      <p className="text-sm font-medium text-forvis-gray-900">{result.cipcStatus.status}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sources Section */}
              {result.sources.length > 0 && (
                <div className="rounded-lg border border-forvis-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-3">Sources ({result.sources.length})</h3>
                  <ul className="space-y-3">
                    {result.sources.slice(0, 5).map((source, i) => (
                      <li key={i} className="border-b border-forvis-gray-100 pb-3 last:border-0 last:pb-0">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-forvis-blue-600 hover:underline flex items-center gap-1"
                        >
                          {source.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-xs text-forvis-gray-500 mt-1 line-clamp-2">{source.snippet}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}










