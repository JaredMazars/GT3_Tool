'use client';

import { useState, useEffect } from 'react';
import { Upload, Edit, Archive, FileText, Clock, X, Plus } from 'lucide-react';
import { Button, LoadingSpinner, Input } from '@/components/ui';
import type { VaultDocumentType } from '@/types/documentVault';

interface ServiceLineVaultAdminProps {
  serviceLine: string; // e.g., 'TAX', 'QRM'
  isSystemAdmin: boolean;
}

export function ServiceLineVaultAdmin({ serviceLine, isSystemAdmin }: ServiceLineVaultAdminProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Upload form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    documentType: 'POLICY' as VaultDocumentType,
    categoryId: 0,
    tags: [] as string[],
    tagInput: '',
    effectiveDate: '',
    expiryDate: '',
  });

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch documents when switching to manage tab
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchDocuments();
    }
  }, [activeTab, statusFilter]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/document-vault/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ serviceLine });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/document-vault/admin?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data);
      } else {
        setError(data.error || 'Failed to load documents');
      }
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      if (!formData.title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
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

    setIsSubmitting(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('documentType', formData.documentType);
      formDataToSend.append('categoryId', String(formData.categoryId));
      formDataToSend.append('scope', 'SERVICE_LINE');
      formDataToSend.append('serviceLine', serviceLine);
      formDataToSend.append('tags', JSON.stringify(formData.tags));
      if (formData.effectiveDate) formDataToSend.append('effectiveDate', formData.effectiveDate);
      if (formData.expiryDate) formDataToSend.append('expiryDate', formData.expiryDate);

      const response = await fetch('/api/document-vault/admin', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Reset form
        setFile(null);
        setFormData({
          title: '',
          description: '',
          documentType: 'POLICY',
          categoryId: 0,
          tags: [],
          tagInput: '',
          effectiveDate: '',
          expiryDate: '',
        });
        setError(null);
        alert('Document uploaded successfully and sent for approval!');
      } else {
        setError(data.error || 'Failed to upload document');
      }
    } catch (err) {
      setError('An error occurred while uploading');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (documentId: number) => {
    if (!confirm('Are you sure you want to archive this document?')) return;

    try {
      const response = await fetch(`/api/document-vault/admin/${documentId}/archive`, {
        method: 'PATCH',
      });

      if (response.ok) {
        fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to archive document');
      }
    } catch (err) {
      alert('Failed to archive document');
      console.error(err);
    }
  };

  const filteredCategories = categories.filter(
    cat => !cat.documentType || cat.documentType === formData.documentType
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-forvis-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'manage'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            Manage Documents
          </button>
        </nav>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-lg border border-forvis-gray-200 p-6">
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-4">
            Upload New Document
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                File *
              </label>
              <div
                className="flex justify-center px-6 pt-5 pb-6 border-3 border-dashed rounded-xl cursor-pointer hover:border-forvis-blue-600 transition-colors"
                style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)' }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-forvis-blue-500" />
                  <div className="mt-2 text-sm text-forvis-gray-700">
                    {file ? (
                      <span className="font-medium">{file.name}</span>
                    ) : (
                      <>
                        <span className="font-semibold text-forvis-blue-600">Click to upload</span>
                        <span className="text-forvis-gray-600"> or drag and drop</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-forvis-gray-500 mt-1">
                    PDF, Word, Excel, PowerPoint up to 50MB
                  </p>
                </div>
              </div>
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              />
            </div>

            {/* Title */}
            <Input
              type="text"
              label="Title *"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter document title"
              required
            />

            {/* Description */}
            <Input
              variant="textarea"
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the document"
              rows={3}
            />

            {/* Document Type */}
            <Input
              variant="select"
              label="Document Type *"
              value={formData.documentType}
              onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value as VaultDocumentType, categoryId: 0 }))}
              options={[
                { value: 'POLICY', label: 'Policy' },
                { value: 'PROCEDURE', label: 'Procedure' },
                { value: 'TEMPLATE', label: 'Template' },
                { value: 'FORM', label: 'Form' },
                { value: 'GUIDE', label: 'Guide' },
                { value: 'TRAINING', label: 'Training Material' },
                { value: 'MARKETING', label: 'Marketing Material' },
                { value: 'OTHER', label: 'Other' },
              ]}
              required
            />

            {/* Category */}
            <Input
              variant="select"
              label="Category *"
              value={formData.categoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: parseInt(e.target.value) }))}
              options={[
                { value: 0, label: 'Select a category' },
                ...filteredCategories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
              required
            />

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  value={formData.tagInput}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTag}
                  disabled={!formData.tagInput.trim() || formData.tags.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Effective Date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
              />
              <Input
                type="date"
                label="Expiry Date"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="submit"
                variant="gradient"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-forvis-gray-700">
              Status:
            </label>
            <Input
              variant="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Documents' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
          </div>

          {/* Documents List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-forvis-gray-200">
              <FileText className="mx-auto h-12 w-12 text-forvis-gray-400" />
              <p className="mt-2 text-forvis-gray-600">No documents found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-forvis-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-forvis-gray-200">
                <thead className="bg-forvis-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-forvis-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-forvis-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-forvis-gray-900">
                        {doc.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-forvis-gray-600">
                        {doc.documentType}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'PUBLISHED'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'PENDING_APPROVAL'
                              ? 'bg-yellow-100 text-yellow-800'
                              : doc.status === 'ARCHIVED'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-forvis-gray-600">
                        v{doc.version}
                      </td>
                      <td className="px-6 py-4 text-sm text-forvis-gray-600">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right space-x-2">
                        {doc.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleArchive(doc.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
