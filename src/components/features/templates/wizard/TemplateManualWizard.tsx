'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ManualStep1Info, ManualWizardData } from './ManualStep1Info';
import { ManualStep2Sections } from './ManualStep2Sections';

interface TemplateManualWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (templateId: number) => void;
}

const WIZARD_STEPS = [
  { id: 1, label: 'Template Info' },
  { id: 2, label: 'Build Sections' },
];

export function TemplateManualWizard({
  isOpen,
  onClose,
  onSuccess,
}: TemplateManualWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [wizardData, setWizardData] = useState<ManualWizardData>({
    name: '',
    description: '',
    type: 'ENGAGEMENT_LETTER',
    serviceLine: '',
    active: true,
    sections: [],
  });

  const updateWizardData = (updates: Partial<ManualWizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (currentStep > 1 || wizardData.sections.length > 0) {
      if (
        !window.confirm(
          'You have unsaved changes. Are you sure you want to close?'
        )
      ) {
        return;
      }
    }
    setCurrentStep(1);
    setWizardData({
      name: '',
      description: '',
      type: 'ENGAGEMENT_LETTER',
      serviceLine: '',
      active: true,
      sections: [],
    });
    setError('');
    onClose();
  };

  const handleComplete = async () => {
    setIsCreating(true);
    setError('');

    try {
      const payload = {
        name: wizardData.name,
        description: wizardData.description || undefined,
        type: wizardData.type,
        serviceLine: wizardData.serviceLine || undefined,
        active: wizardData.active,
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
      handleClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-forvis-gray-200 flex items-center justify-between"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-xl font-semibold text-white">
              Create Template Manually
            </h2>
            {/* Stepper */}
            <div className="flex items-center gap-2 ml-8">
              {WIZARD_STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      step.id === currentStep
                        ? 'bg-white text-forvis-blue-600'
                        : step.id < currentStep
                        ? 'bg-forvis-blue-200 text-forvis-blue-700'
                        : 'bg-forvis-blue-700 text-white'
                    }`}
                  >
                    {step.id}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      step.id === currentStep
                        ? 'text-white'
                        : 'text-forvis-blue-100'
                    } hidden md:inline`}
                  >
                    {step.label}
                  </span>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-3 ${
                        step.id < currentStep
                          ? 'bg-forvis-blue-200'
                          : 'bg-forvis-blue-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-forvis-gray-200 transition-colors"
            aria-label="Close wizard"
            disabled={isCreating}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {currentStep === 1 && (
            <ManualStep1Info
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <ManualStep2Sections
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              onBack={handleBack}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
