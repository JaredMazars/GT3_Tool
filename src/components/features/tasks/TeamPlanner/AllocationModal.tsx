'use client';

import { useState, useEffect } from 'react';
import { AllocationData } from './types';
import { Button, Input } from '@/components/ui';
import { X, Calendar, Clock, Percent, AlertCircle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ServiceLineRole, NON_CLIENT_EVENT_LABELS } from '@/types';
import { calculateBusinessDays, calculateAvailableHours, calculateAllocationPercentage } from './utils';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface AllocationModalProps {
  allocation: AllocationData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (allocation: Partial<AllocationData>) => Promise<void>;
  onClear?: (allocationId: number) => Promise<void>;
  onDeleteNonClient?: (allocationId: number) => Promise<void>;
}

export function AllocationModal({ allocation, isOpen, onClose, onSave, onClear, onDeleteNonClient }: AllocationModalProps) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    allocatedHours: '',
    allocatedPercentage: '',
    actualHours: '',
    role: 'USER' as ServiceLineRole | string
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [calculatedInfo, setCalculatedInfo] = useState({
    businessDays: 0,
    availableHours: 0
  });
  
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

  // Update calculation when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (start <= end) {
        const businessDays = calculateBusinessDays(start, end);
        const availableHours = calculateAvailableHours(start, end);
        
        setCalculatedInfo({
          businessDays,
          availableHours
        });
      } else {
        setCalculatedInfo({
          businessDays: 0,
          availableHours: 0
        });
      }
    } else {
      setCalculatedInfo({
        businessDays: 0,
        availableHours: 0
      });
    }
  }, [formData.startDate, formData.endDate]);

  // Auto-calculate percentage when hours change
  useEffect(() => {
    if (formData.allocatedHours && calculatedInfo.availableHours > 0) {
      const hours = parseFloat(formData.allocatedHours);
      if (!isNaN(hours)) {
        const percentage = calculateAllocationPercentage(
          hours,
          calculatedInfo.availableHours
        );
        setFormData(prev => ({
          ...prev,
          allocatedPercentage: percentage.toString()
        }));
      }
    } else if (!formData.allocatedHours) {
      // Clear percentage if hours are cleared
      setFormData(prev => ({
        ...prev,
        allocatedPercentage: ''
      }));
    }
  }, [formData.allocatedHours, calculatedInfo.availableHours]);

  const handleSave = async () => {
    if (!allocation) return;

    // Validation
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required to save allocation');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('End date cannot be before start date');
      return;
    }

    // Check if date range includes at least 1 business day
    if (calculatedInfo.businessDays === 0) {
      setError('Date range must include at least one business day (Monday-Friday)');
      return;
    }

    // Allocated hours is required
    if (!formData.allocatedHours) {
      setError('Please specify allocated hours');
      return;
    }

    const allocatedHours = parseFloat(formData.allocatedHours);
    if (isNaN(allocatedHours) || allocatedHours < 0) {
      setError('Allocated hours must be a positive number');
      return;
    }

    // Warn if over-allocated (but don't prevent)
    if (allocatedHours > calculatedInfo.availableHours) {
      setError(
        `Warning: Allocated hours (${allocatedHours}h) exceeds available hours (${calculatedInfo.availableHours}h). This represents ${Math.round((allocatedHours / calculatedInfo.availableHours) * 100)}% allocation.`
      );
      // Allow saving despite over-allocation - just show warning
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

  // If this is a non-client event, show view/edit modal
  if (allocation.isNonClientEvent) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full border-2 border-forvis-gray-200">
          <div 
            className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between"
            style={{ background: GRADIENTS.dashboard.card }}
          >
            <h2 className="text-xl font-bold text-forvis-blue-900">Non-Client Event</h2>
            <button
              onClick={onClose}
              className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">
                  {allocation.nonClientEventType && NON_CLIENT_EVENT_LABELS[allocation.nonClientEventType]}
                </p>
                <p className="text-sm text-blue-800">
                  Non-client events (training, leave, etc.) always have 100% utilization.
                </p>
                {allocation.notes && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs font-medium text-blue-900 mb-1">Notes:</p>
                    <p className="text-sm text-blue-800">{allocation.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-forvis-gray-600">Start Date:</span>
                <span className="font-medium text-forvis-gray-900">
                  {format(new Date(allocation.startDate), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-forvis-gray-600">End Date:</span>
                <span className="font-medium text-forvis-gray-900">
                  {format(new Date(allocation.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-forvis-gray-600">Allocated Hours:</span>
                <span className="font-medium text-forvis-gray-900">
                  {allocation.allocatedHours}h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-forvis-gray-600">Utilization:</span>
                <span className="font-medium text-forvis-gray-900">
                  {allocation.allocatedPercentage}%
                </span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-forvis-gray-50 border-t-2 border-forvis-gray-200 flex justify-between">
            {onDeleteNonClient ? (
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  if (allocation.id) {
                    onDeleteNonClient(allocation.id);
                    onClose();
                  }
                }}
              >
                Delete Event
              </Button>
            ) : (
              <div />
            )}
            <Button
              variant="primary"
              size="md"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Business Days Calculation Info - Show after dates are selected */}
          {formData.startDate && formData.endDate && calculatedInfo.businessDays > 0 && (
            <div 
              className="p-4 rounded-lg border-2"
              style={{ 
                background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
                borderColor: '#5B93D7'
              }}
            >
              <div className="text-sm font-medium text-forvis-blue-900 mb-2">
                📊 Available Hours Calculation
              </div>
              <div className="text-sm text-forvis-blue-800 space-y-1">
                <div>
                  <span className="font-semibold">{calculatedInfo.businessDays}</span> business days
                  <span className="text-forvis-blue-600 mx-1">×</span>
                  <span className="font-semibold">8</span> hours/day
                  <span className="text-forvis-blue-600 mx-1">=</span>
                  <span className="font-bold text-forvis-blue-900">
                    {calculatedInfo.availableHours} hours available
                  </span>
                </div>
                <div className="text-xs text-forvis-blue-700 mt-1">
                  (Weekends excluded from calculation)
                </div>
              </div>
            </div>
          )}

          {/* Warning if no business days in range */}
          {formData.startDate && formData.endDate && calculatedInfo.businessDays === 0 && (
            <div className="p-3 bg-yellow-50 border-2 border-yellow-300 text-yellow-800 rounded-lg text-sm">
              ⚠️ Selected date range contains no business days (only weekends). Please select a range that includes at least one weekday.
            </div>
          )}

          {/* Allocation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Allocated Hours
                {calculatedInfo.availableHours > 0 && (
                  <span className="text-forvis-gray-600 font-normal ml-1">
                    (of {calculatedInfo.availableHours} available)
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.allocatedHours}
                onChange={(e) => setFormData({ ...formData, allocatedHours: e.target.value })}
                placeholder="e.g., 20"
                className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
              />
              {formData.allocatedHours && calculatedInfo.availableHours > 0 && (
                <p className="text-xs text-forvis-gray-600 mt-1">
                  {parseFloat(formData.allocatedHours) > calculatedInfo.availableHours 
                    ? '⚠️ Over-allocated' 
                    : '✓ Within available hours'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Percent className="w-4 h-4 inline mr-1" />
                Allocation Percentage
                <span className="text-forvis-gray-600 font-normal ml-1">(calculated)</span>
              </label>
              <div
                className="w-full px-3 py-2 border-2 border-forvis-gray-200 rounded-lg bg-forvis-gray-50 text-forvis-gray-700 font-semibold"
              >
                {formData.allocatedPercentage ? `${formData.allocatedPercentage}%` : '-'}
              </div>
              <p className="text-xs text-forvis-gray-600 mt-1">
                Auto-calculated from allocated hours
              </p>
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

          {/* Role (Read-Only) */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Assigned Role
            </label>
            <div className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg bg-blue-50">
              <div className="text-lg font-bold text-blue-700">
                {formData.role}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Based on service line access rights
              </div>
            </div>
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


