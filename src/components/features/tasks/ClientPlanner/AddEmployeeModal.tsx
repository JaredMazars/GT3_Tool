'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { X, Calendar, Clock, Percent, Search, Building2, Briefcase, User, UserPlus } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ServiceLineRole } from '@/types';
import { calculateBusinessDays, calculateAvailableHours, calculateAllocationPercentage } from './utils';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface Employee {
  id: string;
  name: string;
  email: string;
  jobGradeCode?: string;
  officeLocation?: string;
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  taskId: number;
  clientName: string;
  clientCode: string;
  taskName: string;
  taskCode: string;
  initialStartDate: Date;
  initialEndDate: Date;
  serviceLine: string;
  subServiceLineGroup: string;
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onSave,
  taskId,
  clientName,
  clientCode,
  taskName,
  taskCode,
  initialStartDate,
  initialEndDate,
  serviceLine,
  subServiceLineGroup
}: AddEmployeeModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    allocatedHours: '',
    allocatedPercentage: '',
    actualHours: '',
    role: 'USER' as ServiceLineRole | string
  });
  
  const [autoRole, setAutoRole] = useState<ServiceLineRole | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [calculatedInfo, setCalculatedInfo] = useState({
    businessDays: 0,
    availableHours: 0
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDebouncedSearch('');
      setSelectedEmployee(null);
      setShowClearConfirm(false);
      setAutoRole(null);
      
      setFormData({
        startDate: format(initialStartDate, 'yyyy-MM-dd'),
        endDate: format(initialEndDate, 'yyyy-MM-dd'),
        allocatedHours: '',
        allocatedPercentage: '',
        actualHours: '',
        role: 'USER'
      });
      setError('');
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  // Fetch user's service line role when employee is selected
  useEffect(() => {
    if (!selectedEmployee?.id || !subServiceLineGroup) {
      setAutoRole(null);
      return;
    }

    setIsLoadingRole(true);
    
    fetch(`/api/service-lines/user-role?userId=${encodeURIComponent(selectedEmployee.id)}&subServiceLineGroup=${encodeURIComponent(subServiceLineGroup)}`)
      .then(res => res.json())
      .then(data => {
        const role = data.data?.role || ServiceLineRole.USER;
        setAutoRole(role);
        setFormData(prev => ({ ...prev, role }));
      })
      .catch(err => {
        console.error('Error fetching service line role:', err);
        // Default to USER if fetch fails
        setAutoRole(ServiceLineRole.USER);
        setFormData(prev => ({ ...prev, role: ServiceLineRole.USER }));
      })
      .finally(() => {
        setIsLoadingRole(false);
      });
  }, [selectedEmployee, subServiceLineGroup]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search employees
  const { data: employeeResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['employee-search', debouncedSearch, taskId, subServiceLineGroup],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('q', debouncedSearch);
      params.set('taskId', taskId.toString());
      params.set('subServiceLineGroup', subServiceLineGroup);
      params.set('limit', '10');

      const response = await fetch(`/api/users/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to search employees');
      const result = await response.json();
      const users = result.data || result;
      
      // Transform API response to match Employee interface
      return users.map((user: any) => ({
        id: user.id,
        name: user.displayName || user.name || '',
        email: user.email || '',
        jobGradeCode: user.jobTitle || '',
        officeLocation: user.officeLocation || ''
      }));
    },
    enabled: isOpen && debouncedSearch.length >= 2,
    staleTime: 30000
  });

  // Update calculation when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (start <= end) {
        const businessDays = calculateBusinessDays(start, end);
        const availableHours = calculateAvailableHours(start, end);
        
        setCalculatedInfo({ businessDays, availableHours });
      } else {
        setCalculatedInfo({ businessDays: 0, availableHours: 0 });
      }
    } else {
      setCalculatedInfo({ businessDays: 0, availableHours: 0 });
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

  const handleSelectEmployee = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
  }, []);

  const handleClearEmployee = () => {
    setSelectedEmployee(null);
    setShowClearConfirm(false);
    // Reset form data when clearing employee
    setFormData(prev => ({
      ...prev,
      allocatedHours: '',
      allocatedPercentage: '',
      actualHours: '',
      role: 'USER'
    }));
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Start date and end date are required');
      return;
    }

    const start = startOfDay(new Date(formData.startDate));
    const end = startOfDay(new Date(formData.endDate));

    if (end < start) {
      setError('End date must be after start date');
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

    const hours = parseFloat(formData.allocatedHours);
    if (isNaN(hours) || hours < 0) {
      setError('Allocated hours must be a positive number');
      return;
    }

    // Warn if over-allocated (but don't prevent)
    if (hours > calculatedInfo.availableHours) {
      setError(
        `Warning: Allocated hours (${hours}h) exceeds available hours (${calculatedInfo.availableHours}h). This represents ${Math.round((hours / calculatedInfo.availableHours) * 100)}% allocation.`
      );
      // Allow saving despite over-allocation - just show warning
    }

    setIsSaving(true);
    setError('');

    try {
      // Step 1: Add employee to task team
      const addResponse = await fetch(`/api/tasks/${taskId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedEmployee.id,
          role: formData.role
        })
      });

      if (!addResponse.ok) {
        const errorData = await addResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add employee to task');
      }

      const addResult = await addResponse.json();
      const teamMemberId = addResult.data?.id || addResult.id;

      if (!teamMemberId || typeof teamMemberId !== 'number' || teamMemberId <= 0) {
        throw new Error(`Failed to get valid team member ID from response (received: ${teamMemberId})`);
      }

      // Step 2: Set allocation dates and hours
      const allocResponse = await fetch(`/api/tasks/${taskId}/team/${teamMemberId}/allocation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          allocatedHours: hours,
          allocatedPercentage: formData.allocatedPercentage ? parseInt(formData.allocatedPercentage) : null,
          actualHours: formData.actualHours ? parseFloat(formData.actualHours) : null,
          role: formData.role
        })
      });

      if (!allocResponse.ok) {
        const errorData = await allocResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to set allocation');
      }

      // Success - trigger non-blocking refetch and close immediately
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-lg shadow-corporate-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-forvis-gray-200">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between"
          style={{ background: 'linear-gradient(to right, #EBF2FA, #D6E4F5)' }}
        >
          <div>
            <h2 className="text-xl font-bold text-forvis-blue-900">Add Employee to Task</h2>
            <p className="text-sm text-forvis-blue-800 mt-1">{taskName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
            disabled={isSaving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-forvis-error-50 border-2 border-forvis-error-300 text-forvis-error-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Client & Task Info (Read-only) */}
          <div className="bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-forvis-blue-600" />
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
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
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
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                disabled={isSaving}
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
            <div className="p-3 bg-forvis-warning-50 border-2 border-forvis-warning-300 text-forvis-warning-800 rounded-lg text-sm">
              ⚠️ Selected date range contains no business days (only weekends). Please select a range that includes at least one weekday.
            </div>
          )}

          {/* Employee Search Section */}
          {!selectedEmployee && (
            <div className="border-2 border-forvis-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-forvis-blue-600" />
                <h3 className="font-semibold text-forvis-gray-900">Search Employee</h3>
              </div>
              <p className="text-xs text-forvis-gray-600 mb-4">
                Search for an employee to add them to this task. After selection, you can set hours and allocation details.
              </p>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-forvis-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                    disabled={isSaving}
                    autoFocus
                  />
                </div>
              </div>

              {/* Search Results */}
              {debouncedSearch.length >= 2 && (
                <div className="border-t border-forvis-gray-200 pt-4">
                  {isSearching ? (
                    <div className="text-center py-4 text-forvis-gray-600">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-forvis-blue-600"></div>
                      <p className="mt-2 text-sm">Searching...</p>
                    </div>
                  ) : employeeResults.length === 0 ? (
                    <div className="text-center py-4 text-forvis-gray-600">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No employees found</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {employeeResults.map((employee: Employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center justify-between p-3 border border-forvis-gray-200 rounded-lg hover:bg-forvis-blue-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-forvis-gray-900">{employee.name}</div>
                            <div className="text-sm text-forvis-gray-600">{employee.email}</div>
                            <div className="flex gap-3 mt-1 text-xs text-forvis-gray-500">
                              {employee.jobGradeCode && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  {employee.jobGradeCode}
                                </span>
                              )}
                              {employee.officeLocation && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {employee.officeLocation}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSelectEmployee(employee)}
                            disabled={isSaving}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {searchQuery.length === 0 && (
                <div className="text-center py-8 border-t border-forvis-gray-200">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-forvis-gray-400" />
                  <p className="font-medium text-forvis-gray-700">Start typing to search for an employee</p>
                  <p className="text-sm text-forvis-gray-600 mt-1">
                    Once selected, you'll be able to set allocated hours and utilization
                  </p>
                </div>
              )}

              {debouncedSearch.length < 2 && debouncedSearch.length > 0 && (
                <div className="text-center py-4 text-forvis-gray-600 text-sm">
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          )}

          {/* Selected Employee Section */}
          {selectedEmployee && (
            <div className="space-y-4">
              {/* Selected Employee Info */}
              <div className="bg-forvis-gray-50 border border-forvis-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-forvis-gray-600" />
                    <h3 className="font-semibold text-forvis-gray-900">Selected Employee</h3>
                  </div>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-forvis-gray-500 hover:text-forvis-gray-700 text-sm"
                    disabled={isSaving}
                  >
                    Change
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-forvis-gray-900">{selectedEmployee.name}</div>
                  <div className="text-forvis-gray-600">{selectedEmployee.email}</div>
                  {selectedEmployee.jobGradeCode && (
                    <div className="text-forvis-gray-600">Grade: {selectedEmployee.jobGradeCode}</div>
                  )}
                  {selectedEmployee.officeLocation && (
                    <div className="text-forvis-gray-600">Office: {selectedEmployee.officeLocation}</div>
                  )}
                </div>
              </div>

              {/* Allocation Details */}
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
                    value={formData.allocatedHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, allocatedHours: e.target.value }))}
                    placeholder="e.g., 20"
                    step="0.5"
                    min="0"
                    className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                    disabled={isSaving}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, actualHours: e.target.value }))}
                  placeholder="e.g., 30"
                  className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                  disabled={isSaving}
                />
              </div>

              {/* Auto-Assigned Role */}
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Auto-Assigned Role
                </label>
                <div className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg bg-blue-50">
                  {isLoadingRole ? (
                    <div className="text-sm text-forvis-gray-600">Loading role...</div>
                  ) : (
                    <>
                      <div className="text-lg font-bold text-blue-700">
                        {autoRole || 'USER'}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Based on service line access rights
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-forvis-gray-50 border-t-2 border-forvis-gray-200 flex justify-end gap-3">
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
            disabled={!selectedEmployee}
          >
            Add Planning
          </Button>
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
              <h3 className="text-lg font-semibold text-forvis-blue-900">Clear Employee Selection?</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-forvis-gray-800 mb-4">
                Are you sure you want to clear the selected employee? This will also reset all allocation details you've entered.
              </p>
              
              {selectedEmployee && (
                <div 
                  className="p-3 rounded-lg border-2 mb-4"
                  style={{ 
                    background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)',
                    borderColor: '#5B93D7'
                  }}
                >
                  <div className="text-sm font-medium text-forvis-blue-900">{selectedEmployee.name}</div>
                  <div className="text-xs text-forvis-blue-700">{selectedEmployee.email}</div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleClearEmployee}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}










