'use client';

import { useState, useEffect } from 'react';
import { ServiceLineRole } from '@/types';

interface EmployeeUser {
  id: string;
  email: string;
  displayName: string;
  jobTitle?: string | null;
  department?: string | null;
  officeLocation?: string | null;
  employeeId?: string | null;
  employeeType?: string | null;
  hasUserAccount?: boolean;
  EmpCode?: string;
  ServLineCode?: string;
  GSEmployeeID?: string;
  WinLogon?: string | null;
  office?: string;
}

interface UserSearchModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

export function UserSearchModal({ taskId, isOpen, onClose, onUserAdded }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmployeeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<EmployeeUser[]>([]);
  const [selectedRole, setSelectedRole] = useState<ServiceLineRole | string>('USER');
  const [error, setError] = useState('');
  const [filterServiceLine, setFilterServiceLine] = useState('');
  const [filterJobGrade, setFilterJobGrade] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [availableServiceLines, setAvailableServiceLines] = useState<string[]>([]);
  const [availableJobGrades, setAvailableJobGrades] = useState<string[]>([]);
  const [availableOffices, setAvailableOffices] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setError('');
      setFilterServiceLine('');
      setFilterJobGrade('');
      setFilterOffice('');
      // Load filters when modal opens
      loadFilters();
    }
  }, [isOpen]);

  // Load users when filters change (but only when modal is open)
  useEffect(() => {
    if (isOpen) {
      loadUsers(searchQuery);
    }
  }, [isOpen, filterServiceLine, filterJobGrade, filterOffice]);

  const loadFilters = async () => {
    try {
      const response = await fetch('/api/users/search/filters');
      const data = await response.json();

      if (data.success) {
        setAvailableServiceLines(data.data.serviceLines || []);
        setAvailableJobGrades(data.data.jobGrades || []);
        setAvailableOffices(data.data.offices || []);
      }
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const loadUsers = async (query: string) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('taskId', taskId.toString());
      
      if (query.trim()) {
        params.append('q', query.trim());
      }
      
      if (filterServiceLine) {
        params.append('serviceLine', filterServiceLine);
      }
      
      if (filterJobGrade) {
        params.append('jobGrade', filterJobGrade);
      }
      
      if (filterOffice) {
        params.append('office', filterOffice);
      }
      
      const response = await fetch(`/api/users/search?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      setError('An error occurred while loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await loadUsers(searchQuery);
  };

  const handleAddUsers = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);
    setError('');

    try {
      // Add all selected users in parallel
      const addPromises = selectedUsers.map(user =>
        fetch(`/api/tasks/${taskId}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id || undefined,
            role: selectedRole,
            employeeCode: user.EmpCode,
            GSEmployeeID: user.GSEmployeeID,
            displayName: user.displayName,
            email: user.email || user.WinLogon,
          }),
        }).then(res => res.json())
      );

      const results = await Promise.all(addPromises);
      
      // Check if any failed
      const failures = results.filter(r => !r.success);
      
      if (failures.length > 0) {
        setError(`Failed to add ${failures.length} of ${selectedUsers.length} employees`);
      } else {
        onUserAdded();
        onClose();
      }
    } catch (err) {
      setError('An error occurred while adding employees');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user: EmployeeUser) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.EmpCode === user.EmpCode);
      if (isSelected) {
        return prev.filter(u => u.EmpCode !== user.EmpCode);
      } else {
        return [...prev, user];
      }
    });
  };

  const isUserSelected = (user: EmployeeUser) => {
    return selectedUsers.some(u => u.EmpCode === user.EmpCode);
  };

  const selectAll = () => {
    setSelectedUsers([...searchResults]);
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-5xl w-full max-h-[90vh] flex flex-col border-2 border-forvis-gray-200">
        <div className="px-6 py-3 border-b-2 border-forvis-gray-200 flex justify-between items-center" style={{ background: 'linear-gradient(to right, #EBF2FA, #D6E4F5)' }}>
          <div>
            <h2 className="text-lg font-bold text-forvis-blue-900">Add Employees to Task</h2>
            <p className="text-xs text-forvis-blue-800 mt-0.5">
              Search and select employees {selectedUsers.length > 0 && `(${selectedUsers.length} selected)`}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3 min-h-0">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg shadow-corporate">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">{error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-forvis-gray-900 mb-2">
              Search Employees
            </label>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-forvis-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Search by name or code..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 shadow-corporate"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 text-white font-semibold rounded-lg transition-all shadow-corporate hover:shadow-corporate-md"
                style={{ 
                  background: loading ? '#ADB5BD' : 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </span>
                ) : 'Search'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-forvis-gray-700 mb-1">
                  Filter by Service Line
                </label>
                <select
                  value={filterServiceLine}
                  onChange={(e) => setFilterServiceLine(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 bg-white shadow-corporate"
                >
                  <option value="">All Service Lines</option>
                  {availableServiceLines.map((sl) => (
                    <option key={sl} value={sl}>{sl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-forvis-gray-700 mb-1">
                  Filter by Job Grading
                </label>
                <select
                  value={filterJobGrade}
                  onChange={(e) => setFilterJobGrade(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 bg-white shadow-corporate"
                >
                  <option value="">All Job Grades</option>
                  {availableJobGrades.map((jg) => (
                    <option key={jg} value={jg}>{jg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-forvis-gray-700 mb-1">
                  Filter by Office
                </label>
                <select
                  value={filterOffice}
                  onChange={(e) => setFilterOffice(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 bg-white shadow-corporate"
                >
                  <option value="">All Offices</option>
                  {availableOffices.map((office) => (
                    <option key={office} value={office}>{office}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-forvis-gray-900">
                  Select Employees ({searchResults.length} found)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs px-3 py-1 text-forvis-blue-700 bg-forvis-blue-50 rounded border border-forvis-blue-300 hover:bg-forvis-blue-100 transition-colors"
                  >
                    Select All
                  </button>
                  {selectedUsers.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-xs px-3 py-1 text-forvis-gray-700 bg-forvis-gray-100 rounded border border-forvis-gray-300 hover:bg-forvis-gray-200 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {searchResults.map((user) => {
                  const initials = user.displayName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  
                  const hasAccount = user.hasUserAccount !== false;
                  const isSelected = isUserSelected(user);
                  
                  return (
                    <div
                      key={user.EmpCode || user.id}
                      onClick={() => toggleUserSelection(user)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all shadow-corporate ${
                        isSelected
                          ? 'border-forvis-blue-500 shadow-corporate-md'
                          : 'border-forvis-gray-300 hover:border-forvis-blue-400'
                      }`}
                      style={{
                        background: isSelected 
                          ? 'linear-gradient(135deg, #EBF2FA 0%, #D6E4F5 100%)'
                          : '#FFFFFF'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-corporate flex-shrink-0"
                          style={{ 
                            background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'
                          }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-forvis-gray-900 text-sm">{user.displayName}</div>
                              {!hasAccount && (
                                <span className="text-xs px-2 py-0.5 bg-forvis-warning-100 text-forvis-warning-800 rounded border border-forvis-warning-300 whitespace-nowrap">
                                  Will create account
                                </span>
                              )}
                            </div>
                            {user.email && (
                              <div className="text-xs text-forvis-gray-600 truncate">{user.email}</div>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs text-forvis-gray-700">
                            <div className="flex items-center gap-4 flex-wrap">
                              {user.employeeId && (
                                <div>
                                  <span className="font-semibold text-forvis-gray-900">Code:</span> {user.employeeId}
                                </div>
                              )}
                              {user.officeLocation && (
                                <div>
                                  <span className="font-semibold text-forvis-gray-900">Office:</span> {user.officeLocation}
                                </div>
                              )}
                              {user.jobTitle && (
                                <div>
                                  <span className="font-semibold text-forvis-gray-900">Job Grading:</span> {user.jobTitle}
                                </div>
                              )}
                              {user.department && (
                                <div>
                                  <span className="font-semibold text-forvis-gray-900">Service Line:</span> {user.department}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 text-forvis-blue-600 border-2 border-forvis-gray-300 rounded focus:ring-2 focus:ring-forvis-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {selectedUsers.length > 0 && (
          <div className="px-6 py-3 border-t-2 border-forvis-blue-300 shadow-lg" style={{ background: 'linear-gradient(135deg, #EBF2FA 0%, #D6E4F5 100%)' }}>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-forvis-blue-900 mb-2">
                  Assign Role to {selectedUsers.length} Employee{selectedUsers.length !== 1 ? 's' : ''}
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 bg-white font-medium shadow-corporate text-sm h-[38px]"
                >
                  <option value="VIEWER">👁️ Viewer - Read-only access</option>
                  <option value="USER">✏️ User - Standard team member</option>
                  <option value="SUPERVISOR">👔 Supervisor - Can review work</option>
                  <option value="MANAGER">📊 Manager - Task management</option>
                  <option value="PARTNER">⭐ Partner - Senior leadership</option>
                  <option value="ADMINISTRATOR">⚙️ Administrator - Full control</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-white text-forvis-gray-700 font-semibold rounded-lg border-2 border-forvis-gray-300 hover:bg-forvis-gray-100 transition-colors shadow-corporate text-sm h-[38px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUsers}
                  disabled={loading}
                  className="px-5 py-2 text-white font-semibold rounded-lg transition-all shadow-corporate hover:shadow-corporate-md disabled:shadow-none disabled:cursor-not-allowed text-sm whitespace-nowrap h-[38px]"
                  style={{ 
                    background: loading ? '#ADB5BD' : 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'
                  }}
                >
                  {loading ? 'Adding...' : `Add ${selectedUsers.length} Employee${selectedUsers.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedUsers.length === 0 && (
          <div className="px-6 py-3 bg-forvis-gray-50 border-t-2 border-forvis-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-white text-forvis-gray-700 font-semibold rounded-lg border-2 border-forvis-gray-300 hover:bg-forvis-gray-100 transition-colors shadow-corporate text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


