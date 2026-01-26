'use client';

import { useState, useEffect } from 'react';

interface Employee {
  EmpCode: string;
  EmpName: string;
  EmpNameFull: string;
  OfficeCode: string;
  EmpCatDesc: string;
  Active: string;
}

interface UserSelectorProps {
  value?: string | null;
  valueName?: string | null;
  onChange: (code: string, name: string) => void;
  label: string;
  roleFilter?: 'PARTNER' | 'MANAGER' | 'ALL';
  officeCode?: string;
  required?: boolean;
}

export function UserSelector({ 
  value, 
  valueName,
  onChange, 
  label, 
  roleFilter = 'ALL',
  officeCode,
  required = false 
}: UserSelectorProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [roleFilter, officeCode]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (roleFilter && roleFilter !== 'ALL') {
        params.append('roleFilter', roleFilter);
      }
      
      if (officeCode) {
        params.append('officeCode', officeCode);
      }
      
      const response = await fetch(`/api/employees?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setEmployees(data.data || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to load employees');
      }
    } catch (err) {
      setError('Failed to fetch employees');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const selectedEmployee = employees.find(emp => emp.EmpCode === selectedCode);
    
    if (selectedEmployee) {
      onChange(selectedEmployee.EmpCode, selectedEmployee.EmpName);
    } else {
      onChange('', '');
    }
  };

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
        required={required}
      >
        <option value="">Select {label.toLowerCase()}...</option>
        {employees.map((employee) => (
          <option key={employee.EmpCode} value={employee.EmpCode}>
            {employee.EmpNameFull} ({employee.EmpCode})
            {employee.EmpCatDesc && ` - ${employee.EmpCatDesc}`}
          </option>
        ))}
      </select>
      {employees.length === 0 && (
        <p className="mt-1 text-xs text-gray-500">
          No {roleFilter !== 'ALL' ? roleFilter.toLowerCase() + 's' : 'employees'} available
        </p>
      )}
    </div>
  );
}
