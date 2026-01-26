'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Landmark,
  Receipt,
  Wallet,
  Calculator,
} from 'lucide-react';
import { isValidServiceLine, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { GRADIENTS } from '@/lib/design-system/gradients';

const reports = [
  {
    id: 'financial-position',
    name: 'Financial Position',
    description: 'Balance sheet overview including assets, liabilities, and equity analysis',
    icon: Landmark,
  },
  {
    id: 'profit-loss',
    name: 'Profit & Loss Dashboard',
    description: 'Revenue, expenses, and profitability analysis across the organization',
    icon: Receipt,
  },
  {
    id: 'working-capital',
    name: 'Working Capital & Cash',
    description: 'Lock-up days, cash flow analysis, and liquidity metrics',
    icon: Wallet,
  },
  {
    id: 'forecasting-budgeting',
    name: 'Forecasting & Budgeting',
    description: 'Budget vs actual analysis and financial forecasting reports',
    icon: Calculator,
  },
];

export default function FinancialAnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const { setCurrentServiceLine } = useServiceLine();

  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else if (serviceLine !== 'COUNTRY_MANAGEMENT') {
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
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/exco-reporting`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            Exco Reporting
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Financial Analysis</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: GRADIENTS.icon.standard }}
            >
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-forvis-gray-900">
                Financial Analysis
              </h1>
              <p className="text-sm text-forvis-gray-600">
                Financial position, profit & loss, working capital, and forecasting reports
              </p>
            </div>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.id}
                href={`/dashboard/${serviceLine.toLowerCase()}/exco-reporting/financial-analysis/${report.id}`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background: GRADIENTS.dashboard.hover,
                  }}
                />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
                      style={{ background: GRADIENTS.icon.standard }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        {report.name}
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
