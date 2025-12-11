'use client';

import { useState, useEffect } from 'react';
import { AllocationData } from './types';
import { Button, Input } from '@/components/ui';
import { X, Calendar, Clock, Percent } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { TaskRole } from '@/types';

interface AllocationModalProps {
  allocation: AllocationData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (allocation: Partial<AllocationData>) => Promise<void>;
  onClear?: (allocationId: number) => Promise<void>;
}

export function AllocationModal({ allocation, isOpen, onClose, onSave, onClear }: AllocationModalProps) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    allocatedHours: '',
    allocatedPercentage: '',
    actualHours: '',
    role: 'VIEWER' as TaskRole
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Determine if this is an existing allocation (has dates) or a new one
  const isExistingAllocation = allocation && allocation.startDate && allocation.endDate;

  useEffect(() => {
    if (allocation && isOpen) {
      setFormData({
        // Normalize dates to start of day before formatting
        startDate: allocation.startDate ? format(startOfDay(new Date(allocation.startDate)), 'yyyy-MM-dd') : '',
        endDate: allocation.endDate ? format(startOfDay(new Date(allocation.endDate)), 'yyyy-MM-dd') : '',
        allocatedHours: allocation.allocatedHours?.toString() || '',
        allocatedPercentage: allocation.allocatedPercentage?.toString() || '',
        actualHours: allocation.actualHours?.toString() || '',
        role: allocation.role
      });
      setError('');
    }
  }, [allocation, isOpen]);

  const handleSave = async () => {
    if (!allocation) return;

    // Validation
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required to save allocation');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('End date must be after or equal to start date');
      return;
    }

    // At least one allocation metric should be provided
    if (!formData.allocatedHours && !formData.allocatedPercentage) {
      setError('Please specify either allocated hours or percentage');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        id: allocation.id,
        // Normalize dates to start of day to match calendar display
        startDate: startOfDay(new Date(formData.startDate)),
        endDate: startOfDay(new Date(formData.endDate)),
        allocatedHours: formData.allocatedHours ? parseFloat(formData.allocatedHours) : null,
        allocatedPercentage: formData.allocatedPercentage ? parseInt(formData.allocatedPercentage) : null,
        actualHours: formData.actualHours ? parseFloat(formData.actualHours) : null,
        role: formData.role
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save allocation';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!allocation || !onClear) return;

    setIsSaving(true);
    setError('');
    setShowClearConfirm(false);

    try {
      await onClear(allocation.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear allocation';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !allocation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full border-2 border-forvis-gray-200">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between"
          style={{ background: 'linear-gradient(to right, #EBF2FA, #D6E4F5)' }}
        >
          <div>
            <h2 className="text-xl font-bold text-forvis-blue-900">
              {isExistingAllocation ? 'Edit Allocation' : 'Add Planning'}
            </h2>
            <p className="text-sm text-forvis-blue-800 mt-1">{allocation.taskName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
              />
            </div>
          </div>

          {/* Allocation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Allocated Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.allocatedHours}
                onChange={(e) => setFormData({ ...formData, allocatedHours: e.target.value })}
                placeholder="e.g., 40"
                className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Percent className="w-4 h-4 inline mr-1" />
                Allocated Percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.allocatedPercentage}
                onChange={(e) => setFormData({ ...formData, allocatedPercentage: e.target.value })}
                placeholder="e.g., 50"
                className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
              />
            </div>
          </div>

          {/* Actual Hours */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Actual Hours
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={formData.actualHours}
              onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
              placeholder="e.g., 30"
              className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as TaskRole })}
              className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
            >
              <option value="VIEWER">👁️ Viewer - Read-only access</option>
              <option value="EDITOR">✏️ Editor - Can edit data</option>
              <option value="REVIEWER">✅ Reviewer - Can approve/reject adjustments</option>
              <option value="ADMIN">⚙️ Admin - Full task control</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-forvis-gray-50 border-t-2 border-forvis-gray-200 flex justify-between items-center">
          <div>
            {isExistingAllocation && onClear && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowClearConfirm(true)}
                disabled={isSaving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
              >
                Clear Planning
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              size="md"
              onClick={handleSave}
              loading={isSaving}
            >
              {isExistingAllocation ? 'Save Changes' : 'Add Planning'}
            </Button>
          </div>
        </div>

        {/* Clear Confirmation Dialog */}
        {showClearConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white rounded-lg shadow-corporate-lg p-6 max-w-md mx-4 border-2 border-forvis-gray-200">
              <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">Clear Planning Data</h3>
              <p className="text-sm text-forvis-gray-600 mb-4">
                This will remove all planning details (dates, hours, percentage) but keep the team member on the task. Are you sure?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClear}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-corporate disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
                >
                  {isSaving ? 'Clearing...' : 'Clear Planning'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


