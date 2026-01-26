'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { WizardData } from './TemplateUploadWizard';

interface Step1UploadProps {
  wizardData: WizardData;
  updateWizardData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/msword': ['.doc'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

export function Step1Upload({
  wizardData,
  updateWizardData,
  onNext,
}: Step1UploadProps) {
  const [error, setError] = useState<string>('');

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError('');

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.file.size > MAX_FILE_SIZE) {
          setError('File is too large. Maximum size is 50MB.');
        } else {
          setError('Invalid file type. Please upload a PDF or Word document.');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file) {
          updateWizardData({
            file,
            templateName: file.name.replace(/\.(pdf|docx?|PDF|DOCX?)$/, ''),
          });
        }
      }
    },
    [updateWizardData]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleNext = () => {
    if (!wizardData.file) {
      setError('Please upload a file to continue');
      return;
    }
    if (!wizardData.templateType) {
      setError('Please select a template type');
      return;
    }
    onNext();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
          Upload Template Document
        </h3>
        <p className="text-sm text-forvis-gray-600">
          Upload an engagement letter, proposal, or agreement template. Our AI
          will analyze the structure and extract sections automatically.
        </p>
      </div>

      {/* File Upload Dropzone */}
      <div
        {...getRootProps()}
        className={`flex justify-center px-6 pt-5 pb-6 border-3 border-dashed rounded-xl cursor-pointer transition-all ${
          isDragActive
            ? 'border-forvis-blue-500 bg-forvis-blue-50'
            : 'border-forvis-blue-300 hover:border-forvis-blue-400'
        }`}
        style={{
          borderWidth: '3px',
          background: isDragActive
            ? 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)'
            : 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)',
        }}
      >
        <input {...getInputProps()} />
        <div className="space-y-3 text-center">
          <div
            className="mx-auto flex items-center justify-center h-16 w-16 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
            }}
          >
            <Upload className="h-8 w-8 text-white" />
          </div>
          <div className="flex text-sm text-forvis-gray-600">
            <p className="text-center w-full">
              {isDragActive ? (
                <span className="font-semibold text-forvis-blue-600">
                  Drop your file here
                </span>
              ) : (
                <>
                  <span className="font-semibold text-forvis-blue-600 hover:text-forvis-blue-500">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </>
              )}
            </p>
          </div>
          <p className="text-xs text-forvis-gray-500">
            PDF or Word documents up to 50MB
          </p>
        </div>
      </div>

      {/* Selected File Display */}
      {wizardData.file && (
        <div
          className="flex items-center gap-3 p-4 rounded-lg border border-forvis-blue-200"
          style={{
            background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
          }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
            }}
          >
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-forvis-gray-900 truncate">
              {wizardData.file.name}
            </p>
            <p className="text-xs text-forvis-gray-600">
              {formatFileSize(wizardData.file.size)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateWizardData({ file: null });
              setError('');
            }}
            className="text-forvis-gray-500 hover:text-forvis-red-600 transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Template Metadata */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Template Type <span className="text-red-500">*</span>
          </label>
          <select
            value={wizardData.templateType}
            onChange={(e) =>
              updateWizardData({ templateType: e.target.value })
            }
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
            Leave as "None" if this template applies to all service lines
          </p>
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

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-forvis-gray-200">
        <Button
          onClick={handleNext}
          disabled={!wizardData.file}
          style={{
            background: wizardData.file
              ? 'linear-gradient(to right, #2E5AAC, #25488A)'
              : undefined,
          }}
          className={!wizardData.file ? 'opacity-50 cursor-not-allowed' : ''}
        >
          Upload & Extract
        </Button>
      </div>
    </div>
  );
}
