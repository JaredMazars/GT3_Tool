'use client';

import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import type { VaultDocumentType, VaultDocumentScope } from '@/types/documentVault';

interface DocumentUploadFormProps {
  categories: Array<{ id: number; name: string; documentType: string | null }>;
  serviceLines?: string[];
  onSuccess?: (documentId: number) => void;
  onCancel?: () => void;
}

export function DocumentUploadForm({ categories, serviceLines = [], onSuccess, onCancel }: DocumentUploadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    documentType: 'POLICY' as VaultDocumentType,
    categoryId: 0,
    scope: 'GLOBAL' as VaultDocumentScope,
    serviceLine: '',
    tags: [] as string[],
    tagInput: '',
    effectiveDate: '',
    expiryDate: '',
  });

  const filteredCategories = categories.filter(
    cat => !cat.documentType || cat.documentType === formData.documentType
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (50MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Auto-fill title from filename if empty
      if (!formData.title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setFormData(prev => ({ ...prev, title: fileName }));
      }
    }
  };

  const handleAddTag = () => {
    if (formData.tagInput.trim() && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: '',
      }));
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!formData.categoryId) {
      setError('Please select a category');
      return;
    }

    if (formData.scope === 'SERVICE_LINE' && !formData.serviceLine) {
      setError('Please select a service line for service line scoped documents');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('metadata', JSON.stringify({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        documentType: formData.documentType,
        categoryId: formData.categoryId,
        scope: formData.scope,
        serviceLine: formData.scope === 'SERVICE_LINE' ? formData.serviceLine : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        effectiveDate: formData.effectiveDate || undefined,
        expiryDate: formData.expiryDate || undefined,
      }));

      const response = await fetch('/api/admin/document-vault', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (onSuccess) {
        onSuccess(result.data.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          Document File *
        </label>
        <div
          className="flex justify-center px-6 pt-5 pb-6 border-3 border-dashed rounded-xl cursor-pointer hover:border-forvis-blue-600 transition-colors"
          style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)' }}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className="space-y-2 text-center">
            <Upload className="mx-auto h-12 w-12 text-forvis-blue-600" />
            <div className="text-sm text-forvis-gray-600">
              {file ? (
                <span className="font-medium text-forvis-blue-600">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-forvis-blue-600">Click to upload</span> or drag and drop
                </>
              )}
            </div>
            <p className="text-xs text-forvis-gray-500">
              PDF, DOCX, XLSX, PPTX, Images up to 50MB
            </p>
          </div>
        </div>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.svg,.txt,.md"
        />
      </div>

      {/* Document Type */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          Document Type *
        </label>
        <select
          value={formData.documentType}
          onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value as VaultDocumentType, categoryId: 0 }))}
          className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          required
        >
          <option value="POLICY">Policy</option>
          <option value="SOP">SOP</option>
          <option value="TEMPLATE">Template</option>
          <option value="MARKETING">Marketing</option>
          <option value="TRAINING">Training</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
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
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          maxLength={1000}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          Category *
        </label>
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData(prev => ({ ...prev, categoryId: parseInt(e.target.value) }))}
          className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          required
        >
          <option value={0}>Select a category</option>
          {filteredCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scope */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          Scope *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="GLOBAL"
              checked={formData.scope === 'GLOBAL'}
              onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value as VaultDocumentScope, serviceLine: '' }))}
              className="mr-2"
            />
            Global
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="SERVICE_LINE"
              checked={formData.scope === 'SERVICE_LINE'}
              onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value as VaultDocumentScope }))}
              className="mr-2"
            />
            Service Line
          </label>
        </div>
      </div>

      {/* Service Line (conditional) */}
      {formData.scope === 'SERVICE_LINE' && serviceLines.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
            Service Line *
          </label>
          <select
            value={formData.serviceLine}
            onChange={(e) => setFormData(prev => ({ ...prev, serviceLine: e.target.value }))}
            className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
            required
          >
            <option value="">Select a service line</option>
            {serviceLines.map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          Tags
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.tagInput}
            onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag..."
            className="flex-1 px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
            maxLength={50}
          />
          <Button type="button" onClick={handleAddTag} variant="secondary">
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-forvis-blue-100 text-forvis-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(index)}
                  className="hover:text-forvis-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
            Effective Date
          </label>
          <input
            type="date"
            value={formData.effectiveDate}
            onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
            className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
            Expiry Date
          </label>
          <input
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
            className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-forvis-gray-200">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              Uploading...
            </>
          ) : (
            'Upload Document'
          )}
        </Button>
      </div>
    </form>
  );
}
