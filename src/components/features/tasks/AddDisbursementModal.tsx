'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button, Input, Banner } from '@/components/ui';

interface AddDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { description: string; amount: number; expectedDate: Date }) => void;
  isLoading?: boolean;
  initialData?: { description: string; amount: number; expectedDate: string };
  mode?: 'add' | 'edit';
}

export function AddDisbursementModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  initialData,
  mode = 'add'
}: AddDisbursementModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDescription(initialData.description);
        setAmount(initialData.amount.toString());
        setExpectedDate(initialData.expectedDate?.split('T')[0] || '');
      } else {
        setDescription('');
        setAmount('');
        setExpectedDate('');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    // Validation
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    if (!expectedDate) {
      setError('Expected date is required');
      return;
    }

    onSave({
      description: description.trim(),
      amount: amountNum,
      expectedDate: new Date(expectedDate)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-lg w-full p-6 bg-white rounded-lg shadow-corporate-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-forvis-gray-900">
            {mode === 'add' ? 'Add Budgeted Disbursement' : 'Edit Budgeted Disbursement'}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4">
            <Banner
              variant="error"
              message={error}
              dismissible
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Travel expenses, Professional fees"
            disabled={isLoading}
            required
          />

          <Input
            type="number"
            label="Amount (ZAR)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={isLoading}
            required
          />

          <Input
            type="date"
            label="Expected Date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : mode === 'add' ? 'Add Disbursement' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
