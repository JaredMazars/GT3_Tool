'use client';

import { useState } from 'react';
import { ProjectType } from '@/types';
import { ClientSelector } from '../../features/clients/ClientSelector';
import { ProjectTypeSelector } from './ProjectTypeSelector';
import { TaxYearInput } from '../../shared/TaxYearInput';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: null as number | null,
    projectType: 'TAX_CALCULATION' as ProjectType,
    taxYear: new Date().getFullYear(),
    taxPeriodStart: null as Date | null,
    taxPeriodEnd: null as Date | null,
    assessmentYear: '',
    submissionDeadline: null as Date | null,
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setStep(prev => prev + 1);
    
    // Reset transition state after a short delay
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handlePrevStep = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setStep(prev => prev - 1);
    
    // Reset transition state after a short delay
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Only allow submission on step 3
    if (step !== 3) {
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const result = await response.json();
      const createdProject = result.success ? result.data : result;
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        clientId: null,
        projectType: 'TAX_CALCULATION' as ProjectType,
        taxYear: new Date().getFullYear(),
        taxPeriodStart: null,
        taxPeriodEnd: null,
        assessmentYear: '',
        submissionDeadline: null,
      });
      setStep(1);
      setIsTransitioning(false);
      
      onSuccess(createdProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      clientId: null,
      projectType: 'TAX_CALCULATION' as ProjectType,
      taxYear: new Date().getFullYear(),
      taxPeriodStart: null,
      taxPeriodEnd: null,
      assessmentYear: '',
      submissionDeadline: null,
    });
    setStep(1);
    setError('');
    setIsTransitioning(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
          
          {/* Step Indicator */}
          <div className="flex items-center mt-4 space-x-2">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
          
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Basic Info</span>
            <span>Project Type</span>
            <span>Tax Details</span>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional project description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client
                </label>
                <ClientSelector
                  value={formData.clientId}
                  onChange={(clientId) => handleFieldChange('clientId', clientId)}
                  allowCreate={false}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: Associate this project with a client
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Project Type */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Type <span className="text-red-500">*</span>
                </label>
                <ProjectTypeSelector
                  value={formData.projectType}
                  onChange={(type) => handleFieldChange('projectType', type)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Tax Details */}
          {step === 3 && (
            <div className="space-y-4">
              <TaxYearInput
                taxYear={formData.taxYear}
                taxPeriodStart={formData.taxPeriodStart}
                taxPeriodEnd={formData.taxPeriodEnd}
                assessmentYear={formData.assessmentYear}
                submissionDeadline={formData.submissionDeadline}
                onChange={handleFieldChange}
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isTransitioning}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isTransitioning || (step === 1 && !formData.name.trim())}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

