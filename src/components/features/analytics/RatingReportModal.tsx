'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, FileText, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import { useCreditRating } from '@/hooks/analytics/useClientAnalytics';
import { CreditRatingGrade } from '@/types/analytics';

interface RatingReportModalProps {
  clientId: string | number;  // Can be internal ID or GSClientID depending on context
  ratingId: number;
  onClose: () => void;
}

export function RatingReportModal({ clientId, ratingId, onClose }: RatingReportModalProps) {
  const { data: rating, isLoading } = useCreditRating(clientId, ratingId);

  if (!rating && !isLoading) {
    return null;
  }

  const getRatingColor = (grade: CreditRatingGrade) => {
    switch (grade) {
      case CreditRatingGrade.AAA:
      case CreditRatingGrade.AA:
        return '#10B981';
      case CreditRatingGrade.A:
        return '#3B82F6';
      case CreditRatingGrade.BBB:
        return '#F59E0B';
      case CreditRatingGrade.BB:
      case CreditRatingGrade.B:
        return '#EF4444';
      case CreditRatingGrade.CCC:
      case CreditRatingGrade.D:
        return '#991B1B';
      default:
        return '#6B7280';
    }
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative bg-white rounded-lg shadow-corporate-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 px-6 py-4" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}>
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-xl font-bold text-white">
                      Credit Rating Report
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="rounded-lg p-2 text-white hover:bg-white/20 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
                  </div>
                ) : rating ? (
                  <div className="p-6 space-y-6">
                    {/* Rating Summary */}
                    <div className="rounded-xl p-6 border-2 shadow-lg" style={{ borderColor: getRatingColor(rating.ratingGrade as CreditRatingGrade), background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
                      <div className="flex items-center gap-6">
                        <div
                          className="flex-shrink-0 w-24 h-24 rounded-xl flex items-center justify-center shadow-xl"
                          style={{ background: `linear-gradient(to bottom right, ${getRatingColor(rating.ratingGrade as CreditRatingGrade)}, ${getRatingColor(rating.ratingGrade as CreditRatingGrade)}dd)` }}
                        >
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white">{rating.ratingGrade}</div>
                            <div className="text-sm font-medium text-white opacity-90">{rating.ratingScore}</div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold" style={{ color: '#1C3667' }}>Credit Rating: {rating.ratingGrade}</h3>
                          <p className="text-sm" style={{ color: '#2E5AAC' }}>
                            Score: {rating.ratingScore}/100 • Confidence: {(rating.confidence * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-forvis-gray-600 mt-1">
                            Generated on {new Date(rating.ratingDate).toLocaleDateString()} by {rating.analyzedBy}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div>
                      <h3 className="text-lg font-bold mb-3" style={{ color: '#1C3667' }}>Executive Summary</h3>
                      <div className="rounded-lg p-4" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)' }}>
                        <p className="text-sm text-forvis-gray-800 leading-relaxed whitespace-pre-line">
                          {rating.analysisReport.executiveSummary}
                        </p>
                      </div>
                    </div>

                    {/* Strengths */}
                    {rating.analysisReport.strengths.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#1C3667' }}>
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          Strengths
                        </h3>
                        <div className="space-y-2">
                          {rating.analysisReport.strengths.map((strength, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <p className="text-sm text-green-900 flex-1">{strength}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {rating.analysisReport.weaknesses.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#1C3667' }}>
                          <AlertTriangle className="h-6 w-6 text-amber-600" />
                          Weaknesses
                        </h3>
                        <div className="space-y-2">
                          {rating.analysisReport.weaknesses.map((weakness, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <p className="text-sm text-amber-900 flex-1">{weakness}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Risk Factors */}
                    {rating.analysisReport.riskFactors.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#1C3667' }}>
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                          Risk Factors
                        </h3>
                        <div className="space-y-3">
                          {rating.analysisReport.riskFactors.map((risk, index) => (
                            <div key={index} className={`p-4 rounded-lg border-2 ${
                              risk.severity === 'HIGH' 
                                ? 'bg-red-50 border-red-300' 
                                : risk.severity === 'MEDIUM' 
                                  ? 'bg-orange-50 border-orange-300' 
                                  : 'bg-yellow-50 border-yellow-300'
                            }`}>
                              <div className="flex items-start gap-3">
                                <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold ${
                                  risk.severity === 'HIGH' 
                                    ? 'bg-red-600 text-white' 
                                    : risk.severity === 'MEDIUM' 
                                      ? 'bg-orange-600 text-white' 
                                      : 'bg-yellow-600 text-white'
                                }`}>
                                  {risk.severity}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-forvis-gray-900 mb-1">{risk.factor}</p>
                                  <p className="text-sm text-forvis-gray-700 mb-2">{risk.impact}</p>
                                  {risk.mitigation && (
                                    <p className="text-xs text-forvis-gray-600 italic">
                                      <strong>Mitigation:</strong> {risk.mitigation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {rating.analysisReport.recommendations.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#1C3667' }}>
                          <Lightbulb className="h-6 w-6 text-blue-600" />
                          Recommendations
                        </h3>
                        <div className="space-y-2">
                          {rating.analysisReport.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <p className="text-sm text-blue-900 flex-1">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Analysis */}
                    <div>
                      <h3 className="text-lg font-bold mb-3" style={{ color: '#1C3667' }}>Detailed Analysis</h3>
                      <div className="rounded-lg p-4 border-2" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderColor: '#2E5AAC' }}>
                        <p className="text-sm text-forvis-gray-800 leading-relaxed whitespace-pre-line">
                          {rating.analysisReport.detailedAnalysis}
                        </p>
                      </div>
                    </div>

                    {/* Documents Analyzed */}
                    {rating.documents && rating.documents.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3" style={{ color: '#1C3667' }}>Documents Analyzed</h3>
                        <div className="space-y-2">
                          {rating.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-forvis-gray-50 border border-forvis-gray-200">
                              <FileText className="h-5 w-5 text-forvis-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-forvis-gray-900 truncate">{doc.fileName}</p>
                                <p className="text-xs text-forvis-gray-600">{doc.documentType.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Footer */}
                <div className="sticky bottom-0 z-10 px-6 py-4 bg-forvis-gray-50 border-t border-forvis-gray-200">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}















































