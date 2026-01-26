'use client';

import { useState, Fragment } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface IndependenceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  clientName: string;
  userName: string;
  isLoading?: boolean;
}

export function IndependenceConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  userName,
  isLoading = false,
}: IndependenceConfirmationModalProps) {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isChecked) return;
    await onConfirm();
  };

  const handleClose = () => {
    setIsChecked(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg"
          style={{ background: GRADIENTS.primary.diagonal }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">Independence Confirmation</h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-white hover:text-forvis-gray-200 transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Info Box */}
          <div
            className="rounded-lg p-4 border-2"
            style={{ 
              background: GRADIENTS.dashboard.card, 
              borderColor: '#2E5AAC'
            }}
          >
            <h4 className="text-sm font-semibold text-forvis-blue-900 mb-2">
              Professional Independence Requirements
            </h4>
            <p className="text-sm text-forvis-blue-800">
              As a member of the engagement team, you are required to confirm your independence 
              from the client and absence of any conflicts of interest that could impair your 
              professional judgment.
            </p>
          </div>

          {/* Client Information */}
          <div className="bg-forvis-gray-50 rounded-lg p-4 border border-forvis-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-forvis-gray-700">Client:</span>
                <p className="text-forvis-gray-900 mt-1">{clientName}</p>
              </div>
              <div>
                <span className="font-medium text-forvis-gray-700">Team Member:</span>
                <p className="text-forvis-gray-900 mt-1">{userName}</p>
              </div>
            </div>
          </div>

          {/* Independence Declaration */}
          <div className="border-2 border-forvis-gray-300 rounded-lg p-4 bg-white">
            <p className="text-sm text-forvis-gray-900 leading-relaxed">
              I confirm that I am <strong>independent</strong> from{' '}
              <strong>{clientName}</strong> and have no conflicts of interest, financial 
              interests, or personal relationships that would impair my objectivity or professional 
              judgment in performing work on this engagement.
            </p>
          </div>

          {/* Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-forvis-blue-50 rounded-lg border-2 border-forvis-blue-200">
            <input
              id="independence-checkbox"
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={isLoading}
              className="mt-1 h-5 w-5 rounded border-forvis-gray-300 text-forvis-blue-600 focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label
              htmlFor="independence-checkbox"
              className="text-sm font-medium text-forvis-gray-900 cursor-pointer select-none"
            >
              I confirm that I have read and agree to the independence declaration above
            </label>
          </div>

          {/* Warning */}
          {!isChecked && (
            <p className="text-xs text-forvis-gray-600 italic">
              You must check the box above to confirm your independence before proceeding.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={!isChecked || isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Confirming...' : 'Confirm Independence'}
          </Button>
        </div>
      </div>
    </div>
  );
}
