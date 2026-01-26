'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ChevronRight, LayoutGrid, Clock } from 'lucide-react';
import { isValidServiceLine, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { GRADIENTS } from '@/lib/design-system/gradients';
import { Button } from '@/components/ui';

export default function ServiceLinePerformancePage() {
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
          <Link href={`/dashboard/${serviceLine.toLowerCase()}`} className="hover:text-forvis-gray-900 transition-colors">
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/dashboard/${serviceLine.toLowerCase()}/exco-reporting`} className="hover:text-forvis-gray-900 transition-colors">
            Exco Reporting
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/dashboard/${serviceLine.toLowerCase()}/exco-reporting/operations`} className="hover:text-forvis-gray-900 transition-colors">
            Operations & Productivity
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Service Line Performance</span>
        </nav>

        {/* Coming Soon Card */}
        <div 
          className="bg-gradient-dashboard-card rounded-lg border-2 p-8"
          style={{
            borderColor: '#2E5AAC',
          }}
        >
          <div className="text-center max-w-lg mx-auto">
            <div 
              className="w-16 h-16 rounded-xl mx-auto mb-6 flex items-center justify-center shadow-md"
              style={{ background: GRADIENTS.icon.standard }}
            >
              <LayoutGrid className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-2xl font-semibold text-forvis-gray-900 mb-2">
              Service Line Performance
            </h1>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-forvis-blue-100 text-forvis-blue-700 mb-4">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Coming Soon</span>
            </div>

            <p className="text-sm text-forvis-gray-600 mb-6">
              Comparative analysis and performance metrics across all service lines. 
              Track revenue, profitability, and growth by service line.
            </p>

            <Link
              href={`/dashboard/${serviceLine.toLowerCase()}/exco-reporting/operations`}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
              style={{ background: GRADIENTS.icon.standard }}
            >
              Back to Operations & Productivity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
