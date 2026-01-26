'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Lock, ChevronDown } from 'lucide-react';

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

export interface TeamMember {
  empCode: string;
  empName: string;
  empNameFull: string;
  role: 'ADMINISTRATOR' | 'PARTNER' | 'MANAGER' | 'SUPERVISOR' | 'USER' | 'VIEWER';
  locked?: boolean;
}

interface EmployeeMultiSelectProps {
  label: string;
  selectedMembers: TeamMember[];
  onChange: (members: TeamMember[]) => void;
  lockedMemberCodes?: string[];
  masterCode?: string | null;
  subServiceLineGroup?: string;
  placeholder?: string;
}

export function EmployeeMultiSelect({
  label,
  selectedMembers,
  onChange,
  lockedMemberCodes = [],
  masterCode,
  subServiceLineGroup,
  placeholder = 'Search to add team members...',
}: EmployeeMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Function to lookup ServiceLineRole for an employee
  const fetchEmployeeRole = async (empCode: string): Promise<string> => {
    try {
      // If no subServiceLineGroup provided, default to USER
      if (!subServiceLineGroup) return 'USER';

      // Look up employee's User account
      const empResponse = await fetch(`/api/employees/${empCode}`);
      if (!empResponse.ok) return 'USER';
      const empData = await empResponse.json();
      const email = empData.data?.WinLogon;
      
      if (!email) return 'USER';
      
      // Look up ServiceLineRole
      const roleResponse = await fetch(
        `/api/service-lines/user-role?userId=${encodeURIComponent(email)}&subServiceLineGroup=${encodeURIComponent(subServiceLineGroup)}`
      );
      if (!roleResponse.ok) return 'USER';
      const roleData = await roleResponse.json();
      
      return roleData.data?.role || 'USER';
    } catch (error) {
      console.error('Error fetching employee role:', error);
      return 'USER';
    }
  };

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
  }, [masterCode, debouncedSearch]);

  // Filter out selected employees (server does the search filtering)
  const selectedCodes = selectedMembers.map((m) => m.empCode);
  const filteredEmployees = employees.filter((emp) => !selectedCodes.includes(emp.EmpCode));

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
      if (masterCode) {
        params.append('masterCode', masterCode);
      }

      const response = await fetch(`/api/employees?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (employee: Employee) => {
    const role = await fetchEmployeeRole(employee.EmpCode);
    
    const newMember: TeamMember = {
      empCode: employee.EmpCode,
      empName: employee.EmpName,
      empNameFull: employee.EmpNameFull,
      role: role as TeamMember['role'],
      locked: false,
    };

    onChange([...selectedMembers, newMember]);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleRemoveMember = (empCode: string) => {
    // Don't remove if locked
    const member = selectedMembers.find((m) => m.empCode === empCode);
    if (member?.locked) return;

    onChange(selectedMembers.filter((m) => m.empCode !== empCode));
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PARTNER':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'SUPERVISOR':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'USER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleInputClick = () => {
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
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

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-600">
              {searchTerm
                ? `No employees found matching "${searchTerm}"`
                : selectedMembers.length > 0
                ? 'All employees already added or no more available'
                : 'No employees available'}
            </div>
          ) : (
            <ul>
              {filteredEmployees.map((employee) => (
                <li key={employee.id}>
                  <button
                    type="button"
                    onClick={() => handleAddMember(employee)}
                    className="w-full px-4 py-2 text-left hover:bg-forvis-blue-50 focus:bg-forvis-blue-50 focus:outline-none transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{employee.EmpNameFull}</p>
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

      {/* Selected Members List */}
      {selectedMembers.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Selected Team Members ({selectedMembers.length}):
          </p>
          <div className="space-y-2">
            {selectedMembers.map((member) => (
              <div
                key={member.empCode}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                  member.locked
                    ? 'bg-gray-50 border-gray-300'
                    : 'bg-white border-gray-200 hover:border-forvis-blue-300'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {member.locked && <Lock className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.empNameFull}
                    </p>
                    <p className="text-xs text-gray-600">{member.empCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                      member.role
                    )}`}
                  >
                    {member.role}
                  </span>
                  {!member.locked && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.empCode)}
                      className="p-1 hover:bg-red-50 rounded transition-colors"
                      title="Remove team member"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedMembers.length === 0 && (
        <p className="mt-2 text-xs text-gray-500 italic">
          No team members added yet. Partner and Manager will be added automatically.
        </p>
      )}
    </div>
  );
}


