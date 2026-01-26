'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { X, Calendar, Clock, Percent, User, Briefcase } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ServiceLineRole } from '@/types';
import { EmployeeAllocationData } from './types';
import { calculateBusinessDays, calculateAvailableHours, calculateAllocationPercentage } from './utils';

interface EmployeeAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    startDate: Date;
    endDate: Date;
    allocatedHours: number | null;
    allocatedPercentage: number | null;
    role: ServiceLineRole | string;
    actualHours: number | null;
  }) => Promise<void>;
  onClear: (allocationId: number) => Promise<void>;
  allocation: EmployeeAllocationData | null;
  clientName: string;
  clientCode: string;
  taskName: string;
  taskCode: string;
}

export function EmployeeAllocationModal({
  isOpen,
  onClose,
  onSave,
  onClear,
  allocation,
  clientName,
  clientCode,
  taskName,
  taskCode
}: EmployeeAllocationModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allocatedHours, setAllocatedHours] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [role, setRole] = useState<ServiceLineRole | string>('USER');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Initialize form when allocation changes
  useEffect(() => {
    if (allocation) {
      setStartDate(allocation.startDate ? format(startOfDay(new Date(allocation.startDate)), 'yyyy-MM-dd') : '');
      setEndDate(allocation.endDate ? format(startOfDay(new Date(allocation.endDate)), 'yyyy-MM-dd') : '');
      setAllocatedHours(allocation.allocatedHours?.toString() || '');
      setActualHours(allocation.actualHours?.toString() || '');
      setRole(allocation.role);
      setError(null);
      setShowClearConfirm(false);
    }
  }, [allocation]);

  // Calculate derived values
  const businessDays = startDate && endDate 
    ? calculateBusinessDays(new Date(startDate), new Date(endDate))
    : 0;
  
  const availableHours = startDate && endDate
    ? calculateAvailableHours(new Date(startDate), new Date(endDate))
    : 0;
  
  const calculatedPercentage = allocatedHours && availableHours > 0
    ? calculateAllocationPercentage(parseFloat(allocatedHours), availableHours)
    : null;

  const handleSave = async () => {
    if (!allocation) return;
    
    // Validation
    if (!startDate || !endDate) {
      setError('Start date and end date are required');
      return;
    }

    const start = startOfDay(new Date(startDate));
    const end = startOfDay(new Date(endDate));

    if (end < start) {
      setError('End date must be after start date');
      return;
    }

    const hours = allocatedHours ? parseFloat(allocatedHours) : null;
    const actual = actualHours ? parseFloat(actualHours) : null;

    if (hours !== null && hours < 0) {
      setError('Allocated hours must be positive');
      return;
    }

    if (actual !== null && actual < 0) {
      setError('Actual hours must be positive');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        startDate: start,
        endDate: end,
        allocatedHours: hours,
        allocatedPercentage: calculatedPercentage,
        role,
        actualHours: actual
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save allocation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleClearConfirm = async () => {
    if (!allocation) return;

    setIsSaving(true);
    setError(null);
    setShowClearConfirm(false);

    try {
      await onClear(allocation.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear allocation');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !allocation) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-lg shadow-corporate-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between sticky top-0 bg-white z-10"
          style={{ background: 'linear-gradient(to right, #F0F7FD, #E5F1FB)' }}
        >
          <h2 className="text-xl font-semibold text-forvis-gray-900">Edit Employee Allocation</h2>
          <button
            onClick={onClose}
            className="text-forvis-gray-500 hover:text-forvis-gray-700 transition-colors p-1 rounded-lg hover:bg-white/50"
            disabled={isSaving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Employee Info (Read-only) */}
          <div className="bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-forvis-blue-600" />
              <h3 className="font-semibold text-forvis-gray-900">Employee</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="font-medium text-forvis-gray-900">{allocation.employeeName}</div>
              {allocation.jobGradeCode && (
                <div className="text-forvis-gray-600">Grade: {allocation.jobGradeCode}</div>
              )}
              {allocation.officeLocation && (
                <div className="text-forvis-gray-600">Office: {allocation.officeLocation}</div>
              )}
            </div>
          </div>

          {/* Client & Task Info (Read-only) */}
          <div className="bg-forvis-gray-50 border border-forvis-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-forvis-gray-600" />
              <h3 className="font-semibold text-forvis-gray-900">Assignment</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-forvis-gray-600">Client: </span>
                <span className="font-medium text-forvis-gray-900">{clientName}</span>
                <span className="text-forvis-gray-500 ml-2">({clientCode})</span>
              </div>
              <div>
                <span className="text-forvis-gray-600">Task: </span>
                <span className="font-medium text-forvis-gray-900">{taskName}</span>
                <span className="text-forvis-gray-500 ml-2">({taskCode})</span>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Duration Info */}
          {businessDays > 0 && (
            <div className="text-sm text-forvis-gray-600 bg-forvis-gray-50 px-3 py-2 rounded-lg">
              Duration: <span className="font-medium">{businessDays}</span> business days 
              ({availableHours} available hours)
            </div>
          )}

          {/* Hours and Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Allocated Hours
              </label>
              <input
                type="number"
                value={allocatedHours}
                onChange={(e) => setAllocatedHours(e.target.value)}
                placeholder="e.g., 40"
                step="0.5"
                min="0"
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                disabled={isSaving}
              />
              {calculatedPercentage !== null && (
                <div className="mt-1 text-xs text-forvis-gray-600">
                  <Percent className="w-3 h-3 inline mr-1" />
                  {calculatedPercentage.toFixed(0)}% of available hours
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                Assigned Role
              </label>
              <div className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="text-lg font-bold text-blue-700">
                  {role}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Based on service line access rights
                </div>
              </div>
            </div>
          </div>

          {/* Actual Hours */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Actual Hours (Optional)
            </label>
            <input
              type="number"
              value={actualHours}
              onChange={(e) => setActualHours(e.target.value)}
              placeholder="e.g., 35"
              step="0.5"
              min="0"
              className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex items-center justify-between gap-3">
          <Button
            variant="danger"
            onClick={handleClearClick}
            disabled={isSaving}
            className="mr-auto"
          >
            Clear Allocation
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div 
            className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full border-2"
            style={{ borderColor: '#2E5AAC' }}
          >
            {/* Header */}
            <div 
              className="px-6 py-4 border-b-2 border-forvis-gray-200"
              style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
            >
              <h3 className="text-lg font-semibold text-forvis-blue-900">Clear Allocation?</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-forvis-gray-800 mb-4">
                Are you sure you want to clear this allocation? This will remove all dates and hours for <strong>{allocation.employeeName}</strong> from this task.
              </p>
              
              <div 
                className="p-3 rounded-lg border-2 mb-4"
                style={{ 
                  background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                  borderColor: '#FCA5A5'
                }}
              >
                <div className="text-sm font-medium text-red-900">⚠️ This action cannot be undone</div>
                <div className="text-xs text-red-700 mt-1">The employee will remain on the task team but with no allocated hours.</div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleClearConfirm}
                  disabled={isSaving}
                >
                  {isSaving ? 'Clearing...' : 'Clear Allocation'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


