'use client';

import { useState } from 'react';
import { Upload, X, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import { useDocumentTypes } from '@/hooks/documentVault';
import type { VaultDocumentType, VaultDocumentScope } from '@/types/documentVault';
import type { VaultDocumentSuggestions } from '@/lib/services/document-vault/documentVaultExtractionService';

interface DocumentUploadFormProps {
  categories: Array<{ 
    id: number; 
    name: string; 
    documentType: string | null;
    approverCount?: number;
    active?: boolean;
  }>;
  serviceLines?: string[];
  onSuccess?: (documentId: number) => void;
  onCancel?: () => void;
  defaultServiceLine?: string; // Pre-set service line for service line context
  
  // Edit mode props
  mode?: 'create' | 'edit';
  documentToEdit?: {
    id: number;
    title: string;
    description: string | null;
    documentType: string;
    categoryId: number;
    scope: string;
    serviceLine: string | null;
    tags: string | null;
    effectiveDate: Date | null;
    expiryDate: Date | null;
    documentVersion: string | null;
    fileName: string;
  };
}

export function DocumentUploadForm({ 
  categories, 
  serviceLines = [], 
  onSuccess, 
  onCancel, 
  defaultServiceLine,
  mode = 'create',
  documentToEdit
}: DocumentUploadFormProps) {
  const { types: documentTypes, isLoading: isLoadingTypes } = useDocumentTypes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // AI Extraction state (only for create mode)
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [aiSuggestions, setAISuggestions] = useState<VaultDocumentSuggestions | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tempBlobPath, setTempBlobPath] = useState<string | null>(null);
  
  // Initialize form data based on mode
  const getInitialFormData = () => {
    if (mode === 'edit' && documentToEdit) {
      const tags = documentToEdit.tags ? JSON.parse(documentToEdit.tags) : [];
      return {
        title: documentToEdit.title,
        description: documentToEdit.description || '',
        documentType: documentToEdit.documentType as VaultDocumentType,
        documentVersion: documentToEdit.documentVersion || '',
        categoryId: documentToEdit.categoryId,
        scope: documentToEdit.scope as VaultDocumentScope,
        serviceLine: documentToEdit.serviceLine || '',
        tags: Array.isArray(tags) ? tags : [],
        tagInput: '',
        effectiveDate: documentToEdit.effectiveDate 
          ? new Date(documentToEdit.effectiveDate).toISOString().split('T')[0]
          : '',
        expiryDate: documentToEdit.expiryDate 
          ? new Date(documentToEdit.expiryDate).toISOString().split('T')[0]
          : '',
      };
    }
    
    return {
      title: '',
      description: '',
      documentType: (documentTypes[0]?.code || 'POLICY') as VaultDocumentType,
      documentVersion: '',
      categoryId: 0,
      scope: (defaultServiceLine ? 'SERVICE_LINE' : 'GLOBAL') as VaultDocumentScope,
      serviceLine: defaultServiceLine || '',
      tags: [] as string[],
      tagInput: '',
      effectiveDate: '',
      expiryDate: '',
    };
  };
  
  const [formData, setFormData] = useState(getInitialFormData());

  const filteredCategories = categories.filter(
    cat => !cat.documentType || cat.documentType === formData.documentType
  );

  const selectedCategory = categories.find(cat => cat.id === formData.categoryId);

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
      setExtractError(null);
      
      // Reset AI suggestions when new file is selected
      setAISuggestions(null);
      setShowSuggestions(false);
      setTempBlobPath(null);
      
      // Auto-fill title from filename if empty
      if (!formData.title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setFormData(prev => ({ ...prev, title: fileName }));
      }
    }
  };

  const handleExtractFromDocument = async () => {
    if (!file) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);

      const response = await fetch('/api/document-vault/extract', {
        method: 'POST',
        body: formDataToUpload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract content from document');
      }

      const data = await response.json();
      
      if (data.data?.suggestions) {
        setAISuggestions(data.data.suggestions);
        setShowSuggestions(true);
        
        // Store temp blob path for later use
        if (data.data?.documentMetadata?.tempBlobPath) {
          setTempBlobPath(data.data.documentMetadata.tempBlobPath);
        }
      }
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : 'Failed to extract content');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAcceptSuggestion = (field: keyof VaultDocumentSuggestions) => {
    if (!aiSuggestions) return;
    
    const value = aiSuggestions[field];
    
    if (field === 'title' || field === 'description') {
      setFormData(prev => ({ ...prev, [field]: value as string }));
    } else if (field === 'documentType') {
      setFormData(prev => ({ ...prev, documentType: value as VaultDocumentType, categoryId: 0 }));
    } else if (field === 'scope') {
      setFormData(prev => ({ ...prev, scope: value as VaultDocumentScope }));
    } else if (field === 'serviceLine') {
      setFormData(prev => ({ ...prev, serviceLine: value as string || '' }));
    } else if (field === 'tags') {
      setFormData(prev => ({ ...prev, tags: value as string[] }));
    } else if (field === 'effectiveDate' || field === 'expiryDate') {
      setFormData(prev => ({ ...prev, [field]: value as string || '' }));
    }
  };

  const handleAcceptCategoryFromSuggestion = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (category) {
      setFormData(prev => ({ ...prev, categoryId: category.id }));
    }
  };

  const handleAcceptAllSuggestions = () => {
    if (!aiSuggestions) return;
    
    // Find matching category
    const matchedCategory = aiSuggestions.suggestedCategory 
      ? categories.find(cat => cat.name === aiSuggestions.suggestedCategory)
      : undefined;

    setFormData(prev => ({
      ...prev,
      title: aiSuggestions.title,
      description: aiSuggestions.description,
      documentType: aiSuggestions.documentType,
      documentVersion: aiSuggestions.documentVersion || '',
      categoryId: matchedCategory?.id || prev.categoryId,
      scope: aiSuggestions.scope,
      serviceLine: aiSuggestions.serviceLine || '',
      tags: aiSuggestions.tags,
      effectiveDate: aiSuggestions.effectiveDate || '',
      expiryDate: aiSuggestions.expiryDate || '',
    }));
    
    setShowSuggestions(false);
  };

  const handleRejectSuggestions = () => {
    setShowSuggestions(false);
    setAISuggestions(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setAISuggestions(null);
    setShowSuggestions(false);
    setTempBlobPath(null);
    setExtractError(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
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
    
    // File is required in create mode, optional in edit mode
    if (mode === 'create' && !file) {
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

    // Validate category has approvers
    const category = categories.find(cat => cat.id === formData.categoryId);
    if (category && (category.approverCount ?? 0) === 0) {
      setError('Cannot upload to this category. No approvers assigned. Please select a different category or contact administrator.');
      return;
    }

    if (category && category.active === false) {
      setError('Cannot upload to inactive category. Please select a different category.');
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
      
      // Add file if provided (required for create, optional for edit)
      if (file) {
        data.append('file', file);
      }
      
      data.append('metadata', JSON.stringify({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        documentType: formData.documentType,
        documentVersion: formData.documentVersion.trim() || undefined,
        categoryId: formData.categoryId,
        scope: formData.scope,
        serviceLine: formData.scope === 'SERVICE_LINE' ? formData.serviceLine : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        effectiveDate: formData.effectiveDate || undefined,
        expiryDate: formData.expiryDate || undefined,
        tempBlobPath: mode === 'create' ? (tempBlobPath || undefined) : undefined,
      }));

      let endpoint: string;
      let method: string;
      
      if (mode === 'edit' && documentToEdit) {
        // Edit mode: PATCH to update endpoint
        endpoint = `/api/admin/document-vault/${documentToEdit.id}`;
        method = 'PATCH';
      } else {
        // Create mode: POST to create endpoint
        endpoint = defaultServiceLine ? '/api/document-vault/admin' : '/api/admin/document-vault';
        method = 'POST';
      }
      
      const response = await fetch(endpoint, {
        method,
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || (mode === 'edit' ? 'Update failed' : 'Upload failed'));
      }

      const result = await response.json();
      
      if (onSuccess) {
        onSuccess(mode === 'edit' && documentToEdit ? documentToEdit.id : result.data.id);
      }
    } catch (err: any) {
      setError(err.message || (mode === 'edit' ? 'Failed to update document' : 'Failed to upload document'));
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
          Document File {mode === 'create' ? '*' : '(optional - replace existing)'}
        </label>
        {mode === 'edit' && documentToEdit && !file && (
          <div className="mb-2 text-sm text-forvis-gray-600">
            Current file: <span className="font-medium">{documentToEdit.fileName}</span>
          </div>
        )}
        {!file ? (
          <div
            className="flex justify-center px-6 pt-5 pb-6 border-3 border-dashed rounded-xl cursor-pointer hover:border-forvis-blue-600 transition-colors"
            style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)' }}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <div className="space-y-2 text-center">
              <Upload className="mx-auto h-12 w-12 text-forvis-blue-600" />
              <div className="text-sm text-forvis-gray-600">
                <span className="font-medium text-forvis-blue-600">Click to upload</span> or drag and drop
              </div>
              <p className="text-xs text-forvis-gray-500">
                PDF, DOCX, XLSX, PPTX, Images up to 50MB
              </p>
            </div>
          </div>
        ) : (
          <div className="border-2 rounded-lg p-4" style={{ borderColor: '#2E5AAC', background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-forvis-blue-600" />
                <div>
                  <p className="text-sm font-medium text-forvis-gray-900">{file.name}</p>
                  <p className="text-xs text-forvis-gray-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-2 text-forvis-gray-400 hover:text-forvis-gray-600 rounded-lg hover:bg-white/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {mode === 'create' && !aiSuggestions && !isExtracting && (
              <div className="mt-4 pt-4 border-t border-forvis-blue-200">
                <Button
                  type="button"
                  variant="gradient"
                  onClick={handleExtractFromDocument}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract from Document with AI
                </Button>
              </div>
            )}
            
            {isExtracting && (
              <div className="mt-4 pt-4 border-t border-forvis-blue-200">
                <div className="flex items-center justify-center gap-2 text-forvis-blue-600">
                  <LoadingSpinner size="sm" />
                  <p className="text-sm">AI is analyzing your document...</p>
                </div>
              </div>
            )}
            
            {extractError && (
              <div className="mt-4 pt-4 border-t border-forvis-blue-200">
                <div className="flex items-start gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{extractError}</p>
                </div>
              </div>
            )}
          </div>
        )}
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.svg,.txt,.md"
        />
      </div>

      {/* AI Suggestions Panel */}
      {showSuggestions && aiSuggestions && (
        <div 
          className="border-2 rounded-lg p-4 space-y-4"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-forvis-blue-600" />
              <h3 className="text-sm font-semibold text-forvis-gray-900">AI-Generated Suggestions</h3>
              {aiSuggestions.confidence < 0.7 && (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  Low Confidence - Please Review
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleRejectSuggestions}
              className="p-1 text-forvis-gray-400 hover:text-forvis-gray-600 rounded-lg hover:bg-white/50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {aiSuggestions.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  {aiSuggestions.warnings.map((warning, idx) => (
                    <p key={idx} className="text-xs text-yellow-800">{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Title Suggestion */}
            <div className="bg-white rounded-lg p-3 border border-forvis-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-forvis-gray-600">Title</span>
                <button
                  type="button"
                  onClick={() => handleAcceptSuggestion('title')}
                  className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                >
                  Use This
                </button>
              </div>
              <p className="text-sm text-forvis-gray-900">{aiSuggestions.title}</p>
            </div>

            {/* Description Suggestion */}
            <div className="bg-white rounded-lg p-3 border border-forvis-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-forvis-gray-600">Description</span>
                <button
                  type="button"
                  onClick={() => handleAcceptSuggestion('description')}
                  className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                >
                  Use This
                </button>
              </div>
              <p className="text-sm text-forvis-gray-900 whitespace-pre-line">{aiSuggestions.description}</p>
            </div>

            {/* Document Type Suggestion */}
            <div className="bg-white rounded-lg p-3 border border-forvis-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-forvis-gray-600">Document Type</span>
                <button
                  type="button"
                  onClick={() => handleAcceptSuggestion('documentType')}
                  className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                >
                  Use This
                </button>
              </div>
              <p className="text-sm text-forvis-gray-900">{aiSuggestions.documentType}</p>
            </div>

            {/* Category Suggestion */}
            {aiSuggestions.suggestedCategory && (
              <div className="bg-white rounded-lg p-3 border border-forvis-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-forvis-gray-600">Suggested Category</span>
                  <button
                    type="button"
                    onClick={() => handleAcceptCategoryFromSuggestion(aiSuggestions.suggestedCategory!)}
                    className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                  >
                    Use This
                  </button>
                </div>
                <p className="text-sm text-forvis-gray-900">{aiSuggestions.suggestedCategory}</p>
              </div>
            )}

            {/* Scope and Service Line */}
            <div className="bg-white rounded-lg p-3 border border-forvis-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-forvis-gray-600">Scope</span>
                <button
                  type="button"
                  onClick={() => {
                    handleAcceptSuggestion('scope');
                    if (aiSuggestions.serviceLine) {
                      handleAcceptSuggestion('serviceLine');
                    }
                  }}
                  className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                >
                  Use This
                </button>
              </div>
              <p className="text-sm text-forvis-gray-900">
                {aiSuggestions.scope}
                {aiSuggestions.serviceLine && ` - ${aiSuggestions.serviceLine}`}
              </p>
            </div>

            {/* Document Version Suggestion */}
            {aiSuggestions.documentVersion && (
              <div className="bg-white rounded-lg p-3 border border-forvis-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-forvis-gray-600">Document Version</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, documentVersion: aiSuggestions.documentVersion || '' }))}
                    className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                  >
                    Use This
                  </button>
                </div>
                <p className="text-sm text-forvis-gray-900">{aiSuggestions.documentVersion}</p>
              </div>
            )}

            {/* Tags Suggestion */}
            {aiSuggestions.tags.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-forvis-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-forvis-gray-600">Tags</span>
                  <button
                    type="button"
                    onClick={() => handleAcceptSuggestion('tags')}
                    className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                  >
                    Use All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-full text-xs bg-forvis-blue-100 text-forvis-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            {(aiSuggestions.effectiveDate || aiSuggestions.expiryDate) && (
              <div className="bg-white rounded-lg p-3 border border-forvis-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-forvis-gray-600">Dates</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (aiSuggestions.effectiveDate) handleAcceptSuggestion('effectiveDate');
                      if (aiSuggestions.expiryDate) handleAcceptSuggestion('expiryDate');
                    }}
                    className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                  >
                    Use Both
                  </button>
                </div>
                <div className="space-y-1 text-sm text-forvis-gray-900">
                  {aiSuggestions.effectiveDate && (
                    <p>Effective: {aiSuggestions.effectiveDate}</p>
                  )}
                  {aiSuggestions.expiryDate && (
                    <p>Expiry: {aiSuggestions.expiryDate}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-forvis-blue-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRejectSuggestions}
            >
              Reject All
            </Button>
            <Button
              type="button"
              variant="gradient"
              size="sm"
              onClick={handleAcceptAllSuggestions}
            >
              Accept All Suggestions
            </Button>
          </div>
        </div>
      )}

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
          disabled={isLoadingTypes}
        >
          {isLoadingTypes ? (
            <option value="">Loading document types...</option>
          ) : (
            documentTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))
          )}
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

      {/* Document Version */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          Document Version
        </label>
        <input
          type="text"
          value={formData.documentVersion}
          onChange={(e) => setFormData(prev => ({ ...prev, documentVersion: e.target.value }))}
          placeholder="e.g., 1.0, Rev 3, Draft 2"
          className="w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          maxLength={50}
        />
        <p className="mt-1 text-xs text-forvis-gray-500">
          Internal version number from the document (optional)
        </p>
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
          {filteredCategories.map((cat) => {
            const hasApprovers = (cat.approverCount ?? 0) > 0;
            const isActive = cat.active !== false;
            const isDisabled = !hasApprovers || !isActive;
            
            return (
              <option 
                key={cat.id} 
                value={cat.id}
                disabled={isDisabled}
              >
                {cat.name}
                {!isActive && ' (Inactive)'}
                {isActive && !hasApprovers && ' (No approvers - cannot upload)'}
                {isActive && hasApprovers && ` (${cat.approverCount} approver${cat.approverCount !== 1 ? 's' : ''})`}
              </option>
            );
          })}
        </select>
        
        {/* Warning for category without approvers */}
        {formData.categoryId > 0 && selectedCategory && (selectedCategory.approverCount ?? 0) === 0 && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Cannot upload to this category.</strong> No approvers have been assigned yet. 
              Please contact an administrator to add approvers before uploading documents.
            </div>
          </div>
        )}
        
        {/* Info for category with approvers */}
        {formData.categoryId > 0 && selectedCategory && (selectedCategory.approverCount ?? 0) > 0 && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Approval Required:</strong> This document will be reviewed by {selectedCategory.approverCount} approver{selectedCategory.approverCount !== 1 ? 's' : ''} in sequence before being published.
            </p>
          </div>
        )}
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
        <Button 
          type="submit" 
          variant="primary" 
          disabled={isSubmitting || (mode === 'create' && !file)}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              {mode === 'edit' ? 'Updating...' : 'Uploading...'}
            </>
          ) : (
            mode === 'edit' ? 'Update Document' : 'Upload Document'
          )}
        </Button>
      </div>
    </form>
  );
}
