'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui';
import { WizardData } from './TemplateUploadWizard';
import { useTemplateExtraction } from '@/hooks/templates/useTemplateExtraction';

interface Step2ProcessingProps {
  wizardData: WizardData;
  updateWizardData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type ProcessingStage =
  | 'uploading'
  | 'analyzing'
  | 'detecting'
  | 'complete'
  | 'error';

export function Step2Processing({
  wizardData,
  updateWizardData,
  onNext,
  onBack,
}: Step2ProcessingProps) {
  const [stage, setStage] = useState<ProcessingStage>('uploading');
  const { extractTemplate, isExtracting, error } = useTemplateExtraction();

  useEffect(() => {
    if (wizardData.file) {
      processFile();
    }
  }, []); // Only run on mount

  const processFile = async () => {
    if (!wizardData.file) return;

    try {
      setStage('uploading');

      const result = await extractTemplate(wizardData.file);

      setStage('analyzing');
      await new Promise((resolve) => setTimeout(resolve, 800));

      setStage('detecting');
      await new Promise((resolve) => setTimeout(resolve, 800));

      setStage('complete');

      // Update wizard data with extraction results
      updateWizardData({
        sections: result.blocks,
        tempBlobPath: result.tempBlobPath,
        originalFileName: result.originalFileName,
        extractedTextLength: result.extractedTextLength,
        templateName: wizardData.templateName || result.originalFileName,
      });

      // Auto-advance after short delay
      setTimeout(() => {
        onNext();
      }, 1000);
    } catch (err) {
      setStage('error');
      console.error('Extraction failed:', err);
    }
  };

  const handleRetry = () => {
    setStage('uploading');
    processFile();
  };

  const getStageMessage = () => {
    switch (stage) {
      case 'uploading':
        return 'Uploading document...';
      case 'analyzing':
        return 'AI analyzing document structure...';
      case 'detecting':
        return 'Detecting sections and placeholders...';
      case 'complete':
        return `Extraction complete! Found ${wizardData.sections?.length || 0} sections`;
      case 'error':
        return 'Failed to process document';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
          Processing Document
        </h3>
        <p className="text-sm text-forvis-gray-600">
          Our AI is analyzing your document to extract sections and identify
          dynamic content.
        </p>
      </div>

      {/* Processing Animation */}
      <div
        className="rounded-lg p-8"
        style={{
          background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
        }}
      >
        <div className="flex flex-col items-center space-y-6">
          {/* Icon/Status */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-corporate"
            style={{
              background:
                stage === 'error'
                  ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                  : stage === 'complete'
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
            }}
          >
            {stage === 'error' ? (
              <AlertCircle className="w-10 h-10 text-white" />
            ) : stage === 'complete' ? (
              <CheckCircle className="w-10 h-10 text-white" />
            ) : (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            )}
          </div>

          {/* Status Message */}
          <div className="text-center">
            <p className="text-lg font-semibold text-forvis-gray-900">
              {getStageMessage()}
            </p>
            {stage !== 'error' && stage !== 'complete' && (
              <p className="text-sm text-forvis-gray-600 mt-2">
                This may take up to 30 seconds...
              </p>
            )}
          </div>

          {/* Error Details */}
          {stage === 'error' && error && (
            <div className="w-full max-w-md">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          {stage !== 'error' && (
            <div className="w-full max-w-md space-y-3">
              <ProcessingStep
                label="Uploading document"
                isComplete={
                  stage === 'analyzing' ||
                  stage === 'detecting' ||
                  stage === 'complete'
                }
                isActive={stage === 'uploading'}
              />
              <ProcessingStep
                label="Analyzing structure"
                isComplete={stage === 'detecting' || stage === 'complete'}
                isActive={stage === 'analyzing'}
              />
              <ProcessingStep
                label="Detecting placeholders"
                isComplete={stage === 'complete'}
                isActive={stage === 'detecting'}
              />
            </div>
          )}

          {/* Extracted Sections Summary */}
          {stage === 'complete' && wizardData.sections && wizardData.sections.length > 0 && (
            <div className="w-full max-w-md">
              <div className="bg-white rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
                    }}
                  >
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-forvis-gray-900">
                      {wizardData.sections.length} sections extracted
                    </p>
                    <p className="text-xs text-forvis-gray-600">
                      {wizardData.sections.reduce(
                        (sum, s) => sum + (s.suggestedPlaceholders?.length || 0),
                        0
                      )}{' '}
                      placeholders detected
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-forvis-gray-200">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
        {stage === 'error' && (
          <Button
            onClick={handleRetry}
            style={{
              background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            }}
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

interface ProcessingStepProps {
  label: string;
  isComplete: boolean;
  isActive: boolean;
}

function ProcessingStep({
  label,
  isComplete,
  isActive,
}: ProcessingStepProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isComplete
            ? 'bg-green-500'
            : isActive
            ? 'bg-forvis-blue-500'
            : 'bg-forvis-gray-300'
        }`}
      >
        {isComplete ? (
          <CheckCircle className="w-4 h-4 text-white" />
        ) : isActive ? (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        ) : (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
      </div>
      <p
        className={`text-sm font-medium ${
          isComplete || isActive
            ? 'text-forvis-gray-900'
            : 'text-forvis-gray-500'
        }`}
      >
        {label}
      </p>
    </div>
  );
}
