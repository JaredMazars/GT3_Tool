'use client';

import { useState } from 'react';
import { FileText, Hash, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { WizardData } from './TemplateUploadWizard';
import {
  extractPlaceholdersFromContent,
  isStandardPlaceholder,
} from '@/types/templateExtraction';

interface Step4FinalizeProps {
  wizardData: WizardData;
  updateWizardData: (updates: Partial<WizardData>) => void;
  onBack: () => void;
  onSuccess: (templateId: number) => void;
}

export function Step4Finalize({
  wizardData,
  updateWizardData,
  onBack,
  onSuccess,
}: Step4FinalizeProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');

  // Calculate summary statistics
  const allPlaceholders = new Set<string>();
  wizardData.sections.forEach((section) => {
    const placeholders = extractPlaceholdersFromContent(section.content);
    placeholders.forEach((p) => allPlaceholders.add(p));
  });

  const standardPlaceholders = Array.from(allPlaceholders).filter((p) =>
    isStandardPlaceholder(p)
  );
  const customPlaceholders = Array.from(allPlaceholders).filter(
    (p) => !isStandardPlaceholder(p)
  );

  const handleCreate = async () => {
    if (!wizardData.templateName.trim()) {
      setError('Please enter a template name');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const payload = {
        name: wizardData.templateName,
        description: wizardData.description || undefined,
        type: wizardData.templateType,
        serviceLine: wizardData.serviceLine || undefined,
        active: true,
        tempBlobPath: wizardData.tempBlobPath,
        sections: wizardData.sections.map((section) => ({
          sectionKey: section.sectionKey,
          title: section.title,
          content: section.content,
          isRequired: section.isRequired,
          isAiAdaptable: section.isAiAdaptable,
          order: section.order,
          applicableServiceLines: section.applicableServiceLines?.length
            ? section.applicableServiceLines
            : undefined,
          applicableProjectTypes: section.applicableProjectTypes?.length
            ? section.applicableProjectTypes
            : undefined,
        })),
      };

      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }

      const data = await response.json();
      onSuccess(data.data.id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
          Finalize Template
        </h3>
        <p className="text-sm text-forvis-gray-600">
          Review your template details and create the template.
        </p>
      </div>

      {/* Template Name & Description */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Template Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={wizardData.templateName}
            onChange={(e) => updateWizardData({ templateName: e.target.value })}
            placeholder="e.g., Standard Engagement Letter"
            error={error && !wizardData.templateName.trim() ? error : undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={wizardData.description}
            onChange={(e) => updateWizardData({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent resize-none"
            placeholder="Brief description of this template..."
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={FileText}
          label="Sections"
          value={wizardData.sections.length}
          iconBg="linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)"
        />
        <SummaryCard
          icon={Hash}
          label="Total Placeholders"
          value={allPlaceholders.size}
          iconBg="linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Standard"
          value={standardPlaceholders.length}
          iconBg="linear-gradient(135deg, #10B981 0%, #059669 100%)"
        />
        <SummaryCard
          icon={AlertCircle}
          label="Custom"
          value={customPlaceholders.length}
          iconBg="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
        />
      </div>

      {/* Template Metadata Summary */}
      <div
        className="rounded-lg p-4 border border-forvis-blue-200"
        style={{
          background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
        }}
      >
        <h4 className="text-sm font-semibold text-forvis-gray-900 mb-3">
          Template Configuration
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-forvis-gray-600">Type</p>
            <p className="font-medium text-forvis-gray-900">
              {wizardData.templateType.replace(/_/g, ' ')}
            </p>
          </div>
          <div>
            <p className="text-forvis-gray-600">Service Line</p>
            <p className="font-medium text-forvis-gray-900">
              {wizardData.serviceLine || 'All'}
            </p>
          </div>
          <div>
            <p className="text-forvis-gray-600">Original File</p>
            <p className="font-medium text-forvis-gray-900 truncate">
              {wizardData.originalFileName}
            </p>
          </div>
          <div>
            <p className="text-forvis-gray-600">Extracted Text</p>
            <p className="font-medium text-forvis-gray-900">
              {wizardData.extractedTextLength.toLocaleString()} characters
            </p>
          </div>
        </div>
      </div>

      {/* Custom Placeholder Warning */}
      {customPlaceholders.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900">
              Custom Placeholders Detected
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              This template contains {customPlaceholders.length} custom
              placeholder{customPlaceholders.length > 1 ? 's' : ''} that will need
              data mapping:{' '}
              <span className="font-mono">
                {customPlaceholders.slice(0, 3).map((p) => `{{${p}}}`).join(', ')}
                {customPlaceholders.length > 3 && ', ...'}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-forvis-gray-200">
        <Button onClick={onBack} variant="secondary" disabled={isCreating}>
          Back
        </Button>
        <Button
          onClick={handleCreate}
          disabled={isCreating || !wizardData.templateName.trim()}
          style={{
            background:
              isCreating || !wizardData.templateName.trim()
                ? undefined
                : 'linear-gradient(to right, #2E5AAC, #25488A)',
          }}
          className={
            isCreating || !wizardData.templateName.trim()
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }
        >
          {isCreating ? 'Creating Template...' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  iconBg: string;
}

function SummaryCard({ icon: Icon, label, value, iconBg }: SummaryCardProps) {
  return (
    <div
      className="rounded-lg p-4 border border-forvis-blue-100"
      style={{
        background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 text-forvis-blue-600">{value}</p>
        </div>
        <div
          className="rounded-full p-2"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
