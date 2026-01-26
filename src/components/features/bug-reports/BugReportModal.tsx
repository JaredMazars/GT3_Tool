/**
 * Bug Report Modal Component
 * Modal for submitting bug reports with screenshot upload
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Bug, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useSubmitBugReport } from '@/hooks/bug-reports/useBugReports';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
}

export function BugReportModal({ isOpen, onClose, initialUrl = '' }: BugReportModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitMutation = useSubmitBugReport();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || window.location.href);
      setDescription('');
      setScreenshot(null);
      setScreenshotPreview(null);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialUrl]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Auto-close after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [success, onClose]);

  // Handle paste events for screenshot
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Find image in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            // Convert blob to File with proper name
            const timestamp = Date.now();
            const extension = blob.type.split('/')[1] || 'png';
            const file = new File([blob], `pasted-screenshot-${timestamp}.${extension}`, {
              type: blob.type,
            });
            processScreenshot(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Validate image file (extracted for reuse)
  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: 'Screenshot file size must be less than 5MB' };
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Screenshot must be an image file (PNG, JPG, GIF, or WEBP)' };
    }

    return { valid: true };
  };

  // Generate image preview (extracted for reuse)
  const generateImagePreview = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Process and set screenshot file
  const processScreenshot = (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setScreenshot(file);
    setError(null);
    generateImagePreview(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processScreenshot(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate fields
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (description.length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('url', url.trim());
    formData.append('description', description.trim());
    if (screenshot) {
      formData.append('screenshot', screenshot);
    }

    try {
      await submitMutation.mutateAsync(formData);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bug report');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full mx-4 z-50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between sticky top-0 bg-white z-10"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-white" />
            <h3 className="text-lg font-semibold text-white">Report a Bug</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-forvis-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Success Message */}
        {success ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-forvis-gray-900 mb-2">
              Bug Report Submitted
            </h4>
            <p className="text-sm text-forvis-gray-700">
              Thank you for reporting this issue. Our administrators have been notified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* URL Field */}
              <Input
                label="Page URL"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
                helperText="The URL of the page where you encountered the bug"
              />

              {/* Description Field */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-forvis-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                  placeholder="Please describe what happened, what you expected to happen, and any steps to reproduce the issue..."
                  required
                  minLength={10}
                />
                <p className="mt-1 text-xs text-forvis-gray-600">
                  Minimum 10 characters. {description.length}/5000
                </p>
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Screenshot (optional)
                </label>
                
                {!screenshot ? (
                  <div
                    className="flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-forvis-blue-500 transition-colors"
                    style={{ 
                      borderColor: '#2E5AAC', 
                      borderWidth: '2px',
                      background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 text-forvis-blue-600 mb-3" />
                    <p className="text-sm font-medium text-forvis-gray-900 mb-1">
                      Click to upload or paste from clipboard
                    </p>
                    <p className="text-xs text-forvis-gray-600">
                      PNG, JPG, GIF, or WEBP (max 5MB)
                    </p>
                    <p className="text-xs text-forvis-blue-600 mt-2">
                      Tip: Press Cmd+V (Mac) or Ctrl+V (Windows) to paste
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-forvis-blue-500 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-forvis-gray-900">{screenshot.name}</p>
                        <p className="text-xs text-forvis-gray-600">
                          {(screenshot.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="text-forvis-gray-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {screenshotPreview && (
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="w-full h-auto rounded-lg mt-2"
                        style={{ maxHeight: '300px', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
