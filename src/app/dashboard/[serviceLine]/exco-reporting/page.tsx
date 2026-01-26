'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  ChevronRight,
  FileBarChart,
  TrendingUp,
  Users,
  Target,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { isValidServiceLine, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { GRADIENTS } from '@/lib/design-system/gradients';

const sections = [
  {
    id: 'financial-analysis',
    name: 'Financial Analysis',
    description: 'Financial position, profit & loss, working capital, and forecasting reports',
    icon: TrendingUp,
    reportCount: 4,
  },
  {
    id: 'operations',
    name: 'Operations & Productivity',
    description: 'Staff performance, utilization, partner metrics, and service line analysis',
    icon: Users,
    reportCount: 4,
  },
  {
    id: 'strategic',
    name: 'Strategic',
    description: 'Client portfolio, sector analysis, pipeline overview, and new business reports',
    icon: Target,
    reportCount: 4,
  },
  {
    id: 'risk-compliance',
    name: 'Risk & Compliance',
    description: 'Risk register and compliance monitoring reports',
    icon: ShieldCheck,
    reportCount: 1,
  },
];

export default function ExcoReportingPage() {
  const router = useRouter();
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const { setCurrentServiceLine } = useServiceLine();

  // Validate service line and ensure it's Country Management
  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else if (serviceLine !== 'COUNTRY_MANAGEMENT') {
      // Redirect non-Country Management service lines back to their dashboard
      router.push(`/dashboard/${serviceLine.toLowerCase()}`);
    } else {
      setCurrentServiceLine(serviceLine as ServiceLine);
    }
  }, [serviceLine, router, setCurrentServiceLine]);

  if (!isValidServiceLine(serviceLine) || serviceLine !== 'COUNTRY_MANAGEMENT') {
    return null;
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
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Exco Reporting</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: GRADIENTS.icon.standard }}
            >
              <FileBarChart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-forvis-gray-900">
                Exco Reporting
              </h1>
              <p className="text-sm text-forvis-gray-600">
                Executive committee reporting and business analysis
              </p>
            </div>
          </div>
        </div>

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.id}
                href={`/dashboard/${serviceLine.toLowerCase()}/exco-reporting/${section.id}`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
                }}
              >
                {/* Hover gradient overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(91, 147, 215, 0.06) 0%, rgba(46, 90, 172, 0.08) 100%)',
                  }}
                />

                <div className="p-5 relative z-[1]">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-bold text-forvis-gray-900 group-hover:text-forvis-blue-600 transition-colors duration-200">
                          {section.name}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-forvis-gray-600 mb-3 line-clamp-2">
                        {section.description}
                      </p>
                      <div className="inline-flex items-center px-2 py-1 rounded-full bg-forvis-blue-100 text-forvis-blue-700">
                        <span className="text-xs font-medium">{section.reportCount} {section.reportCount === 1 ? 'Report' : 'Reports'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
