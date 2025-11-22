'use client';

import { useState, useRef } from 'react';
import { 
  DocumentTextIcon, 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Project } from '@/types';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '@/hooks/projects/useProjectData';
import { useCanApproveAcceptance } from '@/hooks/auth/usePermissions';

interface EngagementLetterTabProps {
  project: Project;
  currentUserRole: string;
  onUploadComplete: () => void;
}

export function EngagementLetterTab({ project, currentUserRole, onUploadComplete }: EngagementLetterTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [letterContent, setLetterContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Check if user can manage engagement letters (Partners and Superusers only)
  const { data: canManage = false, isLoading: isCheckingPermission } = useCanApproveAcceptance(project);
  const isGenerated = project.engagementLetterGenerated || letterContent !== null;
  const isUploaded = project.engagementLetterUploaded;
  const acceptanceApproved = project.acceptanceApproved;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/engagement-letter/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate engagement letter');
      }

      setLetterContent(data.data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate engagement letter');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF and DOCX files are allowed');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/projects/${project.id}/engagement-letter`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload engagement letter');
      }

      // Invalidate and refetch the project data
      await queryClient.invalidateQueries({ 
        queryKey: projectKeys.detail(project.id.toString()) 
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload engagement letter');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (!letterContent) return;

    const blob = new Blob([letterContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engagement-letter-${project.name.replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!acceptanceApproved) {
    return (
      <div className="p-6 bg-forvis-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 rounded-lg border-2 border-yellow-200 shadow-corporate p-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mt-1 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Client Acceptance Required
                </h3>
                <p className="text-sm text-yellow-800">
                  You must complete and approve the client acceptance and continuance before generating or uploading an engagement letter.
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  Please navigate to the <strong>Acceptance</strong> tab to complete this step.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-forvis-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-forvis-gray-900 mb-2">
                Engagement Letter
              </h2>
              <p className="text-sm text-forvis-gray-600">
                Generate an engagement letter from template, then upload the signed version.
              </p>
            </div>
            
            {isUploaded ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Complete</span>
              </div>
            ) : isGenerated ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Generated</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isGenerated ? 'bg-green-100 text-green-600' : 'bg-forvis-gray-100 text-forvis-gray-600'}`}>
                  {isGenerated ? <CheckCircleIcon className="h-5 w-5" /> : <span>1</span>}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-forvis-gray-900">Generate Letter</p>
                  <p className="text-xs text-forvis-gray-600">Create from template</p>
                </div>
              </div>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${isGenerated ? 'bg-green-200' : 'bg-forvis-gray-200'}`}></div>
            <div className="flex-1">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isUploaded ? 'bg-green-100 text-green-600' : 'bg-forvis-gray-100 text-forvis-gray-600'}`}>
                  {isUploaded ? <CheckCircleIcon className="h-5 w-5" /> : <span>2</span>}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-forvis-gray-900">Upload Signed</p>
                  <p className="text-xs text-forvis-gray-600">Upload final version</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Generate Section */}
        {!isUploaded && (
          <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
            <div className="px-6 py-4 border-b border-forvis-gray-200 bg-forvis-gray-50">
              <h3 className="text-lg font-semibold text-forvis-gray-900">Step 1: Generate Engagement Letter</h3>
            </div>
            <div className="px-6 py-4">
              {!letterContent ? (
                <div>
                  <p className="text-sm text-forvis-gray-700 mb-4">
                    Generate an engagement letter using the standard template. The letter will be pre-filled with client and project information.
                  </p>
                  {canManage ? (
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-md disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      {isGenerating ? 'Generating...' : 'Generate Letter'}
                    </button>
                  ) : (
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Only Partners and System Administrators can generate engagement letters.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-green-700">
                      Letter generated successfully
                    </p>
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Download
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto border-2 border-forvis-gray-200 rounded-lg p-4 bg-forvis-gray-50">
                    <MarkdownRenderer content={letterContent} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Section */}
        {isGenerated && !isUploaded && (
          <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
            <div className="px-6 py-4 border-b border-forvis-gray-200 bg-forvis-gray-50">
              <h3 className="text-lg font-semibold text-forvis-gray-900">Step 2: Upload Signed Letter</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-forvis-gray-700 mb-4">
                After the client has signed the engagement letter, upload the final version here (PDF or DOCX format).
              </p>
              
              {canManage ? (
                <div className="space-y-4">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-forvis-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-forvis-gray-300 file:text-sm file:font-medium file:bg-white file:text-forvis-gray-700 hover:file:bg-forvis-gray-50"
                    />
                    <p className="mt-2 text-xs text-forvis-gray-600">
                      Accepted formats: PDF, DOCX (Max size: 10MB)
                    </p>
                  </div>
                  
                  {selectedFile && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Signed Letter'}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Only Partners and System Administrators can upload engagement letters.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Complete */}
        {isUploaded && (
          <div className="bg-green-50 rounded-lg border-2 border-green-200 shadow-corporate overflow-hidden">
            <div className="px-6 py-4">
              <div className="flex items-start">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mt-1 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Engagement Letter Complete
                  </h3>
                  <dl className="space-y-2">
                    {project.engagementLetterUploadedAt && (
                      <div>
                        <dt className="text-sm font-medium text-green-800 inline">Uploaded on: </dt>
                        <dd className="text-sm text-green-700 inline">
                          {new Date(project.engagementLetterUploadedAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </dd>
                      </div>
                    )}
                    {project.engagementLetterPath && (
                      <div>
                        <dt className="text-sm font-medium text-green-800 inline">File: </dt>
                        <dd className="text-sm text-green-700 inline">
                          {project.engagementLetterPath.split('/').pop()}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <p className="text-sm text-green-700 mt-3">
                    You can now access all project work tabs and begin the engagement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


