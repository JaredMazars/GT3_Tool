'use client';

/**
 * My Reports View with Sub-tabs
 * 
 * Displays different report types as tabs within the My Workspace section
 */

import { useState } from 'react';
import { Folder, FileBarChart, LayoutDashboard, Banknote } from 'lucide-react';
import { ProfitabilityReport } from './ProfitabilityReport';
import { MyReportsOverview } from './MyReportsOverview';
import { RecoverabilityReport } from './RecoverabilityReport';

type ReportTab = 'overview' | 'profitability' | 'recoverability' | 'coming-soon';

export function MyReportsView() {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('overview');

  return (
    <div className="bg-forvis-gray-50 rounded-lg border border-forvis-gray-200 shadow-sm p-4">
      {/* Report Sub-tabs */}
      <div className="mb-4 border-b border-forvis-gray-200">
        <nav className="flex space-x-2 -mb-px">
          <button
            onClick={() => setActiveReportTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeReportTab === 'overview'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>Overview</span>
            </div>
          </button>

          <button
            onClick={() => setActiveReportTab('profitability')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeReportTab === 'profitability'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <span>Profitability</span>
            </div>
          </button>

          <button
            onClick={() => setActiveReportTab('recoverability')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeReportTab === 'recoverability'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              <span>Recoverability</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveReportTab('coming-soon')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeReportTab === 'coming-soon'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              <span>More Reports</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Report Content */}
      <div className="mt-4">
        {activeReportTab === 'overview' ? (
          <MyReportsOverview />
        ) : activeReportTab === 'profitability' ? (
          <ProfitabilityReport />
        ) : activeReportTab === 'recoverability' ? (
          <RecoverabilityReport />
        ) : (
          /* More Reports Coming Soon Placeholder */
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div
                className="inline-flex rounded-full p-4 mb-4"
                style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
              >
                <FileBarChart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-forvis-gray-900 mb-2">
                More Reports Coming Soon
              </h3>
              <p className="text-sm text-forvis-gray-700 mb-4">
                Additional personal reports and analytics will be available here.
              </p>
              <div className="rounded-lg p-4 border border-forvis-blue-100" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}>
                <p className="text-xs text-forvis-gray-600">
                  Expected features: Client Analytics, Performance Reports, and more
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

