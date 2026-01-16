'use client';

import { useState, useEffect } from 'react';
import { X, Save, FolderOpen, FileText, FileCheck, Megaphone, GraduationCap, HelpCircle, Settings, Users } from 'lucide-react';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { useDocumentTypes } from '@/hooks/documentVault';
import { CategoryApproverModal } from './CategoryApproverModal';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category?: {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    documentType: string | null;
    sortOrder: number;
    active: boolean;
    approverCount?: number;
  };
}

const PREDEFINED_COLORS = [
  { value: '#2E5AAC', label: 'Primary Blue' },
  { value: '#5B93D7', label: 'Light Blue' },
  { value: '#1C3667', label: 'Dark Blue' },
  { value: '#D9CBA8', label: 'Gold' },
  { value: '#6C757D', label: 'Gray' },
  { value: '#059669', label: 'Green' },
  { value: '#DC2626', label: 'Red' },
  { value: '#7C3AED', label: 'Purple' },
];

const ICON_OPTIONS = [
  { value: 'FolderOpen', label: 'Folder', icon: FolderOpen },
  { value: 'FileText', label: 'Document', icon: FileText },
  { value: 'FileCheck', label: 'Checked File', icon: FileCheck },
  { value: 'Megaphone', label: 'Megaphone', icon: Megaphone },
  { value: 'GraduationCap', label: 'Education', icon: GraduationCap },
  { value: 'Settings', label: 'Settings', icon: Settings },
  { value: 'HelpCircle', label: 'Help', icon: HelpCircle },
];

export function CategoryFormModal({ isOpen, onClose, onSuccess, category }: CategoryFormModalProps) {
  const isEditMode = !!category;
  const { types: documentTypes, isLoading: isLoadingTypes } = useDocumentTypes();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'FolderOpen',
    color: '#2E5AAC',
    documentType: '',
    sortOrder: 0,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApproverModal, setShowApproverModal] = useState(false);

  // Initialize form data when category changes
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'FolderOpen',
        color: category.color || '#2E5AAC',
        documentType: category.documentType || '',
        sortOrder: category.sortOrder,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: 'FolderOpen',
        color: '#2E5AAC',
        documentType: '',
        sortOrder: 0,
      });
    }
    setError(null);
  }, [category, isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    if (formData.name.length < 2) {
      setError('Category name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon,
        color: formData.color,
        documentType: formData.documentType || undefined,
        sortOrder: formData.sortOrder,
      };

      const url = isEditMode
        ? `/api/admin/document-vault/categories/${category.id}`
        : '/api/admin/document-vault/categories';

      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} category`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : FolderOpen;
  };

  const SelectedIcon = getIconComponent(formData.icon);

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
              <Settings className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">
                {isEditMode ? 'Edit Category' : 'Create New Category'}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-white hover:text-forvis-gray-200 transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800">{error}</p>
              </div>
            )}

            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                Category Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Tax Forms, Client Templates"
                disabled={isSubmitting}
                required
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category..."
                disabled={isSubmitting}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 disabled:bg-forvis-gray-50 disabled:text-forvis-gray-500 text-sm"
              />
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                disabled={isSubmitting || isLoadingTypes}
                className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 disabled:bg-forvis-gray-50 disabled:text-forvis-gray-500 text-sm"
              >
                <option value="">-- Select Type (Optional) --</option>
                {documentTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
              {isLoadingTypes && (
                <p className="mt-1 text-xs text-forvis-gray-500">Loading document types...</p>
              )}
            </div>

            {/* Icon and Color Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Icon Selector */}
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Icon
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 disabled:bg-forvis-gray-50 disabled:text-forvis-gray-500 text-sm"
                >
                  {ICON_OPTIONS.map((iconOpt) => (
                    <option key={iconOpt.value} value={iconOpt.value}>
                      {iconOpt.label}
                    </option>
                  ))}
                </select>
                {/* Icon Preview */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-forvis-gray-600">Preview:</span>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: formData.color }}
                  >
                    <SelectedIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Color
                </label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 disabled:bg-forvis-gray-50 disabled:text-forvis-gray-500 text-sm"
                >
                  {PREDEFINED_COLORS.map((colorOpt) => (
                    <option key={colorOpt.value} value={colorOpt.value}>
                      {colorOpt.label}
                    </option>
                  ))}
                </select>
                {/* Color Preview */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-forvis-gray-600">Selected:</span>
                  <div
                    className="w-10 h-6 rounded border border-forvis-gray-300"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-xs font-mono text-forvis-gray-600">{formData.color}</span>
                </div>
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                Sort Order
              </label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
                disabled={isSubmitting}
                min={0}
                max={9999}
              />
              <p className="mt-1 text-xs text-forvis-gray-500">
                Lower numbers appear first. Use multiples of 10 to allow easy reordering.
              </p>
            </div>

            {/* Manage Approvers Section (Edit Mode Only) */}
            {isEditMode && category && (
              <div className="pt-5 border-t border-forvis-gray-200">
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Approval Workflow
                </label>
                <div
                  className="p-4 rounded-lg border-2"
                  style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-forvis-blue-600" />
                        <span className="text-sm font-medium text-forvis-gray-900">
                          {category.approverCount === 0 ? 'No approvers assigned' : 
                           `${category.approverCount} approver${category.approverCount !== 1 ? 's' : ''} assigned`}
                        </span>
                      </div>
                      <p className="text-xs text-forvis-gray-600">
                        {category.approverCount === 0 
                          ? 'Documents cannot be uploaded until approvers are assigned'
                          : 'Documents will require sequential approval from all assigned approvers'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowApproverModal(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Approvers
                    </Button>
                  </div>
                  {category.approverCount === 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <strong>Action Required:</strong> Add at least one approver to enable document uploads to this category.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">{isEditMode ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update Category' : 'Create Category'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Approver Modal */}
      {isEditMode && category && showApproverModal && (
        <CategoryApproverModal
          isOpen={showApproverModal}
          onClose={() => setShowApproverModal(false)}
          category={{ id: category.id, name: category.name }}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}
