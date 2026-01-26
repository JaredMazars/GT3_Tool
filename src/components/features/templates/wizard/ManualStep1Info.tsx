'use client';

import { Button } from '@/components/ui';

export interface ManualWizardData {
  name: string;
  description: string;
  type: string;
  serviceLine: string;
  active: boolean;
  sections: Array<{
    sectionKey: string;
    title: string;
    content: string;
    isRequired: boolean;
    isAiAdaptable: boolean;
    order: number;
    applicableServiceLines?: string[];
    applicableProjectTypes?: string[];
  }>;
}

interface ManualStep1InfoProps {
  wizardData: ManualWizardData;
  updateWizardData: (updates: Partial<ManualWizardData>) => void;
  onNext: () => void;
}

const TEMPLATE_TYPES = [
  { value: 'ENGAGEMENT_LETTER', label: 'Engagement Letter' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'AGREEMENT', label: 'Agreement' },
];

const SERVICE_LINES = [
  { value: '', label: 'None (All service lines)' },
  { value: 'TAX', label: 'Tax' },
  { value: 'AUDIT', label: 'Audit' },
  { value: 'ACCOUNTING', label: 'Accounting' },
  { value: 'ADVISORY', label: 'Advisory' },
];

export function ManualStep1Info({
  wizardData,
  updateWizardData,
  onNext,
}: ManualStep1InfoProps) {
  const handleNext = () => {
    if (!wizardData.name.trim()) {
      alert('Please enter a template name');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
          Template Information
        </h3>
        <p className="text-sm text-forvis-gray-600">
          Provide basic information about your template. You'll add sections in the next step.
        </p>
      </div>

      {/* Template Name */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={wizardData.name}
          onChange={(e) => updateWizardData({ name: e.target.value })}
          placeholder="e.g., Standard Tax Engagement Letter"
          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-forvis-gray-500">
          Choose a descriptive name that identifies the purpose of this template
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={wizardData.description}
          onChange={(e) => updateWizardData({ description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent resize-none"
          placeholder="Brief description of when to use this template..."
        />
      </div>

      {/* Type and Service Line */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Template Type <span className="text-red-500">*</span>
          </label>
          <select
            value={wizardData.type}
            onChange={(e) => updateWizardData({ type: e.target.value })}
            className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
          >
            {TEMPLATE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Service Line (Optional)
          </label>
          <select
            value={wizardData.serviceLine}
            onChange={(e) => updateWizardData({ serviceLine: e.target.value })}
            className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
          >
            {SERVICE_LINES.map((line) => (
              <option key={line.value} value={line.value}>
                {line.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-forvis-gray-500">
            Leave as "None" if applicable to all service lines
          </p>
        </div>
      </div>

      {/* Active Status */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={wizardData.active}
            onChange={(e) => updateWizardData({ active: e.target.checked })}
            className="w-4 h-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
          />
          <span className="text-sm font-medium text-forvis-gray-700">
            Set as active template
          </span>
        </label>
        <p className="ml-6 text-xs text-forvis-gray-500">
          Active templates are available for use in engagement letter generation
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-forvis-gray-200">
        <Button
          onClick={handleNext}
          disabled={!wizardData.name.trim()}
          style={{
            background: wizardData.name.trim()
              ? 'linear-gradient(to right, #2E5AAC, #25488A)'
              : undefined,
          }}
          className={!wizardData.name.trim() ? 'opacity-50 cursor-not-allowed' : ''}
        >
          Continue to Sections
        </Button>
      </div>
    </div>
  );
}
