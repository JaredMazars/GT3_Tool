'use client';

import { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui';

interface Employee {
  id: number;
  EmpCode: string;
  EmpName: string;
  EmpNameFull: string;
  OfficeCode: string;
  EmpCatCode: string;
  EmpCatDesc: string;
  ServLineDesc: string;
  Active: string;
}

interface EmployeeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (employeeIds: number[]) => void;
  excludeEmployeeIds?: number[];
  title?: string;
}

export function EmployeeSearchModal({
  isOpen,
  onClose,
  onSelect,
  excludeEmployeeIds = [],
  title = 'Select Employees',
}: EmployeeSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [officeFilter, setOfficeFilter] = useState('');
  const [jobGradeFilter, setJobGradeFilter] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState<string[]>([]);
  const [jobGrades, setJobGrades] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setOfficeFilter('');
      setJobGradeFilter('');
      setSelectedEmployeeIds([]);
      setCurrentPage(1);
      fetchEmployees();
      fetchFilters();
    }
  }, [isOpen]);

  // Fetch employees when filters change
  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
    }
  }, [searchQuery, officeFilter, jobGradeFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        activeOnly: 'true',
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (officeFilter) {
        params.append('officeCode', officeFilter);
      }
      if (jobGradeFilter) {
        params.append('empCatCodes', jobGradeFilter);
      }

      const response = await fetch(`/api/employees?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Filter out excluded employees
        const filtered = (data.data || []).filter(
          (emp: Employee) => !excludeEmployeeIds.includes(emp.id)
        );
        setEmployees(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await fetch('/api/employees?activeOnly=true');
      const data = await response.json();

      if (data.success) {
        const allEmployees = data.data || [];
        
        // Extract unique offices
        const uniqueOffices = Array.from(
          new Set(allEmployees.map((emp: Employee) => emp.OfficeCode))
        ).sort() as string[];
        setOffices(uniqueOffices);

        // Extract unique job grades
        const uniqueJobGrades = Array.from(
          new Set(allEmployees.map((emp: Employee) => emp.EmpCatCode))
        ).sort() as string[];
        setJobGrades(uniqueJobGrades);
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  };

  const toggleEmployee = (employeeId: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAll = () => {
    const visibleIds = paginatedEmployees.map((emp) => emp.id);
    setSelectedEmployeeIds((prev) => {
      const newSet = new Set([...prev, ...visibleIds]);
      return Array.from(newSet);
    });
  };

  const clearAll = () => {
    setSelectedEmployeeIds([]);
  };

  const handleSubmit = () => {
    if (selectedEmployeeIds.length > 0) {
      onSelect(selectedEmployeeIds);
      onClose();
    }
  };

  // Pagination
  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = employees.slice(startIndex, startIndex + itemsPerPage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-corporate-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b border-forvis-gray-200"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-forvis-gray-200 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                Office
              </label>
              <select
                value={officeFilter}
                onChange={(e) => {
                  setOfficeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
              >
                <option value="">All Offices</option>
                {offices.map((office) => (
                  <option key={office} value={office}>
                    {office}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                Job Grade
              </label>
              <select
                value={jobGradeFilter}
                onChange={(e) => {
                  setJobGradeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
              >
                <option value="">All Grades</option>
                {jobGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-forvis-gray-600">
              {selectedEmployeeIds.length > 0 ? (
                <span className="font-medium text-forvis-blue-600">
                  {selectedEmployeeIds.length} selected
                </span>
              ) : (
                <span>No employees selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
              >
                Select All on Page
              </button>
              <span className="text-forvis-gray-400">|</span>
              <button
                onClick={clearAll}
                className="text-sm text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-forvis-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : paginatedEmployees.length === 0 ? (
            <div className="text-center py-12 text-forvis-gray-500">
              No employees found
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedEmployees.map((employee) => {
                const isSelected = selectedEmployeeIds.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    onClick={() => toggleEmployee(employee.id)}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-forvis-blue-500 bg-forvis-blue-50'
                        : 'border-forvis-gray-200 hover:border-forvis-blue-300 hover:bg-forvis-gray-50'
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-colors ${
                          isSelected
                            ? 'bg-forvis-blue-600 border-forvis-blue-600'
                            : 'border-forvis-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-forvis-gray-900">
                            {employee.EmpName}
                          </span>
                          <Badge variant="blue" size="sm">
                            {employee.EmpCode}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-forvis-gray-600">
                          <span>{employee.EmpCatDesc}</span>
                          <span>•</span>
                          <span>{employee.OfficeCode}</span>
                          <span>•</span>
                          <span className="truncate">{employee.ServLineDesc}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-forvis-gray-200 flex items-center justify-between">
            <div className="text-sm text-forvis-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, employees.length)} of{' '}
              {employees.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-forvis-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-forvis-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-forvis-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-forvis-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-forvis-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm font-medium text-forvis-gray-700 hover:bg-forvis-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedEmployeeIds.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                selectedEmployeeIds.length === 0
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
            }}
          >
            Add {selectedEmployeeIds.length} Employee{selectedEmployeeIds.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
