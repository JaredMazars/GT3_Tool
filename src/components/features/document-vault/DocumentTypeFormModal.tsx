'use client';

import { useState, useEffect } from 'react';
import { X, Save, Tag, FolderOpen, FileText, FileCheck, Megaphone, GraduationCap, HelpCircle, Settings } from 'lucide-react';
import { Button, Input, LoadingSpinner } from '@/components/ui';

interface DocumentTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentType?: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sortOrder: number;
    active: boolean;
  };
}

const ICON_OPTIONS = [
  { value: 'FolderOpen', label: 'Folder', icon: FolderOpen },
  { value: 'FileText', label: 'Document', icon: FileText },
  { value: 'FileCheck', label: 'Checked File', icon: FileCheck },
  { value: 'Megaphone', label: 'Megaphone', icon: Megaphone },
  { value: 'GraduationCap', label: 'Education', icon: GraduationCap },
  { value: 'Settings', label: 'Settings', icon: Settings },
  { value: 'HelpCircle', label: 'Help', icon: HelpCircle },
  { value: 'Tag', label: 'Tag', icon: Tag },
];

const PREDEFINED_COLORS = [
  { value: '#2E5AAC', label: 'Primary Blue' },
  { value: '#5B93D7', label: 'Light Blue' },
  { value: '#1C3667', label: 'Dark Blue' },
  { value: '#D9CBA8', label: 'Gold' },
  { value: '#6C757D', label: 'Gray' },
  { value: '#059669', label: 'Green' },
  { value: '#DC2626', label: 'Red' },
  { value: '#7C3AED', label: 'Purple' },
  { value: '#F59E0B', label: 'Amber' },
];

export function DocumentTypeFormModal({ isOpen, onClose, onSuccess, documentType }: DocumentTypeFormModalProps) {
  const isEditMode = !!documentType;
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: 'FileText',
    color: '#2E5AAC',
    sortOrder: 0,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when documentType changes
  useEffect(() => {
    if (documentType) {
      setFormData({
        code: documentType.code,
        name: documentType.name,
        description: documentType.description || '',
        icon: documentType.icon || 'FileText',
        color: documentType.color || '#2E5AAC',
        sortOrder: documentType.sortOrder,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        icon: 'FileText',
        color: '#2E5AAC',
        sortOrder: 0,
      });
    }
    setError(null);
  }, [documentType, isOpen]);

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
    if (!isEditMode && !formData.code.trim()) {
      setError('Document type code is required');
      return;
    }

    if (!formData.name.trim()) {
      setError('Document type name is required');
      return;
    }

    // Validate code format (uppercase with underscores)
    if (!isEditMode) {
      const codeRegex = /^[A-Z_]+$/;
      if (!codeRegex.test(formData.code)) {
        setError('Code must be uppercase letters and underscores only (e.g., CUSTOM_TYPE)');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon,
        color: formData.color,
        sortOrder: formData.sortOrder,
      };

      // Only include code when creating
      if (!isEditMode) {
        payload.code = formData.code.trim().toUpperCase();
      }

      const url = isEditMode
        ? `/api/admin/document-vault/types/${documentType.id}`
        : '/api/admin/document-vault/types';

      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} document type`);
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
    return iconOption ? iconOption.icon : FileText;
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
              <Tag className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">
                {isEditMode ? 'Edit Document Type' : 'Create New Document Type'}
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

            {/* Code (immutable in edit mode) */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                Type Code <span className="text-red-500">*</span>
                {isEditMode && <span className="text-forvis-gray-500 font-normal ml-2">(immutable)</span>}
              </label>
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CUSTOM_TYPE, SPECIAL_DOC"
                disabled={isSubmitting || isEditMode}
                required={!isEditMode}
                maxLength={50}
              />
              {!isEditMode && (
                <p className="mt-1 text-xs text-forvis-gray-500">
                  Uppercase letters and underscores only. Cannot be changed after creation.
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                Display Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Custom Document, Special Form"
                disabled={isSubmitting}
                required
                maxLength={100}
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
                placeholder="Brief description of this document type..."
                disabled={isSubmitting}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 disabled:bg-forvis-gray-50 disabled:text-forvis-gray-500 text-sm"
              />
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
                  {isEditMode ? 'Update Type' : 'Create Type'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
