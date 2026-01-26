'use client';

import { useState } from 'react';
import { Table, FileText, Calculator, ClipboardList } from 'lucide-react';
import { MappingAdapter } from './components/MappingAdapter';
import { BalanceSheetAdapter } from './components/BalanceSheetAdapter';
import { IncomeStatementAdapter } from './components/IncomeStatementAdapter';
import { TaxCalculationAdapter } from './components/TaxCalculationAdapter';
import { ReportingAdapter } from './components/ReportingAdapter';
import { taxCalculationToolConfig } from './config';
import type { ToolComponentProps } from '../types';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ taskId: string }>;
}

// Icon mapping for sub-tabs
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Table,
  FileText,
  Calculator,
  ClipboardList,
};

// Component mapping for sub-tabs
const componentMap: Record<string, React.ComponentType<{ taskId: string }>> = {
  'mapping': MappingAdapter,
  'balance-sheet': BalanceSheetAdapter,
  'income-statement': IncomeStatementAdapter,
  'tax-calculation': TaxCalculationAdapter,
  'reporting': ReportingAdapter,
};

export function TaxCalculationTool({ taskId, subTabs }: ToolComponentProps) {
  // Use DB sub-tabs if provided, otherwise use default from config
  const defaultTabs: Tab[] = [
    {
      id: 'mapping',
      label: 'Mapping',
      icon: Table,
      component: MappingAdapter,
    },
    {
      id: 'balance-sheet',
      label: 'Balance Sheet',
      icon: FileText,
      component: BalanceSheetAdapter,
    },
    {
      id: 'income-statement',
      label: 'Income Statement',
      icon: FileText,
      component: IncomeStatementAdapter,
    },
    {
      id: 'tax-calculation',
      label: 'Tax Calculation',
      icon: Calculator,
      component: TaxCalculationAdapter,
    },
    {
      id: 'reporting',
      label: 'Reporting',
      icon: ClipboardList,
      component: ReportingAdapter,
    },
  ];

  // Build tabs from DB sub-tabs or use defaults
  const tabs: Tab[] = subTabs && subTabs.length > 0
    ? subTabs
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((subTab) => {
          // Map sub-tab code to component
          const Component = componentMap[subTab.code] || (() => (
            <div className="p-6">Sub-tab "{subTab.name}" (Coming Soon)</div>
          ));

          // Get icon from subTab.icon or default based on code
          let IconComponent: React.ComponentType<{ className?: string }>;
          if (subTab.icon && iconMap[subTab.icon]) {
            IconComponent = iconMap[subTab.icon]!;
          } else if (componentMap[subTab.code]) {
            IconComponent = Table;
          } else {
            IconComponent = FileText;
          }

          return {
            id: subTab.code,
            label: subTab.name,
            icon: IconComponent,
            component: Component,
          };
        })
    : defaultTabs;

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'mapping');

  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  if (!currentTab) {
    return <div className="p-6">No tabs available</div>;
  }

  const Component = currentTab.component;

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-forvis-gray-900">{taxCalculationToolConfig.name}</h3>
          <p className="text-sm text-forvis-gray-600">{taxCalculationToolConfig.description}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      {tabs.length > 1 && (
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
      )}

      {/* Tab Content */}
      <div>
        <Component taskId={taskId} />
      </div>
    </div>
  );
}

// Export config for auto-discovery
export { taxCalculationToolConfig } from './config';








