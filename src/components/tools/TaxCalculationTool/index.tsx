'use client';

import { useState } from 'react';
import { Table, FileText, Calculator, ClipboardList } from 'lucide-react';
import MappingPage from '@/app/dashboard/tasks/[id]/mapping/page';
import BalanceSheetPage from '@/app/dashboard/tasks/[id]/balance-sheet/page';
import IncomeStatementPage from '@/app/dashboard/tasks/[id]/income-statement/page';
import TaxCalculationPage from '@/app/dashboard/tasks/[id]/tax-calculation/page';
import ReportingPage from '@/app/dashboard/tasks/[id]/reporting/page';

interface TaxCalculationToolProps {
  taskId: string;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ params: { id: string } }>;
}

const tabs: Tab[] = [
  {
    id: 'mapping',
    label: 'Mapping',
    icon: Table,
    component: MappingPage,
  },
  {
    id: 'balance-sheet',
    label: 'Balance Sheet',
    icon: FileText,
    component: BalanceSheetPage,
  },
  {
    id: 'income-statement',
    label: 'Income Statement',
    icon: FileText,
    component: IncomeStatementPage,
  },
  {
    id: 'tax-calculation',
    label: 'Tax Calculation',
    icon: Calculator,
    component: TaxCalculationPage,
  },
  {
    id: 'reporting',
    label: 'Reporting',
    icon: ClipboardList,
    component: ReportingPage,
  },
];

export function TaxCalculationTool({ taskId }: TaxCalculationToolProps) {
  const [activeTab, setActiveTab] = useState('mapping');

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const Component = currentTab.component;

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-forvis-gray-900">Tax Calculation</h3>
          <p className="text-sm text-forvis-gray-600">Complete tax return calculations and reporting</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-forvis-gray-200">
        <nav className="flex space-x-6" aria-label="Tool tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        <Component params={{ id: taskId }} />
      </div>
    </div>
  );
}
