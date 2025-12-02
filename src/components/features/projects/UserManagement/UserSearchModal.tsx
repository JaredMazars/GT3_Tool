'use client';

import { useState, useEffect } from 'react';
import { ADUser, ProjectRole } from '@/types';

interface UserSearchModalProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

export function UserSearchModal({ projectId, isOpen, onClose, onUserAdded }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ADUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ADUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('VIEWER' as ProjectRole);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setError('');
      // Load initial users when modal opens
      loadUsers('');
    }
  }, [isOpen]);

  const loadUsers = async (query: string) => {
    setLoading(true);
    setError('');

    try {
      const url = query.trim() 
        ? `/api/users/search?q=${encodeURIComponent(query)}&projectId=${projectId}`
        : `/api/users/search?projectId=${projectId}`;
      
      const response = await fetch(url);
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
    setLoading(true);
    setError('');

    await loadUsers(searchQuery);
  };

  const handleAddUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onUserAdded();
        onClose();
      } else {
        setError(data.error || 'Failed to add user');
      }
    } catch (err) {
      setError('An error occurred while adding user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-forvis-gray-200">
        <div className="px-6 py-4 border-b-2 border-forvis-gray-200 flex justify-between items-center" style={{ background: 'linear-gradient(to right, #EBF2FA, #D6E4F5)' }}>
          <div>
            <h2 className="text-xl font-bold text-forvis-blue-900">Add User to Project</h2>
            <p className="text-sm text-forvis-blue-800 mt-1">Search for users in the system</p>
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

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
              Search Users
            </label>
            <div className="flex gap-2">
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
                  placeholder="Search by name or email..."
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
          </div>

          {searchResults.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-forvis-gray-900 mb-3">
                Select User ({searchResults.length} found)
              </label>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {searchResults.map((user) => {
                  const initials = user.displayName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  
                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all shadow-corporate ${
                        selectedUser?.id === user.id
                          ? 'border-forvis-blue-500 shadow-corporate-md'
                          : 'border-forvis-gray-300 hover:border-forvis-blue-400'
                      }`}
                      style={{
                        background: selectedUser?.id === user.id 
                          ? 'linear-gradient(135deg, #EBF2FA 0%, #D6E4F5 100%)'
                          : '#FFFFFF'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-corporate"
                          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-forvis-gray-900">{user.displayName}</div>
                          <div className="text-sm text-forvis-gray-600 truncate">{user.email}</div>
                          {user.jobTitle && (
                            <div className="text-xs text-forvis-gray-500 mt-1">{user.jobTitle}</div>
                          )}
                        </div>
                        {selectedUser?.id === user.id && (
                          <svg className="w-6 h-6 text-forvis-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="rounded-lg p-4 border-2 border-forvis-blue-300 shadow-corporate" style={{ background: 'linear-gradient(135deg, #EBF2FA 0%, #D6E4F5 100%)' }}>
              <label className="block text-sm font-bold text-forvis-blue-900 mb-3">
                Assign Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                className="w-full px-4 py-3 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 bg-white font-medium shadow-corporate"
              >
                <option value="VIEWER">👁️ Viewer - Read-only access</option>
                <option value="EDITOR">✏️ Editor - Can edit data</option>
                <option value="REVIEWER">✅ Reviewer - Can approve/reject adjustments</option>
                <option value="ADMIN">⚙️ Admin - Full project control</option>
              </select>
              <p className="mt-2 text-xs text-forvis-blue-800 font-medium">
                Choose the appropriate access level for this user
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-forvis-gray-50 border-t-2 border-forvis-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white text-forvis-gray-700 font-semibold rounded-lg border-2 border-forvis-gray-300 hover:bg-forvis-gray-100 transition-colors shadow-corporate"
          >
            Cancel
          </button>
          <button
            onClick={handleAddUser}
            disabled={!selectedUser}
            className="px-6 py-2 text-white font-semibold rounded-lg transition-all shadow-corporate hover:shadow-corporate-md disabled:shadow-none"
            style={{ 
              background: !selectedUser ? '#ADB5BD' : 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'
            }}
          >
            Add User to Project
          </button>
        </div>
      </div>
    </div>
  );
}


