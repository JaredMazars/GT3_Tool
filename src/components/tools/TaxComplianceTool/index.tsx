'use client';

import { useState } from 'react';
import { Mail, Folder, ClipboardCheck, FileCheck } from 'lucide-react';

interface TaxComplianceToolProps {
  taskId: string;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  {
    id: 'sars-responses',
    label: 'SARS Responses',
    icon: Mail,
  },
  {
    id: 'document-management',
    label: 'Documents',
    icon: Folder,
  },
  {
    id: 'compliance-checklist',
    label: 'Compliance Checklist',
    icon: ClipboardCheck,
  },
  {
    id: 'filing-status',
    label: 'Filing Status',
    icon: FileCheck,
  },
];

export function TaxComplianceTool({ taskId }: TaxComplianceToolProps) {
  const [activeTab, setActiveTab] = useState('sars-responses');

  const renderContent = () => {
    switch (activeTab) {
      case 'sars-responses':
        return <div className="p-6">SARS Responses (Coming Soon)</div>;
      case 'document-management':
        return <div className="p-6">Document Management (Coming Soon)</div>;
      case 'compliance-checklist':
        return <div className="p-6">Compliance Checklist (Coming Soon)</div>;
      case 'filing-status':
        return <div className="p-6">Filing Status (Coming Soon)</div>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-forvis-gray-900">Tax Compliance</h3>
          <p className="text-sm text-forvis-gray-600">Manage SARS correspondence, compliance, and filing</p>
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
      <div>{renderContent()}</div>
    </div>
  );
}
