'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, 
  CheckCircle2, 
  FileCheck, 
  Shield, 
  FileText, 
  FileSignature,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useQRMMonitoringStats } from '@/hooks/qrm/useQRMMonitoringStats';
import { LoadingSpinner, Banner } from '@/components/ui';
import { isSharedService } from '@/lib/utils/serviceLineUtils';
import type { MetricStats, ServiceLineMonitoringStats } from '@/types/qrm';

interface MetricCardProps {
  label: string;
  stats: MetricStats;
  icon: React.ElementType;
  type: 'approved' | 'completed' | 'confirmed' | 'uploaded';
}

function MetricCard({ label, stats, icon: Icon, type }: MetricCardProps) {
  const value = stats[type] || 0;
  const ratio = stats.ratio;

  return (
    <div
      className="rounded-lg p-6 shadow-corporate border border-forvis-blue-100"
      style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-3xl font-bold mt-2 text-forvis-blue-600">
            {ratio.toFixed(1)}%
          </p>
          <p className="text-sm text-forvis-gray-600 mt-1">
            {value.toLocaleString()} of {stats.total.toLocaleString()}
          </p>
        </div>
        <div
          className="rounded-full p-3"
          style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

interface ServiceLineCardProps {
  stats: ServiceLineMonitoringStats;
}

function ServiceLineCard({ stats }: ServiceLineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const metrics = [
    {
      label: 'Client Acceptance',
      stats: stats.clientAcceptance,
      icon: CheckCircle2,
      type: 'approved' as const,
    },
    {
      label: 'Engagement Acceptance',
      stats: stats.engagementAcceptance,
      icon: FileCheck,
      type: 'completed' as const,
    },
    {
      label: 'Independence Confirmations',
      stats: stats.independenceConfirmations,
      icon: Shield,
      type: 'confirmed' as const,
    },
    {
      label: 'Engagement Letters',
      stats: stats.engagementLetters,
      icon: FileText,
      type: 'uploaded' as const,
    },
    {
      label: 'DPA Documents',
      stats: stats.dpaDocuments,
      icon: FileSignature,
      type: 'uploaded' as const,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-forvis-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-forvis-gray-900">
              {stats.serviceLineName}
            </h3>
          </div>
          <p className="text-sm text-forvis-gray-600 mt-1">
            {stats.description}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-forvis-gray-600 flex-shrink-0 ml-4" />
        ) : (
          <ChevronDown className="h-5 w-5 text-forvis-gray-600 flex-shrink-0 ml-4" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg p-4 border border-forvis-gray-200"
                style={{ background: 'linear-gradient(135deg, #F8F9FA 0%, #F0F7FD 100%)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className="w-4 h-4 text-forvis-blue-600" />
                  <p className="text-xs font-medium text-forvis-gray-600">
                    {metric.label}
                  </p>
                </div>
                <p className="text-2xl font-bold text-forvis-blue-600">
                  {metric.stats.ratio.toFixed(1)}%
                </p>
                <p className="text-xs text-forvis-gray-600 mt-1">
                  {(metric.stats[metric.type] || 0).toLocaleString()} of {metric.stats.total.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QRMMonitoringPage() {
  const { data, isLoading, error } = useQRMMonitoringStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
            <p className="ml-4 text-sm text-forvis-gray-600">Loading monitoring statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <Banner
            variant="error"
            message="Failed to load monitoring statistics. Please try again later."
          />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <Banner
            variant="info"
            message="No monitoring data available."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/dashboard/qrm" className="hover:text-forvis-gray-900 transition-colors">
            QRM
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Monitoring</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-forvis-gray-900">
            Quality & Risk Monitoring
          </h1>
          <p className="text-sm text-forvis-gray-600 mt-2">
            Track compliance statistics and quality metrics across all service lines
          </p>
        </div>

        {/* Firm-Wide Statistics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-forvis-gray-900 mb-4">
            Firm-Wide Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <MetricCard
              label="Client Acceptance"
              stats={data.firmWide.clientAcceptance}
              icon={CheckCircle2}
              type="approved"
            />
            <MetricCard
              label="Engagement Acceptance"
              stats={data.firmWide.engagementAcceptance}
              icon={FileCheck}
              type="completed"
            />
            <MetricCard
              label="Independence Confirmations"
              stats={data.firmWide.independenceConfirmations}
              icon={Shield}
              type="confirmed"
            />
            <MetricCard
              label="Engagement Letters"
              stats={data.firmWide.engagementLetters}
              icon={FileText}
              type="uploaded"
            />
            <MetricCard
              label="DPA Documents"
              stats={data.firmWide.dpaDocuments}
              icon={FileSignature}
              type="uploaded"
            />
          </div>
        </div>

        {/* Service Line Breakdown */}
        {data.byServiceLine.length > 0 && (
          <div className="space-y-8">
            {/* Client-Facing Services */}
            {(() => {
              const clientFacing = data.byServiceLine.filter(
                sl => !isSharedService(sl.serviceLine)
              );
              return clientFacing.length > 0 ? (
                <div>
                  <h2 className="text-xl font-semibold text-forvis-gray-900 mb-4">
                    Client-Facing Services
                  </h2>
                  <div className="space-y-3">
                    {clientFacing.map((slStats) => (
                      <ServiceLineCard key={slStats.serviceLine} stats={slStats} />
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Shared Services */}
            {(() => {
              const sharedServices = data.byServiceLine.filter(
                sl => isSharedService(sl.serviceLine)
              );
              return sharedServices.length > 0 ? (
                <div>
                  <h2 className="text-xl font-semibold text-forvis-gray-900 mb-4">
                    Shared Services
                  </h2>
                  <div className="space-y-3">
                    {sharedServices.map((slStats) => (
                      <ServiceLineCard key={slStats.serviceLine} stats={slStats} />
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* No Service Lines Message */}
        {data.byServiceLine.length === 0 && (
          <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-sm p-6 text-center">
            <p className="text-forvis-gray-600">
              No service line data available. Service line statistics will appear once tasks are active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
