'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Upload,
  CheckCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Task } from '@/types';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/hooks/tasks/useTaskData';
import { taskListKeys } from '@/hooks/tasks/useTasks';
import { kanbanKeys } from '@/hooks/tasks/useKanbanBoard';
import { clientKeys } from '@/hooks/clients/useClients';
import { useCanApproveAcceptance } from '@/hooks/auth/usePermissions';
import { TemplateSelector } from '@/components/features/templates/TemplateSelector';

interface EngagementLetterTabProps {
  task: Task;
  currentUserRole: string;
  onUploadComplete: () => void;
}

interface SectionUsed {
  id: number;
  name: string;
  wasAiAdapted?: boolean;
}

type TabType = 'upload' | 'generate';

export function EngagementLetterTab({ task, currentUserRole, onUploadComplete }: EngagementLetterTabProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingDpa, setIsUploadingDpa] = useState(false);
  const [letterContent, setLetterContent] = useState<string | null>(null);
  const [sectionsUsed, setSectionsUsed] = useState<SectionUsed[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dpaError, setDpaError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDpaFile, setSelectedDpaFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [useAiAdaptation, setUseAiAdaptation] = useState(true);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [showDpaReplaceConfirm, setShowDpaReplaceConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dpaFileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Load saved engagement letter content on mount
  useEffect(() => {
    if (task.engagementLetterGenerated && task.engagementLetterContent) {
      setLetterContent(task.engagementLetterContent);
      if (task.engagementLetterTemplateId) {
        setSelectedTemplateId(task.engagementLetterTemplateId);
      }
    }
    // Set default tab based on current state
    if (task.engagementLetterGenerated && !task.engagementLetterUploaded) {
      setActiveTab('generate');
    }
  }, [task]);

  // Check if user can manage engagement letters (Partners and System Admins only)
  const { data: canManage = false, isLoading: isCheckingPermission } = useCanApproveAcceptance(task);
  const isGenerated = task.engagementLetterGenerated || letterContent !== null;
  const isUploaded = task.engagementLetterUploaded;
  const isDpaUploaded = task.dpaUploaded;
  const isFullyComplete = isUploaded && isDpaUploaded; // Both EL and DPA uploaded
  const acceptanceApproved = task.acceptanceApproved;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}/engagement-letter/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          useAiAdaptation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate engagement letter');
      }

      setLetterContent(data.data.content);
      setSectionsUsed(data.data.sectionsUsed || []);
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

    // If already uploaded, show confirmation modal
    if (isUploaded && !showReplaceConfirm) {
      setShowReplaceConfirm(true);
      return;
    }

    setIsUploading(true);
    setError(null);
    setShowReplaceConfirm(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/tasks/${task.id}/engagement-letter`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload engagement letter');
      }

      // Invalidate and refetch the task data
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.detail(task.id.toString()),
          refetchType: 'active' // Force immediate refetch of active queries
        }),
        // Invalidate task list queries (workspace list view)
        queryClient.invalidateQueries({ 
          queryKey: taskListKeys.lists() 
        }),
        // Invalidate kanban board queries (kanban view) - FORCE REFETCH
        queryClient.invalidateQueries({ 
          queryKey: kanbanKeys.boards(),
          refetchType: 'active' // Force immediate refetch for consistency
        }),
        // Invalidate client cache if this is a client task
        ...(task.GSClientID ? [
          queryClient.invalidateQueries({ 
            queryKey: clientKeys.all 
          })
        ] : []),
      ]);

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

  const handleDpaFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setDpaError('Only PDF and DOCX files are allowed');
        return;
      }
      setSelectedDpaFile(file);
      setDpaError(null);
    }
  };

  const handleDpaUpload = async () => {
    if (!selectedDpaFile) {
      setDpaError('Please select a file to upload');
      return;
    }

    // If already uploaded, show confirmation modal
    if (isDpaUploaded && !showDpaReplaceConfirm) {
      setShowDpaReplaceConfirm(true);
      return;
    }

    setIsUploadingDpa(true);
    setDpaError(null);
    setShowDpaReplaceConfirm(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedDpaFile);

      const response = await fetch(`/api/tasks/${task.id}/dpa`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload DPA');
      }

      // Invalidate and refetch the task data
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.detail(task.id.toString()),
          refetchType: 'active' // Force immediate refetch of active queries
        }),
        // Invalidate task list queries (workspace list view)
        queryClient.invalidateQueries({ 
          queryKey: taskListKeys.lists() 
        }),
        // Invalidate kanban board queries (kanban view) - FORCE REFETCH
        queryClient.invalidateQueries({ 
          queryKey: kanbanKeys.boards(),
          refetchType: 'active' // Force immediate refetch to update DPA icon
        }),
        // Invalidate client cache if this is a client task
        ...(task.GSClientID ? [
          queryClient.invalidateQueries({ 
            queryKey: clientKeys.all 
          })
        ] : []),
      ]);

      setSelectedDpaFile(null);
      if (dpaFileInputRef.current) {
        dpaFileInputRef.current.value = '';
      }
      onUploadComplete();
    } catch (err) {
      setDpaError(err instanceof Error ? err.message : 'Failed to upload DPA');
    } finally {
      setIsUploadingDpa(false);
    }
  };

  const handleDownload = () => {
    if (!letterContent) return;

    const blob = new Blob([letterContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engagement-letter-${(task.name || 'task').replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadUploaded = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/engagement-letter/download`);
      if (!response.ok) {
        throw new Error('Failed to download engagement letter');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      // Use safe regex with length limit to prevent ReDoS
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.substring(0, 500).match(/filename="([^"]{1,255})"/);
      const filename = filenameMatch?.[1] || 'engagement-letter.pdf';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download engagement letter');
    }
  };

  if (!acceptanceApproved) {
    return (
      <div className="p-6 bg-forvis-gray-50 min-h-screen">
        <div>
          <div className="bg-yellow-50 rounded-lg border-2 border-yellow-200 shadow-corporate p-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1 mr-3" />
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
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-forvis-gray-900 mb-2">
                Engagement Documentation
              </h2>
              <p className="text-sm text-forvis-gray-600">
                Upload engagement letter and Data Processing Agreement (DPA) for POPIA compliance.
              </p>
            </div>
            
            {isFullyComplete && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Complete</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
          <div className="flex border-b border-forvis-gray-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'text-white border-b-2 border-transparent'
                  : 'text-forvis-gray-600 hover:text-forvis-gray-900 hover:bg-forvis-gray-50'
              }`}
              style={
                activeTab === 'upload'
                  ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }
                  : {}
              }
            >
              <div className="flex items-center justify-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload Letter</span>
                {isUploaded && (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
                activeTab === 'generate'
                  ? 'text-white border-b-2 border-transparent'
                  : 'text-forvis-gray-600 hover:text-forvis-gray-900 hover:bg-forvis-gray-50'
              }`}
              style={
                activeTab === 'generate'
                  ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }
                  : {}
              }
            >
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Generate from Template</span>
                {isGenerated && (
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                )}
              </div>
            </button>
          </div>

        {error && (
          <div className="m-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

          {/* Tab Content */}
          <div className="p-6">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                {!isUploaded ? (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                        Upload Engagement Letter
                      </h3>
                      <p className="text-sm text-forvis-gray-700">
                        Upload an existing engagement letter that has been prepared and signed by the client (PDF or DOCX format).
                      </p>
                    </div>

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
                          <Upload className="h-5 w-5 mr-2" />
                          {isUploading ? 'Uploading...' : 'Upload Letter'}
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Only Partners and System Administrators can upload engagement letters.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-green-50 rounded-lg border-2 border-green-200 p-6">
                    <div className="flex items-start">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-green-900 mb-2">
                          Engagement Letter Uploaded
                        </h3>
                        <dl className="space-y-2">
                          {task.engagementLetterUploadedAt && (
                            <div>
                              <dt className="text-sm font-medium text-green-800 inline">Uploaded on: </dt>
                              <dd className="text-sm text-green-700 inline">
                                {new Date(task.engagementLetterUploadedAt).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </dd>
                            </div>
                          )}
                          {task.engagementLetterPath && (
                            <div className="flex items-center gap-3">
                              <dt className="text-sm font-medium text-green-800">File: </dt>
                              <dd className="text-sm text-green-700">
                                {task.engagementLetterPath.split('/').pop()}
                              </dd>
                              <button
                                onClick={handleDownloadUploaded}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </button>
                            </div>
                          )}
                        </dl>
                        <p className="text-sm text-green-700 mt-3">
                          Engagement letter uploaded. Next, upload the Data Processing Agreement below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* DPA Upload Section */}
                <div className="border-t-2 border-forvis-gray-200 pt-6 mt-6">
                  {!isDpaUploaded ? (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                          Upload Data Processing Agreement (DPA)
                        </h3>
                        <p className="text-sm text-forvis-gray-700">
                          Upload the signed Data Processing Agreement (DPA) for POPIA compliance (PDF or DOCX format).
                        </p>
                        {!isUploaded && (
                          <p className="text-sm text-yellow-700 mt-2">
                            ⚠️ Please upload the Engagement Letter first before uploading the DPA.
                          </p>
                        )}
                      </div>

                      {dpaError && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                          <p className="text-sm text-red-700">{dpaError}</p>
                        </div>
                      )}

                      {canManage && isUploaded ? (
                        <div className="space-y-4">
                          <div>
                            <input
                              ref={dpaFileInputRef}
                              type="file"
                              accept=".pdf,.docx"
                              onChange={handleDpaFileSelect}
                              className="block w-full text-sm text-forvis-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-forvis-gray-300 file:text-sm file:font-medium file:bg-white file:text-forvis-gray-700 hover:file:bg-forvis-gray-50"
                            />
                            <p className="mt-2 text-xs text-forvis-gray-600">
                              Accepted formats: PDF, DOCX (Max size: 10MB)
                            </p>
                          </div>
                          
                          {selectedDpaFile && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800">
                                Selected: <strong>{selectedDpaFile.name}</strong> ({(selectedDpaFile.size / 1024).toFixed(2)} KB)
                              </p>
                            </div>
                          )}
                          
                          <button
                            onClick={handleDpaUpload}
                            disabled={!selectedDpaFile || isUploadingDpa}
                            className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-md disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                          >
                            <Upload className="h-5 w-5 mr-2" />
                            {isUploadingDpa ? 'Uploading...' : 'Upload DPA'}
                          </button>
                        </div>
                      ) : !canManage ? (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Only Partners and System Administrators can upload Data Processing Agreements.
                          </p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="bg-green-50 rounded-lg border-2 border-green-200 p-6">
                      <div className="flex items-start">
                        <CheckCircle className="h-6 w-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-green-900 mb-2">
                            Data Processing Agreement (DPA) Uploaded
                          </h3>
                          <dl className="space-y-2">
                            {task.dpaUploadedAt && (
                              <div>
                                <dt className="text-sm font-medium text-green-800 inline">Uploaded on: </dt>
                                <dd className="text-sm text-green-700 inline">
                                  {new Date(task.dpaUploadedAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </dd>
                              </div>
                            )}
                            {task.dpaPath && (
                              <div className="flex items-center gap-3">
                                <dt className="text-sm font-medium text-green-800">File: </dt>
                                <dd className="text-sm text-green-700">
                                  {task.dpaPath.split('/').pop()}
                                </dd>
                                <button
                                  onClick={async () => {
                                    const response = await fetch(`/api/tasks/${task.id}/dpa/download`);
                                    if (response.ok) {
                                      const blob = await response.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = task.dpaPath?.split('/').pop() || 'dpa';
                                      document.body.appendChild(a);
                                      a.click();
                                      window.URL.revokeObjectURL(url);
                                      document.body.removeChild(a);
                                    }
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </button>
                              </div>
                            )}
                          </dl>
                          <p className="text-sm text-green-700 mt-3">
                            ✓ All engagement documentation complete. You can now access all task work tabs.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generate Tab */}
            {activeTab === 'generate' && (
              <div className="space-y-6">
                {!letterContent ? (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                        Generate from Template
                      </h3>
                      <p className="text-sm text-forvis-gray-700">
                        Select a template and generate an engagement letter pre-filled with client and task information.
                      </p>
                    </div>
                    
                    {canManage ? (
                      <>
                        {/* Template Selection */}
                        <div className="border-2 border-forvis-gray-200 rounded-lg p-4">
                          <TemplateSelector
                            serviceLine={task.serviceLine || task.ServLineCode}
                            selectedTemplateId={selectedTemplateId}
                            onSelect={setSelectedTemplateId}
                          />
                        </div>

                        {/* AI Adaptation Option */}
                        <div className="flex items-start space-x-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                          <input
                            type="checkbox"
                            id="aiAdaptation"
                            checked={useAiAdaptation}
                            onChange={(e) => setUseAiAdaptation(e.target.checked)}
                            className="mt-1 h-4 w-4 text-purple-600 border-forvis-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <label htmlFor="aiAdaptation" className="text-sm font-medium text-purple-900 flex items-center cursor-pointer">
                              <Sparkles className="h-5 w-5 mr-2" />
                              Use AI to customize sections
                            </label>
                            <p className="text-xs text-purple-700 mt-1">
                              AI will adapt marked sections to be specific to this client and task while maintaining the professional structure and tone.
                            </p>
                          </div>
                        </div>

                        {/* Generate Button */}
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating || !selectedTemplateId}
                          className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-md disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                        >
                          <FileText className="h-5 w-5 mr-2" />
                          {isGenerating ? 'Generating...' : 'Generate Letter'}
                        </button>
                      </>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Only Partners and System Administrators can generate engagement letters.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">
                          Letter generated successfully
                        </p>
                        {sectionsUsed.length > 0 && (
                          <p className="text-xs text-forvis-gray-600 mt-1">
                            {sectionsUsed.length} sections included
                            {sectionsUsed.some((s) => s.wasAiAdapted) && (
                              <span className="ml-2 inline-flex items-center text-purple-600">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI-adapted
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto border-2 border-forvis-gray-200 rounded-lg p-4 bg-forvis-gray-50">
                      <MarkdownRenderer content={letterContent} />
                    </div>
                    {!isUploaded && (
                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Next step:</strong> Download this letter, have it signed by the client, then upload the signed version in the <button onClick={() => setActiveTab('upload')} className="underline font-semibold hover:text-blue-900">Upload Letter</button> tab.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Replace */}
        {showReplaceConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full p-6">
              <div className="flex items-start mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                    Replace Existing Letter?
                  </h3>
                  <p className="text-sm text-forvis-gray-700">
                    An engagement letter has already been uploaded for this task. Are you sure you want to replace it with the new file?
                  </p>
                  {task.engagementLetterPath && (
                    <p className="text-xs text-forvis-gray-600 mt-2">
                      Current file: <strong>{task.engagementLetterPath.split('/').pop()}</strong>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReplaceConfirm(false);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-md"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  Replace Letter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DPA Replace Confirmation Modal */}
        {showDpaReplaceConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full p-6">
              <div className="flex items-start mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                    Replace Existing DPA?
                  </h3>
                  <p className="text-sm text-forvis-gray-700">
                    A Data Processing Agreement has already been uploaded for this task. Are you sure you want to replace it with the new file?
                  </p>
                  {task.dpaPath && (
                    <p className="text-xs text-forvis-gray-600 mt-2">
                      Current file: <strong>{task.dpaPath.split('/').pop()}</strong>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDpaReplaceConfirm(false);
                    setSelectedDpaFile(null);
                    if (dpaFileInputRef.current) {
                      dpaFileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDpaUpload}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-md"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  Replace DPA
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


