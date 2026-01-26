'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { EmployeeAutocomplete } from '../users/EmployeeAutocomplete';
import { Button } from '@/components/ui';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface ChangePartnerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: number;
  clientName: string;
  clientCode: string;
  changeType: 'PARTNER' | 'MANAGER';
  currentEmployeeCode: string;
  currentEmployeeName: string;
}

export function ChangePartnerManagerModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientName,
  clientCode,
  changeType,
  currentEmployeeCode,
  currentEmployeeName,
}: ChangePartnerManagerModalProps) {
  const [formData, setFormData] = useState({
    proposedEmployeeCode: '',
    proposedEmployeeName: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        proposedEmployeeCode: '',
        proposedEmployeeName: '',
        reason: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const roleLabel = changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';

  const handleEmployeeChange = (code: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      proposedEmployeeCode: code,
      proposedEmployeeName: name,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.proposedEmployeeCode) {
      setError('Please select an employee');
      return;
    }

    if (formData.proposedEmployeeCode === currentEmployeeCode) {
      setError(`Selected employee is already the current ${roleLabel.toLowerCase()}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}/change-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeType,
          proposedEmployeeCode: formData.proposedEmployeeCode,
          reason: formData.reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create change request');
      }

      // Success - close modal and notify parent
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-forvis-gray-200 rounded-t-lg"
          style={{ background: GRADIENTS.primary.horizontal }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Change {roleLabel}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-forvis-gray-200 p-1 rounded transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Client Info */}
          <div className="mb-4 p-3 bg-forvis-blue-50 rounded-lg border border-forvis-blue-100">
            <div className="text-sm text-forvis-gray-700">
              <span className="font-medium">Client:</span> {clientName}
            </div>
            <div className="text-xs text-forvis-gray-600 mt-1">
              {clientCode}
            </div>
          </div>

          {/* Current Employee */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
              Current {roleLabel}
            </label>
            <div className="text-sm text-forvis-gray-900 bg-forvis-gray-50 px-3 py-2 rounded-lg border border-forvis-gray-200">
              {currentEmployeeName || currentEmployeeCode}
            </div>
          </div>

          {/* Employee Autocomplete */}
          <div className="mb-4">
            <EmployeeAutocomplete
              label={`New ${roleLabel} *`}
              value={formData.proposedEmployeeCode}
              valueName={formData.proposedEmployeeName}
              onChange={handleEmployeeChange}
              excludeCodes={[currentEmployeeCode]}
              empCatCodes={changeType === 'PARTNER' ? ['CARL', 'LOCAL', 'DIR'] : undefined}
              required
              placeholder="Search for employee..."
            />
            <p className="text-xs text-forvis-gray-600 mt-1">
              {changeType === 'PARTNER' 
                ? 'Only partners (CARL, LOCAL, DIR) can be selected. The selected person will receive a notification to approve this change.'
                : 'The selected person will receive a notification to approve this change'}
            </p>
          </div>

          {/* Reason (Optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
              Reason (Optional)
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent resize-none"
              placeholder="Provide a reason for this change request..."
            />
            <div className="text-xs text-forvis-gray-600 mt-1 text-right">
              {formData.reason.length}/500
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-forvis-error-50 border border-forvis-error-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-forvis-error-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-forvis-error-800">{error}</p>
            </div>
          )}

          {/* Info Message */}
          <div className="mb-4 p-3 bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg">
            <p className="text-xs text-forvis-blue-800">
              <strong>Note:</strong> This change requires approval from the proposed {roleLabel.toLowerCase()}.
              Both the current and proposed {roleLabel.toLowerCase()} will be notified.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-forvis-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !formData.proposedEmployeeCode}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
