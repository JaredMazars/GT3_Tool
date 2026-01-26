'use client';

import { useState } from 'react';
import { FolderPlus, Upload, Grid3x3, List } from 'lucide-react';
import { FileGrid, CreateFolderModal, FileUploader, FileViewer, FolderTree, BreadcrumbNav } from './workspace';
import { useFeature } from '@/hooks/permissions/useFeature';
import { Feature } from '@/lib/permissions/features';
import { Button, Banner } from '@/components/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getChildFolders } from '@/lib/utils/folderPath';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

interface WorkspaceFolder {
  id: number;
  name: string;
  description: string | null;
  parentFolderId: number | null;
  _count?: {
    Files: number;
    ChildFolders: number;
  };
}

interface WorkspaceFile {
  id: number;
  name: string;
  fileType: string;
  fileSize: number | string;
  thumbnailUrl: string | null;
  uploadedBy: string;
  createdAt: string;
  lastModifiedAt: string | null;
  webUrl: string;
  embedUrl?: string | null;
}

interface TaskWorkspaceTabProps {
  taskId: string;
}

export function TaskWorkspaceTab({ taskId }: TaskWorkspaceTabProps) {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; file: WorkspaceFile | null }>({ isOpen: false, file: null });
  const queryClient = useQueryClient();

  // Fetch workspace folders for this task
  const { data: folders = [], isLoading: isLoadingFolders, refetch: refetchFolders } = useQuery({
    queryKey: ['workspace', 'task-folders', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/workspace/folders`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch folders');
      }
      const result = await response.json();
      return result.data as WorkspaceFolder[];
    },
  });

  // Fetch files for selected folder or root level
  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useQuery({
    queryKey: ['workspace', 'task-files', taskId, selectedFolderId],
    queryFn: async () => {
      const url = selectedFolderId 
        ? `/api/tasks/${taskId}/workspace/files?folderId=${selectedFolderId}`
        : `/api/tasks/${taskId}/workspace/files`;
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch files');
      }
      const result = await response.json();
      return result.data as WorkspaceFile[];
    },
  });

  // Fetch selected file details
  const { data: selectedFile } = useQuery({
    queryKey: ['workspace', 'task-file', taskId, selectedFileId],
    queryFn: async () => {
      if (!selectedFileId) return null;
      
      // Find file in current files list
      const file = files.find(f => f.id === selectedFileId);
      if (file) return file;
      
      // If not found, fetch from API
      const response = await fetch(`/api/tasks/${taskId}/workspace/files?fileId=${selectedFileId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch file');
      }
      const result = await response.json();
      return result.data?.[0] as WorkspaceFile | undefined;
    },
    enabled: !!selectedFileId,
  });

  const { hasFeature: canCreateFolders } = useFeature(Feature.MANAGE_WORKSPACE_FOLDERS);
  const { hasFeature: canUploadFiles } = useFeature(Feature.MANAGE_WORKSPACE_FILES);
  const { hasFeature: canDeleteFiles } = useFeature(Feature.DELETE_WORKSPACE_FILES);

  const currentFolder = selectedFolderId ? folders.find(f => f.id === selectedFolderId) : null;
  // Get child folders for the current folder (or root if none selected)
  const currentFolderChildren = getChildFolders(folders, selectedFolderId) as WorkspaceFolder[];

  const handleView = (file: WorkspaceFile) => {
    setSelectedFileId(file.id);
  };

  const handleDownload = async (file: WorkspaceFile) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/workspace/files/${file.id}/download`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download file');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      const filename = filenameMatch && filenameMatch[1] ? decodeURIComponent(filenameMatch[1]) : file.name;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to download file');
    }
  };

  const handleDelete = (file: WorkspaceFile) => {
    setDeleteConfirmModal({ isOpen: true, file });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.file) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/workspace/files/${deleteConfirmModal.file.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete file');
      }

      // Invalidate queries to refresh the file list
      queryClient.invalidateQueries({ queryKey: ['workspace', 'task-files', taskId] });
      refetchFiles();
      setDeleteConfirmModal({ isOpen: false, file: null });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete file');
      setDeleteConfirmModal({ isOpen: false, file: null });
    }
  };

  const handleFolderClick = (folder: { id: number; name: string; description: string | null; parentFolderId: number | null }) => {
    setSelectedFolderId(folder.id);
  };

  const handleFolderDoubleClick = (folder: { id: number; name: string; description: string | null; parentFolderId: number | null }) => {
    setSelectedFolderId(folder.id);
  };

  const isLoading = isLoadingFolders || isLoadingFiles;

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="px-6 pt-4">
          <Banner
            variant="error"
            message={error}
            dismissible
            onDismiss={() => setError(null)}
          />
        </div>
      )}
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-forvis-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-forvis-gray-900">Collaborative Workspace</h2>
            <p className="text-sm text-forvis-gray-600 mt-1">
              Upload, edit, and collaborate on Office documents in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canCreateFolders && (
              <Button
                variant="primary"
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                New Folder
              </Button>
            )}
            {canUploadFiles && (
              <Button
                variant="secondary"
                onClick={() => setShowUploader(true)}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
            )}
            <div className="flex items-center gap-2 border-l border-forvis-gray-200 pl-3 ml-3">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-forvis-blue-100 text-forvis-blue-600'
                    : 'text-forvis-gray-600 hover:bg-forvis-gray-100'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-forvis-blue-100 text-forvis-blue-600'
                    : 'text-forvis-gray-600 hover:bg-forvis-gray-100'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Folder Tree */}
        <div className="w-64 border-r border-forvis-gray-200 bg-forvis-gray-50 flex-shrink-0">
          {isLoadingFolders ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-forvis-gray-500">Loading folders...</div>
            </div>
          ) : (
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelect={setSelectedFolderId}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumb Navigation */}
          <div className="px-6 py-3 border-b border-forvis-gray-200 bg-white">
            <BreadcrumbNav
              folders={folders}
              currentFolderId={selectedFolderId}
              onNavigate={setSelectedFolderId}
            />
          </div>

          {/* Files and Folders Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-forvis-gray-500">Loading files...</div>
              </div>
            ) : (
              <FileGrid
                folders={currentFolderChildren}
                files={files}
                onFolderClick={handleFolderClick}
                onFolderDoubleClick={handleFolderDoubleClick}
                onView={handleView}
                onDownload={handleDownload}
                onDelete={canDeleteFiles ? handleDelete : undefined}
                viewMode={viewMode}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          parentFolderId={selectedFolderId || undefined}
          taskId={parseInt(taskId, 10)}
          onSuccess={() => {
            refetchFolders();
            setShowCreateFolder(false);
          }}
          onClose={() => setShowCreateFolder(false)}
        />
      )}

      {showUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          {folders.length > 0 ? (
            <FileUploader
              folderId={selectedFolderId || folders.find(f => f.parentFolderId === null)?.id || folders[0]!.id}
              taskId={parseInt(taskId, 10)}
              onUploadComplete={() => {
                refetchFiles();
                setShowUploader(false);
              }}
              onClose={() => setShowUploader(false)}
            />
          ) : (
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-corporate-lg text-center">
              <h2 className="text-lg font-semibold text-forvis-gray-900 mb-2">Create a Folder First</h2>
              <p className="text-sm text-forvis-gray-600 mb-4">
                You need to create at least one folder before uploading files.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={() => setShowUploader(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setShowUploader(false);
                    setShowCreateFolder(true);
                  }}
                >
                  Create Folder
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedFileId && selectedFile && (
        <FileViewer
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          embedUrl={selectedFile.embedUrl || undefined}
          webUrl={selectedFile.webUrl}
          onClose={() => {
            setSelectedFileId(null);
            queryClient.removeQueries({ queryKey: ['workspace', 'task-file', taskId, selectedFileId] });
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, file: null })}
        onConfirm={handleConfirmDelete}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteConfirmModal.file?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

