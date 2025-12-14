'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import OpinionDraftingPage from '@/app/dashboard/tasks/[id]/opinion-drafting/page';

interface TaxAdvisoryToolProps {
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
    id: 'tax-opinion',
    label: 'Tax Opinion',
    icon: BookOpen,
    component: OpinionDraftingPage,
  },
];

export function TaxAdvisoryTool({ taskId }: TaxAdvisoryToolProps) {
  const [activeTab, setActiveTab] = useState('tax-opinion');

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const Component = currentTab.component;

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-forvis-gray-900">Tax Advisory</h3>
          <p className="text-sm text-forvis-gray-600">Draft and manage tax opinions and advisory documents</p>
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
