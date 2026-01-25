'use client';

import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface EditAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newHours: number) => Promise<void>;
  staffName: string;
  currentHours: number;
  isLoading: boolean;
}

export function EditAllocationModal({
  isOpen,
  onClose,
  onSave,
  staffName,
  currentHours,
  isLoading
}: EditAllocationModalProps) {
  const [allocatedHours, setAllocatedHours] = useState(currentHours.toString());
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const hours = parseFloat(allocatedHours);
    
    if (isNaN(hours) || hours < 0) {
      setError('Please enter a valid number of hours (0 or greater)');
      return;
    }

    try {
      await onSave(hours);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update allocation');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      setAllocatedHours(currentHours.toString());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-corporate-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-forvis-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-icon-standard rounded-full p-2">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-forvis-gray-900">Edit Allocation Hours</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-forvis-gray-600 hover:text-forvis-gray-900 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Staff Name */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Staff Member
            </label>
            <div className="px-4 py-3 bg-forvis-gray-50 rounded-lg border border-forvis-gray-200">
              <p className="font-medium text-forvis-gray-900">{staffName}</p>
            </div>
          </div>

          {/* Current Hours */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Current Allocation
            </label>
            <div className="px-4 py-3 bg-forvis-blue-50 rounded-lg border border-forvis-blue-200">
              <p className="font-semibold text-forvis-blue-600">
                {currentHours.toFixed(2)} hours
              </p>
            </div>
          </div>

          {/* New Hours Input */}
          <div>
            <Input
              label="New Allocated Hours"
              type="number"
              value={allocatedHours}
              onChange={(e) => setAllocatedHours(e.target.value)}
              min="0"
              step="0.01"
              required
              disabled={isLoading}
              error={error}
              placeholder="Enter hours"
            />
            <p className="mt-1 text-xs text-forvis-gray-600">
              This will update the budget and recalculate utilization percentage in the planner.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-forvis-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
