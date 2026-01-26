'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Step1Upload } from './Step1Upload';
import { Step2Processing } from './Step2Processing';
import { Step3ReviewSections } from './Step3ReviewSections';
import { Step4Finalize } from './Step4Finalize';
import { ExtractedTemplateBlock } from '@/types/templateExtraction';

export interface WizardData {
  // Step 1: Upload
  file: File | null;
  templateType: string;
  serviceLine: string;
  description: string;

  // Step 2: Processing
  tempBlobPath: string;
  originalFileName: string;
  extractedTextLength: number;

  // Step 3: Review sections
  sections: ExtractedTemplateBlock[];

  // Step 4: Finalize
  templateName: string;
}

interface TemplateUploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (templateId: number) => void;
}

const WIZARD_STEPS = [
  { id: 1, label: 'Upload Document' },
  { id: 2, label: 'AI Processing' },
  { id: 3, label: 'Review & Edit' },
  { id: 4, label: 'Finalize' },
];

const STORAGE_KEY = 'template-wizard-state';

export function TemplateUploadWizard({
  isOpen,
  onClose,
  onSuccess,
}: TemplateUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [wizardData, setWizardData] = useState<WizardData>({
    file: null,
    templateType: 'ENGAGEMENT_LETTER',
    serviceLine: '',
    description: '',
    tempBlobPath: '',
    originalFileName: '',
    extractedTextLength: 0,
    sections: [],
    templateName: '',
  });

  // Auto-save wizard state to localStorage
  useEffect(() => {
    if (isOpen && hasUnsavedChanges) {
      const stateToSave = {
        ...wizardData,
        file: null, // Don't save File object
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [wizardData, hasUnsavedChanges, isOpen]);

  // Restore wizard state on mount
  useEffect(() => {
    if (isOpen) {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.sections?.length > 0) {
            // Only restore if we have meaningful progress
            setWizardData((prev) => ({ ...prev, ...parsed }));
            setHasUnsavedChanges(true);
          }
        } catch (error) {
          console.error('Failed to restore wizard state:', error);
        }
      }
    }
  }, [isOpen]);

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
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
    if (hasUnsavedChanges && currentStep > 1) {
      if (
        !window.confirm(
          'You have unsaved changes. Are you sure you want to close?'
        )
      ) {
        return;
      }
    }
    // Clear saved state
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(1);
    setHasUnsavedChanges(false);
    setWizardData({
      file: null,
      templateType: 'ENGAGEMENT_LETTER',
      serviceLine: '',
      description: '',
      tempBlobPath: '',
      originalFileName: '',
      extractedTextLength: 0,
      sections: [],
      templateName: '',
    });
    onClose();
  };

  const handleSuccess = (templateId: number) => {
    localStorage.removeItem(STORAGE_KEY);
    setHasUnsavedChanges(false);
    onSuccess(templateId);
    handleClose();
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
              Upload Template
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
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <Step1Upload
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <Step2Processing
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <Step3ReviewSections
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <Step4Finalize
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              onBack={handleBack}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
