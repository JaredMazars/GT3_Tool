'use client';

import { useState } from 'react';
import { BarChart3, Calendar, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useLatestCreditRating, useCreditRatings } from '@/hooks/analytics/useClientAnalytics';
import { CreditRating, CreditRatingGrade } from '@/types/analytics';
import { RatingReportModal } from './RatingReportModal';

interface CreditRatingsTabProps {
  clientId: string | number;  // Can be internal ID or GSClientID depending on context
}

export function CreditRatingsTab({ clientId }: CreditRatingsTabProps) {
  const GSClientID = clientId;  // Alias for backward compatibility with hooks
  const [selectedRatingId, setSelectedRatingId] = useState<number | null>(null);
  const { data: latestRating, isLoading: isLoadingLatest, error: latestError } = useLatestCreditRating(GSClientID);
  const { data: ratingsData, isLoading: isLoadingHistory, error: historyError } = useCreditRatings(GSClientID, { limit: 10 });

  const ratings = ratingsData?.ratings || [];
  const previousRating = ratings.length > 1 ? ratings[1] : null;

  const getRatingColor = (grade: CreditRatingGrade) => {
    switch (grade) {
      case CreditRatingGrade.AAA:
      case CreditRatingGrade.AA:
        return { bg: 'linear-gradient(to bottom right, #10B981, #059669)', text: 'text-white' };
      case CreditRatingGrade.A:
        return { bg: 'linear-gradient(to bottom right, #3B82F6, #2563EB)', text: 'text-white' };
      case CreditRatingGrade.BBB:
        return { bg: 'linear-gradient(to bottom right, #F59E0B, #D97706)', text: 'text-white' };
      case CreditRatingGrade.BB:
      case CreditRatingGrade.B:
        return { bg: 'linear-gradient(to bottom right, #EF4444, #DC2626)', text: 'text-white' };
      case CreditRatingGrade.CCC:
      case CreditRatingGrade.D:
        return { bg: 'linear-gradient(to bottom right, #991B1B, #7F1D1D)', text: 'text-white' };
      default:
        return { bg: 'linear-gradient(to bottom right, #6B7280, #4B5563)', text: 'text-white' };
    }
  };

  const getRatingDescription = (grade: CreditRatingGrade) => {
    switch (grade) {
      case CreditRatingGrade.AAA:
        return 'Exceptional - Minimal credit risk';
      case CreditRatingGrade.AA:
        return 'Excellent - Very low credit risk';
      case CreditRatingGrade.A:
        return 'Good - Low credit risk';
      case CreditRatingGrade.BBB:
        return 'Adequate - Moderate credit risk';
      case CreditRatingGrade.BB:
        return 'Speculative - Higher credit risk';
      case CreditRatingGrade.B:
        return 'Highly Speculative - Significant credit risk';
      case CreditRatingGrade.CCC:
        return 'Substantial Risk - Vulnerable';
      case CreditRatingGrade.D:
        return 'Default - Payment default';
      default:
        return 'Not rated';
    }
  };

  const calculateTrend = () => {
    if (!latestRating || !previousRating) return null;
    const change = latestRating.ratingScore - previousRating.ratingScore;
    return {
      change,
      percentage: previousRating.ratingScore > 0 
        ? ((change / previousRating.ratingScore) * 100).toFixed(1)
        : '0',
      isPositive: change > 0,
    };
  };

  const trend = calculateTrend();

  if (isLoadingLatest) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (!latestRating) {
    return (
      <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
        <BarChart3 className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} />
        <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>No credit ratings yet</h3>
        <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>
          Upload financial documents and generate your first credit rating to see analytics here
        </p>
      </div>
    );
  }

  const ratingColor = getRatingColor(latestRating.ratingGrade as CreditRatingGrade);

  return (
    <div className="space-y-6">
      {/* Latest Rating - Hero Section */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}>
          <h2 className="text-lg font-bold text-white">Current Credit Rating</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Rating Display */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-6">
                <div
                  className="flex-shrink-0 w-32 h-32 rounded-xl flex items-center justify-center shadow-xl"
                  style={{ background: ratingColor.bg }}
                >
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${ratingColor.text}`}>
                      {latestRating.ratingGrade}
                    </div>
                    <div className={`text-sm font-medium ${ratingColor.text} opacity-90 mt-1`}>
                      {latestRating.ratingScore}/100
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-forvis-gray-900">
                    {getRatingDescription(latestRating.ratingGrade as CreditRatingGrade)}
                  </h3>
                  <p className="text-sm text-forvis-gray-600 mt-2">
                    Confidence: {(latestRating.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-forvis-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Generated on {new Date(latestRating.ratingDate).toLocaleDateString()} by {latestRating.analyzedBy}
                  </p>

                  <button
                    onClick={() => setSelectedRatingId(latestRating.id)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    <FileText className="h-5 w-5" />
                    View Full Report
                  </button>
                </div>
              </div>
            </div>

            {/* Trend Indicator */}
            {trend && (
              <div className="lg:col-span-1">
                <div
                  className="rounded-lg p-4 shadow-corporate text-white h-full"
                  style={{ background: trend.isPositive ? 'linear-gradient(to bottom right, #10B981, #059669)' : 'linear-gradient(to bottom right, #EF4444, #DC2626)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium opacity-90">Rating Trend</p>
                      <p className="text-2xl font-bold mt-1">
                        {trend.isPositive ? '+' : ''}{trend.change}
                      </p>
                      <p className="text-sm opacity-90 mt-1">
                        {trend.isPositive ? '+' : ''}{trend.percentage}% vs previous
                      </p>
                    </div>
                    <div>
                      {trend.isPositive ? (
                        <TrendingUp className="h-10 w-10 opacity-80" />
                      ) : (
                        <TrendingDown className="h-10 w-10 opacity-80" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Overall Score</p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{latestRating.ratingScore}</p>
              <p className="text-xs text-forvis-gray-500 mt-1">out of 100</p>
            </div>
            <div
              className="rounded-full p-2.5"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div
          className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Risk Level</p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                {latestRating.ratingScore >= 70 ? 'Low' : latestRating.ratingScore >= 50 ? 'Medium' : 'High'}
              </p>
              <p className="text-xs text-forvis-gray-500 mt-1">credit risk</p>
            </div>
            <div
              className="rounded-full p-2.5"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div
          className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Confidence</p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{(latestRating.confidence * 100).toFixed(0)}%</p>
              <p className="text-xs text-forvis-gray-500 mt-1">analysis confidence</p>
            </div>
            <div
              className="rounded-full p-2.5"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div
          className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Documents</p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{latestRating.documents?.length || 0}</p>
              <p className="text-xs text-forvis-gray-500 mt-1">files analyzed</p>
            </div>
            <div
              className="rounded-full p-2.5"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              <FileText className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card">
        <div className="px-4 py-3 border-b border-forvis-gray-200 bg-forvis-gray-50">
          <h3 className="text-lg font-semibold text-forvis-gray-900">Executive Summary</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-forvis-gray-800 leading-relaxed whitespace-pre-line">
            {latestRating.analysisReport.executiveSummary}
          </p>
        </div>
      </div>

      {/* Rating History */}
      <div className="card">
        <div className="px-4 py-3 border-b border-forvis-gray-200 bg-forvis-gray-50">
          <h3 className="text-lg font-semibold text-forvis-gray-900">Rating History</h3>
        </div>
        <div className="p-6">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
            </div>
          ) : ratings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-forvis-gray-600">No rating history available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ratings.map((rating, index) => {
                  const ratingColor = getRatingColor(rating.ratingGrade as CreditRatingGrade);
                  const prevRating = index < ratings.length - 1 ? ratings[index + 1] : null;
                  const change = prevRating ? rating.ratingScore - prevRating.ratingScore : 0;

                  return (
                    <div
                      key={rating.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-forvis-gray-200 hover:border-forvis-blue-300 hover:shadow-corporate transition-all cursor-pointer"
                      onClick={() => setSelectedRatingId(rating.id)}
                    >
                      <div
                        className="flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center shadow-md"
                        style={{ background: ratingColor.bg }}
                      >
                        <div className="text-center">
                          <div className={`text-xl font-bold ${ratingColor.text}`}>
                            {rating.ratingGrade}
                          </div>
                          <div className={`text-xs ${ratingColor.text} opacity-90`}>
                            {rating.ratingScore}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-medium text-forvis-gray-900">
                          {getRatingDescription(rating.ratingGrade as CreditRatingGrade)}
                        </p>
                        <p className="text-xs text-forvis-gray-600 mt-1">
                          {new Date(rating.ratingDate).toLocaleDateString()} • Confidence: {(rating.confidence * 100).toFixed(0)}%
                        </p>
                      </div>

                      {change !== 0 && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {change > 0 ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                          <span>{change > 0 ? '+' : ''}{change}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Rating Report Modal */}
      {selectedRatingId && (
        <RatingReportModal
          clientId={GSClientID}
          ratingId={selectedRatingId}
          onClose={() => setSelectedRatingId(null)}
        />
      )}
    </div>
  );
}

