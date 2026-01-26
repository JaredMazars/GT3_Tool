'use client';

import { useState, useEffect } from 'react';
import { X, Save, Users, GripVertical, Trash2, Search, Plus, AlertCircle } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import type { CategoryApprover } from '@/types/documentVault';

interface CategoryApproverModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: { id: number; name: string };
  onSuccess: () => void;
}

interface UserSearchResult {
  id: string;
  name: string | null;
  email: string;
}

export function CategoryApproverModal({ isOpen, onClose, category, onSuccess }: CategoryApproverModalProps) {
  const [approvers, setApprovers] = useState<CategoryApprover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Load current approvers
  useEffect(() => {
    if (isOpen && category) {
      fetchApprovers();
    }
  }, [isOpen, category]);

  const fetchApprovers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/document-vault/categories/${category.id}/approvers`);
      const data = await response.json();
      
      if (data.success) {
        setApprovers(data.data.approvers || []);
      } else {
        setError(data.error || 'Failed to load approvers');
      }
    } catch (err) {
      setError('Failed to load approvers');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(term)}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        // Filter out users already in approvers list
        const existingUserIds = approvers.map(a => a.userId);
        const filtered = data.data.users.filter((u: UserSearchResult) => !existingUserIds.includes(u.id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('User search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, approvers]);

  const handleAddApprover = (user: UserSearchResult) => {
    const newApprover: CategoryApprover = {
      id: 0, // Temporary ID for new approvers
      categoryId: category.id,
      userId: user.id,
      stepOrder: approvers.length + 1,
      createdAt: new Date(),
      createdBy: '',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };

    setApprovers([...approvers, newApprover]);
    setSearchTerm('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleRemoveApprover = (index: number) => {
    const updated = approvers.filter((_, i) => i !== index);
    // Reorder step orders
    const reordered = updated.map((approver, i) => ({
      ...approver,
      stepOrder: i + 1,
    }));
    setApprovers(reordered);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const updated = [...approvers];
    const temp = updated[index - 1];
    const current = updated[index];
    if (temp && current) {
      updated[index - 1] = current;
      updated[index] = temp;
    }
    
    // Update step orders
    const reordered = updated.map((approver, i) => ({
      ...approver,
      stepOrder: i + 1,
    }));
    setApprovers(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === approvers.length - 1) return;
    
    const updated = [...approvers];
    const current = updated[index];
    const next = updated[index + 1];
    if (current && next) {
      updated[index] = next;
      updated[index + 1] = current;
    }
    
    // Update step orders
    const reordered = updated.map((approver, i) => ({
      ...approver,
      stepOrder: i + 1,
    }));
    setApprovers(reordered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (approvers.length === 0) {
      setError('At least one approver is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/document-vault/categories/${category.id}/approvers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvers: approvers.map(a => a.userId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save approvers');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save approvers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSearchTerm('');
      setSearchResults([]);
      setShowSearch(false);
      setError(null);
      onClose();
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg sticky top-0 z-10"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-white" />
              <div>
                <h3 className="text-lg font-bold text-white">Manage Approvers</h3>
                <p className="text-sm text-white opacity-90">{category.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-white hover:text-forvis-gray-200 transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-800">{error}</p>
              </div>
            )}

            {/* Info Banner */}
            <div
              className="p-4 rounded-lg border-2"
              style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}
            >
              <p className="text-sm text-forvis-gray-800">
                <strong>Sequential Approval:</strong> Documents uploaded to this category will be reviewed by approvers in the order listed below. Each approver must approve before moving to the next step.
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            )}

            {/* Approvers List */}
            {!isLoading && (
              <>
                {approvers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-forvis-gray-400 mx-auto mb-3" />
                    <p className="text-forvis-gray-600 mb-1">No approvers assigned</p>
                    <p className="text-sm text-forvis-gray-500">Add at least one approver to enable document uploads</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                      Approval Sequence ({approvers.length} approver{approvers.length !== 1 ? 's' : ''})
                    </label>
                    {approvers.map((approver, index) => (
                      <div
                        key={`${approver.userId}-${index}`}
                        className="flex items-center gap-3 p-3 border-2 border-forvis-gray-200 rounded-lg bg-white hover:border-forvis-blue-300 transition-colors"
                      >
                        {/* Step Order */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-forvis-blue-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-forvis-blue-800">{index + 1}</span>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-forvis-gray-900 truncate">
                            {approver.user.name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-forvis-gray-600 truncate">
                            {approver.user.email}
                          </div>
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 text-forvis-gray-400 hover:text-forvis-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move up"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === approvers.length - 1}
                            className="p-1 text-forvis-gray-400 hover:text-forvis-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move down"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveApprover(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove approver"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Approver Section */}
                <div className="pt-4 border-t border-forvis-gray-200">
                  {!showSearch ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowSearch(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Approver
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-forvis-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search users by name or email..."
                          className="w-full pl-10 pr-10 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 text-sm"
                          autoFocus
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setShowSearch(false);
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-forvis-gray-400 hover:text-forvis-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Search Results */}
                      {isSearching && (
                        <div className="text-center py-4">
                          <LoadingSpinner size="sm" />
                        </div>
                      )}

                      {!isSearching && searchResults.length > 0 && (
                        <div className="border border-forvis-gray-200 rounded-lg divide-y divide-forvis-gray-200 max-h-60 overflow-y-auto">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleAddApprover(user)}
                              className="w-full text-left p-3 hover:bg-forvis-blue-50 transition-colors"
                            >
                              <div className="text-sm font-medium text-forvis-gray-900">
                                {user.name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-forvis-gray-600">{user.email}</div>
                            </button>
                          ))}
                        </div>
                      )}

                      {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
                        <div className="text-center py-4 text-sm text-forvis-gray-600">
                          No users found matching "{searchTerm}"
                        </div>
                      )}

                      {searchTerm.length > 0 && searchTerm.length < 2 && (
                        <div className="text-center py-4 text-xs text-forvis-gray-500">
                          Type at least 2 characters to search
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isLoading || approvers.length === 0}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Approvers
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
