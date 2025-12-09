'use client';

import { useState, useRef } from 'react';
import { SparklesIcon, DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { NewsBulletin, BulletinCategory, ServiceLine } from '@/types';
import type { CreateNewsBulletinInput } from '@/lib/validation/schemas';

interface BulletinFormProps {
  initialData?: NewsBulletin;
  onSubmit: (data: CreateNewsBulletinInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const categoryOptions: { value: BulletinCategory; label: string }[] = [
  { value: BulletinCategory.ANNOUNCEMENT, label: 'Announcement' },
  { value: BulletinCategory.POLICY_UPDATE, label: 'Policy Update' },
  { value: BulletinCategory.EVENT, label: 'Event' },
  { value: BulletinCategory.ACHIEVEMENT, label: 'Achievement' },
  { value: BulletinCategory.REMINDER, label: 'Reminder' },
  { value: BulletinCategory.CLIENT_WIN, label: 'Client Win' },
  { value: BulletinCategory.MARKET_UPDATE, label: 'Market Update' },
  { value: BulletinCategory.INDUSTRY_NEWS, label: 'Industry News' },
  { value: BulletinCategory.PARTNERSHIP, label: 'Partnership' },
  { value: BulletinCategory.HIRING, label: 'Hiring' },
];

const serviceLineOptions: { value: string; label: string }[] = [
  { value: '', label: 'All Service Lines' },
  { value: ServiceLine.TAX, label: 'Tax' },
  { value: ServiceLine.AUDIT, label: 'Audit' },
  { value: ServiceLine.ACCOUNTING, label: 'Accounting' },
  { value: ServiceLine.ADVISORY, label: 'Advisory' },
  { value: ServiceLine.QRM, label: 'Quality & Risk Management' },
  { value: ServiceLine.BUSINESS_DEV, label: 'Business Development' },
  { value: ServiceLine.IT, label: 'Information Technology' },
  { value: ServiceLine.FINANCE, label: 'Finance' },
  { value: ServiceLine.HR, label: 'Human Resources' },
];

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

interface AISuggestions {
  title: string;
  summary: string;
  body: string;
  category: BulletinCategory;
}

export function BulletinForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: BulletinFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    summary: initialData?.summary || '',
    body: initialData?.body || '',
    category: initialData?.category || BulletinCategory.ANNOUNCEMENT,
    serviceLine: initialData?.serviceLine || '',
    effectiveDate: formatDateForInput(initialData?.effectiveDate) || formatDateForInput(new Date()),
    expiresAt: formatDateForInput(initialData?.expiresAt) || '',
    contactPerson: initialData?.contactPerson || '',
    actionRequired: initialData?.actionRequired || false,
    callToActionUrl: initialData?.callToActionUrl || '',
    callToActionText: initialData?.callToActionText || '',
    isPinned: initialData?.isPinned || false,
    showDocumentLink: initialData?.showDocumentLink || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  
  // Document upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedDocMetadata, setUploadedDocMetadata] = useState<{
    fileName: string;
    filePath: string;
    fileSize: number;
  } | null>(initialData?.documentFileName ? {
    fileName: initialData.documentFileName,
    filePath: initialData.documentFilePath || '',
    fileSize: initialData.documentFileSize || 0,
  } : null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // AI suggestions state
  const [aiSuggestions, setAISuggestions] = useState<AISuggestions | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setUploadError(null);
  };

  const handleExtractFromDocument = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', uploadedFile);

      const response = await fetch('/api/news/upload-document', {
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
        
        // Store document metadata from backend (already uploaded to blob storage)
        if (data.data?.documentMetadata) {
          setUploadedDocMetadata({
            fileName: data.data.documentMetadata.fileName,
            filePath: data.data.documentMetadata.filePath,
            fileSize: data.data.documentMetadata.fileSize,
          });
        }
      }
    } catch (error) {
      console.error('Failed to extract from document:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to extract content');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAcceptSuggestion = (field: keyof AISuggestions) => {
    if (!aiSuggestions) return;
    setFormData(prev => ({ ...prev, [field]: aiSuggestions[field] }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAcceptAllSuggestions = () => {
    if (!aiSuggestions) return;
    setFormData(prev => ({
      ...prev,
      title: aiSuggestions.title,
      summary: aiSuggestions.summary,
      body: aiSuggestions.body,
      category: aiSuggestions.category,
    }));
    setErrors({});
    setShowSuggestions(false);
  };

  const handleRejectSuggestions = () => {
    setShowSuggestions(false);
    setAISuggestions(null);
  };

  const handleRemoveDocument = () => {
    setUploadedFile(null);
    setUploadedDocMetadata(null);
    setAISuggestions(null);
    setShowSuggestions(false);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateBody = async () => {
    // Validate title and summary are provided
    if (!formData.title.trim()) {
      setErrors(prev => ({ ...prev, title: 'Title is required to generate content' }));
      return;
    }
    if (!formData.summary.trim()) {
      setErrors(prev => ({ ...prev, summary: 'Summary is required to generate content' }));
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/news/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          summary: formData.summary.trim(),
          category: formData.category,
          tone: 'formal',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const data = await response.json();
      
      if (data.data?.body) {
        setFormData(prev => ({ ...prev, body: data.data.body }));
        // Clear body error if it exists
        if (errors.body) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.body;
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error('Failed to generate body:', error);
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be 255 characters or less';
    }

    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required';
    } else if (formData.summary.length > 500) {
      newErrors.summary = 'Summary must be 500 characters or less';
    }

    if (!formData.body.trim()) {
      newErrors.body = 'Body content is required';
    }

    if (!formData.effectiveDate) {
      newErrors.effectiveDate = 'Effective date is required';
    }

    if (formData.callToActionUrl && !formData.callToActionUrl.startsWith('http')) {
      newErrors.callToActionUrl = 'URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const submitData: CreateNewsBulletinInput = {
      title: formData.title.trim(),
      summary: formData.summary.trim(),
      body: formData.body.trim(),
      category: formData.category,
      serviceLine: formData.serviceLine || null,
      effectiveDate: new Date(formData.effectiveDate),
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
      contactPerson: formData.contactPerson.trim() || null,
      actionRequired: formData.actionRequired,
      callToActionUrl: formData.callToActionUrl.trim() || null,
      callToActionText: formData.callToActionText.trim() || null,
      isPinned: formData.isPinned,
      documentFileName: uploadedDocMetadata?.fileName || null,
      documentFilePath: uploadedDocMetadata?.filePath || null,
      documentFileSize: uploadedDocMetadata?.fileSize || null,
      documentUploadedAt: uploadedDocMetadata ? new Date() : null,
      showDocumentLink: formData.showDocumentLink,
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Document Upload Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DocumentArrowUpIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-medium text-forvis-gray-900">Upload Document for AI Extraction</h3>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-forvis-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            <p className="mt-1 text-xs text-forvis-gray-500">Upload a PDF document to automatically extract content (max 10MB)</p>
          </div>

          {uploadedFile && (
            <div className="flex items-center justify-between bg-white rounded-lg border border-purple-200 p-3">
              <div className="flex items-center gap-2">
                <DocumentArrowUpIcon className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-forvis-gray-900">{uploadedFile.name}</p>
                  <p className="text-xs text-forvis-gray-500">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExtractFromDocument}
                  disabled={isUploading || isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Extracting...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-3.5 w-3.5" />
                      Extract Content
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveDocument}
                  className="p-1.5 text-forvis-gray-400 hover:text-forvis-gray-600 rounded-lg hover:bg-forvis-gray-100"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-red-500">{uploadError}</p>
          )}

          {isUploading && (
            <p className="text-xs text-purple-600">AI is extracting content from your document...</p>
          )}
        </div>
      </div>

      {/* AI Suggestions Modal */}
      {showSuggestions && aiSuggestions && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-forvis-gray-900">AI-Generated Suggestions</h3>
            </div>
            <button
              type="button"
              onClick={handleRejectSuggestions}
              className="p-1 text-forvis-gray-400 hover:text-forvis-gray-600 rounded-lg hover:bg-white/50"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Title Suggestion */}
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-forvis-gray-600">Title</span>
                <button
                  type="button"
                  onClick={() => handleAcceptSuggestion('title')}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Use This
                </button>
              </div>
              <p className="text-sm text-forvis-gray-900">{aiSuggestions.title}</p>
            </div>

            {/* Summary Suggestion */}
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-forvis-gray-600">Summary</span>
                <button
                  type="button"
                  onClick={() => handleAcceptSuggestion('summary')}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Use This
                </button>
              </div>
              <p className="text-sm text-forvis-gray-900">{aiSuggestions.summary}</p>
            </div>

            {/* Body Suggestion */}
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-forvis-gray-600">Body Content</span>
                <button
                  type="button"
                  onClick={() => handleAcceptSuggestion('body')}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Use This
                </button>
              </div>
              <p className="text-sm text-forvis-gray-900 whitespace-pre-line">{aiSuggestions.body}</p>
            </div>

            {/* Category Suggestion */}
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-forvis-gray-600">Category</span>
                <button
                  type="button"
                  onClick={() => handleAcceptSuggestion('category')}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Use This
                </button>
              </div>
              <p className="text-sm text-forvis-gray-900">{aiSuggestions.category.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-purple-200">
            <button
              type="button"
              onClick={handleRejectSuggestions}
              className="px-3 py-1.5 text-xs font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleAcceptAllSuggestions}
              className="px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-md hover:shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
            >
              Accept All Suggestions
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          maxLength={255}
          className={`w-full rounded-lg border ${errors.title ? 'border-red-500' : 'border-forvis-gray-300'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500`}
          placeholder="Enter bulletin title"
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        <p className="mt-1 text-xs text-forvis-gray-500">{formData.title.length}/255 characters</p>
      </div>

      {/* Summary */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Summary <span className="text-red-500">*</span>
        </label>
        <textarea
          id="summary"
          name="summary"
          value={formData.summary}
          onChange={handleChange}
          maxLength={500}
          rows={2}
          className={`w-full rounded-lg border ${errors.summary ? 'border-red-500' : 'border-forvis-gray-300'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500`}
          placeholder="Brief summary of the bulletin"
        />
        {errors.summary && <p className="mt-1 text-xs text-red-500">{errors.summary}</p>}
        <p className="mt-1 text-xs text-forvis-gray-500">{formData.summary.length}/500 characters</p>
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="body" className="block text-sm font-medium text-forvis-gray-700">
            Body Content <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleGenerateBody}
            disabled={isGenerating || isLoading || !formData.title.trim() || !formData.summary.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
            title={!formData.title.trim() || !formData.summary.trim() ? 'Enter title and summary first' : 'Generate body content with AI'}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-3.5 w-3.5" />
                Generate with AI
              </>
            )}
          </button>
        </div>
        <textarea
          id="body"
          name="body"
          value={formData.body}
          onChange={handleChange}
          rows={6}
          disabled={isGenerating}
          className={`w-full rounded-lg border ${errors.body ? 'border-red-500' : 'border-forvis-gray-300'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 disabled:bg-forvis-gray-50 disabled:cursor-not-allowed`}
          placeholder="Full content of the bulletin (or click 'Generate with AI' to auto-generate based on title and summary)"
        />
        {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
        {generateError && <p className="mt-1 text-xs text-red-500">{generateError}</p>}
        {isGenerating && (
          <p className="mt-1 text-xs text-purple-600">AI is generating content based on your title and summary...</p>
        )}
      </div>

      {/* Category and Service Line Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Service Line */}
        <div>
          <label htmlFor="serviceLine" className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Service Line
          </label>
          <select
            id="serviceLine"
            name="serviceLine"
            value={formData.serviceLine}
            onChange={handleChange}
            className="w-full rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          >
            {serviceLineOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Effective Date */}
        <div>
          <label htmlFor="effectiveDate" className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Effective Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="effectiveDate"
            name="effectiveDate"
            value={formData.effectiveDate}
            onChange={handleChange}
            className={`w-full rounded-lg border ${errors.effectiveDate ? 'border-red-500' : 'border-forvis-gray-300'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500`}
          />
          {errors.effectiveDate && <p className="mt-1 text-xs text-red-500">{errors.effectiveDate}</p>}
        </div>

        {/* Expires At */}
        <div>
          <label htmlFor="expiresAt" className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Expires At <span className="text-forvis-gray-400">(optional)</span>
          </label>
          <input
            type="date"
            id="expiresAt"
            name="expiresAt"
            value={formData.expiresAt}
            onChange={handleChange}
            className="w-full rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          />
        </div>
      </div>

      {/* Contact Person */}
      <div>
        <label htmlFor="contactPerson" className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Contact Person <span className="text-forvis-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          id="contactPerson"
          name="contactPerson"
          value={formData.contactPerson}
          onChange={handleChange}
          maxLength={255}
          className="w-full rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          placeholder="Name of contact person for queries"
        />
      </div>

      {/* Call to Action Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CTA URL */}
        <div>
          <label htmlFor="callToActionUrl" className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Call-to-Action URL <span className="text-forvis-gray-400">(optional)</span>
          </label>
          <input
            type="url"
            id="callToActionUrl"
            name="callToActionUrl"
            value={formData.callToActionUrl}
            onChange={handleChange}
            maxLength={500}
            className={`w-full rounded-lg border ${errors.callToActionUrl ? 'border-red-500' : 'border-forvis-gray-300'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500`}
            placeholder="https://example.com/link"
          />
          {errors.callToActionUrl && <p className="mt-1 text-xs text-red-500">{errors.callToActionUrl}</p>}
        </div>

        {/* CTA Text */}
        <div>
          <label htmlFor="callToActionText" className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Call-to-Action Text <span className="text-forvis-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            id="callToActionText"
            name="callToActionText"
            value={formData.callToActionText}
            onChange={handleChange}
            maxLength={100}
            className="w-full rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
            placeholder="e.g., Learn More, Register Now"
          />
        </div>
      </div>

      {/* Toggles Row */}
      <div className="flex flex-wrap gap-6">
        {/* Action Required */}
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="actionRequired"
            checked={formData.actionRequired}
            onChange={handleChange}
            className="w-4 h-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
          />
          <span className="ml-2 text-sm text-forvis-gray-700">Action Required</span>
        </label>

        {/* Pin to Top */}
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="isPinned"
            checked={formData.isPinned}
            onChange={handleChange}
            className="w-4 h-4 text-amber-600 border-forvis-gray-300 rounded focus:ring-amber-500"
          />
          <span className="ml-2 text-sm text-forvis-gray-700">Pin to Top</span>
        </label>

        {/* Show Document Link */}
        {(uploadedFile || uploadedDocMetadata) && (
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="showDocumentLink"
              checked={formData.showDocumentLink}
              onChange={handleChange}
              className="w-4 h-4 text-purple-600 border-forvis-gray-300 rounded focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-forvis-gray-700">Show document as downloadable link</span>
          </label>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-forvis-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-corporate hover:shadow-corporate-md transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          {isLoading ? 'Saving...' : initialData ? 'Update Bulletin' : 'Create Bulletin'}
        </button>
      </div>
    </form>
  );
}
