'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { X, Calendar, Clock, Percent, FileText } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { NonClientEventType, NON_CLIENT_EVENT_LABELS } from '@/types';
import { calculateBusinessDays, calculateAvailableHours } from './utils';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface NonClientEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    eventType: NonClientEventType;
    startDate: Date;
    endDate: Date;
    notes?: string;
  }) => Promise<void>;
  employeeId: number;
  userName: string;
  initialStartDate?: Date;
  initialEndDate?: Date;
  initialEventType?: NonClientEventType;
  initialNotes?: string;
  isEdit?: boolean;
}

export function NonClientEventModal({
  isOpen,
  onClose,
  onSave,
  employeeId,
  userName,
  initialStartDate,
  initialEndDate,
  initialEventType,
  initialNotes,
  isEdit = false
}: NonClientEventModalProps) {
  const [step, setStep] = useState<'event-type' | 'dates'>('event-type');
  const [selectedEventType, setSelectedEventType] = useState<NonClientEventType | null>(
    initialEventType || null
  );
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    notes: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [calculatedInfo, setCalculatedInfo] = useState({
    businessDays: 0,
    availableHours: 0
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialEventType) {
        // Editing mode - prefill with initial data
        setSelectedEventType(initialEventType);
        setStep('dates');
        setFormData({
          startDate: initialStartDate ? format(initialStartDate, 'yyyy-MM-dd') : '',
          endDate: initialEndDate ? format(initialEndDate, 'yyyy-MM-dd') : '',
          notes: initialNotes || ''
        });
      } else {
        // Create mode
        setStep('event-type');
        setSelectedEventType(null);
        
        const startDateStr = initialStartDate ? format(initialStartDate, 'yyyy-MM-dd') : '';
        const endDateStr = initialEndDate ? format(initialEndDate, 'yyyy-MM-dd') : '';
        
        setFormData({
          startDate: startDateStr,
          endDate: endDateStr,
          notes: ''
        });
      }
      setError('');
    }
  }, [isOpen, initialStartDate, initialEndDate, initialEventType, initialNotes, isEdit]);

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

  const handleEventTypeSelect = (eventType: NonClientEventType) => {
    setSelectedEventType(eventType);
    setStep('dates');
  };

  const handleSave = async () => {
    if (!selectedEventType) return;

    // Validation
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('End date cannot be before start date');
      return;
    }

    if (calculatedInfo.businessDays === 0) {
      setError('Date range must include at least one business day (Monday-Friday)');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        eventType: selectedEventType,
        startDate: startOfDay(new Date(formData.startDate)),
        endDate: startOfDay(new Date(formData.endDate)),
        notes: formData.notes || undefined
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save non-client event';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Event type icons and colors
  const eventTypeConfig: Record<NonClientEventType, { icon: string; color: string }> = {
    [NonClientEventType.TRAINING]: { icon: '📚', color: '#10B981' },
    [NonClientEventType.ANNUAL_LEAVE]: { icon: '🏖️', color: '#3B82F6' },
    [NonClientEventType.SICK_LEAVE]: { icon: '🤒', color: '#F59E0B' },
    [NonClientEventType.PUBLIC_HOLIDAY]: { icon: '🎉', color: '#8B5CF6' },
    [NonClientEventType.PERSONAL]: { icon: '👤', color: '#EC4899' },
    [NonClientEventType.ADMINISTRATIVE]: { icon: '📋', color: '#6B7280' },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full border-2 border-forvis-gray-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between sticky top-0 z-10 bg-white"
          style={{ background: GRADIENTS.dashboard.card }}
        >
          <div>
            <h2 className="text-xl font-bold text-forvis-blue-900">
              {isEdit ? 'Edit Non-Client Event' : 'Add Non-Client Event'}
            </h2>
            <p className="text-sm text-forvis-blue-800 mt-1">
              For: <span className="font-semibold">{userName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator (only for create mode) */}
        {!isEdit && (
          <div className="px-6 py-3 border-b border-forvis-gray-200 bg-forvis-gray-50">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className={`flex items-center gap-2 ${step === 'event-type' ? 'text-forvis-blue-600 font-semibold' : 'text-green-600'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'event-type' ? 'bg-forvis-blue-100' : 'bg-green-100'}`}>
                  {step === 'dates' ? '✓' : '1'}
                </div>
                <span>Select Event Type</span>
              </div>
              <div className="w-8 h-0.5 bg-forvis-gray-300"></div>
              <div className={`flex items-center gap-2 ${step === 'dates' ? 'text-forvis-blue-600 font-semibold' : 'text-forvis-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'dates' ? 'bg-forvis-blue-100' : 'bg-forvis-gray-100'}`}>
                  2
                </div>
                <span>Set Dates</span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Event Type Selection */}
          {step === 'event-type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-3">
                  Select Event Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(NonClientEventType).map((eventType) => {
                    const config = eventTypeConfig[eventType];
                    return (
                      <button
                        key={eventType}
                        onClick={() => handleEventTypeSelect(eventType)}
                        className="p-4 border-2 border-forvis-gray-200 rounded-lg hover:border-forvis-blue-500 hover:bg-forvis-blue-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                            style={{ backgroundColor: `${config.color}20` }}
                          >
                            {config.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-forvis-gray-900">
                              {NON_CLIENT_EVENT_LABELS[eventType]}
                            </div>
                            <div className="text-xs text-forvis-gray-600 mt-0.5">
                              100% utilization
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Dates and Details */}
          {step === 'dates' && selectedEventType && (
            <div className="space-y-4">
              {/* Selected Event Type Display */}
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${eventTypeConfig[selectedEventType].color}20` }}
                  >
                    {eventTypeConfig[selectedEventType].icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-900">
                      {NON_CLIENT_EVENT_LABELS[selectedEventType]}
                    </div>
                    <div className="text-xs text-green-700">100% utilization</div>
                  </div>
                </div>
                {!isEdit && (
                  <button
                    onClick={() => {
                      setSelectedEventType(null);
                      setStep('event-type');
                    }}
                    className="text-xs text-green-700 hover:text-green-900 underline"
                  >
                    Change
                  </button>
                )}
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

              {/* Business Days Calculation */}
              {formData.startDate && formData.endDate && calculatedInfo.businessDays > 0 && (
                <div 
                  className="p-4 rounded-lg border-2"
                  style={{ 
                    background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
                    borderColor: '#5B93D7'
                  }}
                >
                  <div className="text-sm font-medium text-forvis-blue-900 mb-2">
                    📊 Automatic Calculation (100% Utilization)
                  </div>
                  <div className="text-sm text-forvis-blue-800 space-y-1">
                    <div>
                      <span className="font-semibold">{calculatedInfo.businessDays}</span> business days
                      <span className="text-forvis-blue-600 mx-1">×</span>
                      <span className="font-semibold">8</span> hours/day
                      <span className="text-forvis-blue-600 mx-1">=</span>
                      <span className="font-bold text-forvis-blue-900">
                        {calculatedInfo.availableHours} hours
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-forvis-blue-200">
                      <div>
                        <div className="text-xs text-forvis-blue-700">Allocated Hours</div>
                        <div className="text-lg font-bold text-forvis-blue-900">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {calculatedInfo.availableHours}h
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-forvis-blue-700">Utilization</div>
                        <div className="text-lg font-bold text-forvis-blue-900">
                          <Percent className="w-4 h-4 inline mr-1" />
                          100%
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-forvis-blue-700 mt-2">
                      ℹ️ Weekends excluded • No hours available for client work during this period
                    </div>
                  </div>
                </div>
              )}

              {/* Warning if no business days */}
              {formData.startDate && formData.endDate && calculatedInfo.businessDays === 0 && (
                <div className="p-3 bg-yellow-50 border-2 border-yellow-300 text-yellow-800 rounded-lg text-sm">
                  ⚠️ Selected date range contains no business days (only weekends).
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional details..."
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-forvis-gray-50 border-t-2 border-forvis-gray-200 flex justify-between items-center sticky bottom-0">
          <div>
            {step === 'dates' && !isEdit && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSelectedEventType(null);
                  setStep('event-type');
                }}
                disabled={isSaving}
              >
                Back
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
            {step === 'dates' && (
              <Button
                variant="gradient"
                size="md"
                onClick={handleSave}
                loading={isSaving}
              >
                {isEdit ? 'Save Changes' : 'Create Event'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
