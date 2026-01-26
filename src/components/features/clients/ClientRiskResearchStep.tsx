/**
 * Client Risk Research Step Component
 * First step in client acceptance - AI-powered company risk research
 */

'use client';

import { useState } from 'react';
import { Search, Building2, CheckCircle, AlertTriangle, SkipForward } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import { CompanyResearchModal } from '@/components/features/bd/CompanyResearchModal';
import type { CompanyResearchResult } from '@/lib/services/bd/companyResearchAgent';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface ClientRiskResearchStepProps {
  GSClientID: string;
  clientName: string | null;
  existingResearch?: CompanyResearchResult | null;
  researchSkipped?: boolean;
  onComplete?: (researchData?: CompanyResearchResult) => void;
  onSkip?: () => void;
  readOnly?: boolean;
}

export function ClientRiskResearchStep({
  GSClientID,
  clientName,
  existingResearch,
  researchSkipped = false,
  onComplete,
  onSkip,
  readOnly = false,
}: ClientRiskResearchStepProps) {
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<CompanyResearchResult | null>(existingResearch || null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResearch = async () => {
    setIsResearching(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/clients/${GSClientID}/acceptance/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to research company');
      }

      const data = await res.json();
      setResearchResult(data.data);
      setShowModal(true);
      onComplete?.(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to research company');
    } finally {
      setIsResearching(false);
    }
  };

  const handleSkipClick = async () => {
    await onSkip?.();
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-forvis-success-600 bg-forvis-success-50 border-forvis-success-200';
      case 'MEDIUM': return 'text-forvis-warning-600 bg-forvis-warning-50 border-forvis-warning-200';
      case 'HIGH': return 'text-forvis-error-600 bg-forvis-error-50 border-forvis-error-200';
      default: return 'text-forvis-gray-600 bg-forvis-gray-50 border-forvis-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div
        className="rounded-lg p-6 border border-forvis-blue-100"
        style={{ background: GRADIENTS.dashboard.card }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: GRADIENTS.icon.standard }}
          >
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-forvis-gray-900">Step 1: Company Risk Research</h2>
            <p className="text-sm text-forvis-gray-600 mt-1">
              AI-powered research to assess client background and risks
            </p>
          </div>
        </div>

        {!researchResult && !isResearching && !readOnly && !researchSkipped && (
          <div className="bg-white rounded-lg p-4 border border-forvis-gray-200">
            <p className="text-sm text-forvis-gray-700 mb-4">
              Before beginning the acceptance questionnaire, we'll research <strong>{clientName || GSClientID}</strong> using
              AI-powered web search to gather information about their business, financial health, and potential risks.
            </p>
            <div className="flex gap-3">
              <Button
                variant="gradient"
                onClick={handleResearch}
                disabled={isResearching}
              >
                <Search className="h-4 w-4 mr-2" />
                Start Research
              </Button>
              <Button
                variant="secondary"
                onClick={handleSkipClick}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip Research
              </Button>
            </div>
          </div>
        )}

        {researchSkipped && !researchResult && !isResearching && (
          <div className="bg-white rounded-lg p-5 border border-forvis-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-6 w-6 text-forvis-success-600" />
              <div>
                <h3 className="text-sm font-semibold text-forvis-gray-900">Research Skipped</h3>
                <p className="text-xs text-forvis-gray-600">
                  You chose to skip the AI-powered research step
                </p>
              </div>
            </div>
            {!readOnly && (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleResearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Run Research Now
                </Button>
              </div>
            )}
          </div>
        )}

        {!researchResult && !isResearching && readOnly && !researchSkipped && (
          <div className="bg-white rounded-lg p-4 border border-forvis-gray-200">
            <p className="text-sm text-forvis-gray-600 italic">
              No research data available for this acceptance.
            </p>
          </div>
        )}

        {isResearching && (
          <div className="bg-white rounded-lg p-6 border border-forvis-gray-200">
            <div className="flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-forvis-gray-600">
                Researching company information...
              </p>
              <p className="mt-1 text-xs text-forvis-gray-500">
                This may take a few moments
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-forvis-error-50 border border-forvis-error-200 rounded-lg p-4">
            <p className="text-sm text-forvis-error-700">{error}</p>
            <div className="mt-3 flex gap-3">
              <Button
                variant="secondary"
                onClick={handleResearch}
              >
                Retry
              </Button>
              <Button
                variant="secondary"
                onClick={handleSkipClick}
              >
                Skip Research
              </Button>
            </div>
          </div>
        )}

        {researchResult && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-5 border border-forvis-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-forvis-success-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-forvis-gray-900">Research Complete</h3>
                    <p className="text-xs text-forvis-gray-600">
                      Searched {new Date(researchResult.searchedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(researchResult.riskAssessment.overallRisk)}`}>
                  {researchResult.riskAssessment.overallRisk} Risk
                </span>
              </div>

              {/* Quick Summary */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-forvis-gray-500 uppercase tracking-wider mb-1">Industry</p>
                  <p className="text-sm font-medium text-forvis-gray-900">{researchResult.overview.industry}</p>
                </div>

                {researchResult.riskAssessment.concerns.length > 0 && (
                  <div>
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider mb-2">Key Concerns</p>
                    <ul className="space-y-1">
                      {researchResult.riskAssessment.concerns.slice(0, 3).map((concern, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-forvis-gray-700">
                          <AlertTriangle className="h-4 w-4 text-forvis-warning-500 mt-0.5 flex-shrink-0" />
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {researchResult.riskAssessment.positiveIndicators.length > 0 && (
                  <div>
                    <p className="text-xs text-forvis-gray-500 uppercase tracking-wider mb-2">Positive Indicators</p>
                    <ul className="space-y-1">
                      {researchResult.riskAssessment.positiveIndicators.slice(0, 2).map((indicator, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-forvis-gray-700">
                          <CheckCircle className="h-4 w-4 text-forvis-success-500 mt-0.5 flex-shrink-0" />
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-forvis-gray-200 flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowModal(true)}
                >
                  View Full Report
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleResearch}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Re-research
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Research Modal */}
      <CompanyResearchModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        companyName={clientName || GSClientID}
        result={researchResult}
        isLoading={false}
        error={null}
      />
    </div>
  );
}
