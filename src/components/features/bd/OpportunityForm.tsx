/**
 * BD Opportunity Form Component
 * For creating and editing opportunities
 */

'use client';

import React, { useState } from 'react';
import type { CreateBDOpportunityInput } from '@/lib/validation/schemas';

interface OpportunityFormProps {
  initialData?: Partial<CreateBDOpportunityInput>;
  stages: Array<{ id: number; name: string; color: string | null }>;
  onSubmit: (data: CreateBDOpportunityInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OpportunityForm({
  initialData,
  stages,
  onSubmit,
  onCancel,
  isLoading,
}: OpportunityFormProps) {
  const [formData, setFormData] = useState<Partial<CreateBDOpportunityInput>>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    companyName: initialData?.companyName || '',
    serviceLine: initialData?.serviceLine || 'BUSINESS_DEV',
    stageId: initialData?.stageId || (stages[0]?.id || 0),
    value: initialData?.value,
    probability: initialData?.probability,
    expectedCloseDate: initialData?.expectedCloseDate,
    source: initialData?.source,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as CreateBDOpportunityInput);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value || undefined,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Opportunity Title <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          placeholder="e.g., Tax Advisory for ABC Corp"
        />
      </div>

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Company Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          required
          className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          placeholder="e.g., ABC Corporation (Pty) Ltd"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 resize-none"
          placeholder="Brief description of the opportunity..."
        />
      </div>

      {/* Service Line and Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Service Line <span className="text-red-600">*</span>
          </label>
          <select
            name="serviceLine"
            value={formData.serviceLine}
            onChange={handleChange}
            required
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          >
            <option value="TAX">Tax</option>
            <option value="AUDIT">Audit</option>
            <option value="ACCOUNTING">Accounting</option>
            <option value="ADVISORY">Advisory</option>
            <option value="BUSINESS_DEV">Business Development</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Stage <span className="text-red-600">*</span>
          </label>
          <select
            name="stageId"
            value={formData.stageId}
            onChange={handleChange}
            required
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Value and Probability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Value (R)
          </label>
          <input
            type="number"
            name="value"
            value={formData.value || ''}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Probability (%)
          </label>
          <input
            type="number"
            name="probability"
            value={formData.probability || ''}
            onChange={handleChange}
            min="0"
            max="100"
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
            placeholder="Auto from stage"
          />
        </div>
      </div>

      {/* Expected Close Date and Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Expected Close Date
          </label>
          <input
            type="date"
            name="expectedCloseDate"
            value={
              formData.expectedCloseDate
                ? new Date(formData.expectedCloseDate).toISOString().split('T')[0]
                : ''
            }
            onChange={handleChange}
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">Source</label>
          <select
            name="source"
            value={formData.source || ''}
            onChange={handleChange}
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          >
            <option value="">Select source...</option>
            <option value="REFERRAL">Referral</option>
            <option value="WEBSITE">Website</option>
            <option value="COLD_CALL">Cold Call</option>
            <option value="NETWORKING">Networking</option>
            <option value="EXISTING_CLIENT">Existing Client</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : (
            'Save Opportunity'
          )}
        </button>
      </div>
    </form>
  );
}

