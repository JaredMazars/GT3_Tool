'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

interface Employee {
  id: number;
  EmpCode: string;
  EmpName: string;
  EmpNameFull: string;
  OfficeCode: string;
  EmpCatCode: string;
  EmpCatDesc: string;
  Active: string;
}

interface EmployeeAutocompleteProps {
  label: string;
  value?: string | null;
  valueName?: string | null;
  onChange: (code: string, name: string, nameFull: string, officeCode: string) => void;
  empCatCodes?: string[];
  masterCode?: string | null;
  excludeCodes?: string[];
  required?: boolean;
  placeholder?: string;
}

export function EmployeeAutocomplete({
  label,
  value,
  valueName,
  onChange,
  empCatCodes,
  masterCode,
  excludeCodes = [],
  required = false,
  placeholder = 'Search by name or code...',
}: EmployeeAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch employees when filters or search changes
  useEffect(() => {
    fetchEmployees();
  }, [empCatCodes, masterCode, debouncedSearch]);

  // Filter out excluded employees (server does the search filtering)
  const filteredEmployees = employees.filter((emp) => !excludeCodes.includes(emp.EmpCode));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('activeOnly', 'true');
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }
      if (empCatCodes && empCatCodes.length > 0) {
        params.append('empCatCodes', empCatCodes.join(','));
      }
      if (masterCode) {
        params.append('masterCode', masterCode);
      }

      const response = await fetch(`/api/employees?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setEmployees(data.data || []);
        
        // If there's a current value, find and set the selected employee
        if (value) {
          const current = (data.data || []).find((emp: Employee) => emp.EmpCode === value);
          if (current) {
            setSelectedEmployee(current);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    onChange(employee.EmpCode, employee.EmpName, employee.EmpNameFull, employee.OfficeCode);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedEmployee(null);
    onChange('', '', '', '');
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputClick = () => {
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {selectedEmployee ? (
        // Display selected employee
        <div className="relative">
          <div className="px-3 py-2 border-2 border-forvis-blue-500 bg-forvis-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {selectedEmployee.EmpNameFull}
              </p>
              <p className="text-xs text-gray-600">
                {selectedEmployee.EmpCode} - {selectedEmployee.EmpCatDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 p-1 hover:bg-forvis-blue-100 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      ) : (
        // Search input
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={handleInputClick}
              onFocus={handleInputClick}
              className="w-full pl-10 pr-10 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
              placeholder={placeholder}
            />
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading employees...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-600">
                  {searchTerm ? `No employees found matching "${searchTerm}"` : 'No employees available'}
                </div>
              ) : (
                <ul>
                  {filteredEmployees.map((employee) => (
                    <li key={employee.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(employee)}
                        className="w-full px-4 py-2 text-left hover:bg-forvis-blue-50 focus:bg-forvis-blue-50 focus:outline-none transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {employee.EmpNameFull}
                        </p>
                        <p className="text-xs text-gray-600">
                          {employee.EmpCode} - {employee.EmpCatDesc}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedEmployee && !loading && employees.length === 0 && (
        <p className="mt-1 text-xs text-gray-500">
          No {empCatCodes ? 'matching ' : ''}employees available
        </p>
      )}
    </div>
  );
}


