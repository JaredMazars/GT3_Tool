'use client';

import { useState, useEffect } from 'react';
import { useTask } from '@/hooks/tasks/useTaskData';
import { OpinionDraft } from '@/types';
import {
  Plus,
  MessageSquare,
  FileText,
  Layers,
  Eye,
  Clock,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import ChatInterface from '@/components/tools/tax-opinion/components/ChatInterface';
import DocumentManager from '@/components/tools/tax-opinion/components/DocumentManager';
import SectionEditor from '@/components/tools/tax-opinion/components/SectionEditor';
import OpinionPreview from '@/components/tools/tax-opinion/components/OpinionPreview';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

interface OpinionDraftingPageProps {
  params: { id: string };
}

type TabType = 'chat' | 'documents' | 'sections' | 'preview';

export default function OpinionDraftingPage({ params }: OpinionDraftingPageProps) {
  // Note: In client components, params is already resolved (not a Promise)
  const { data: _task, isLoading: taskLoading } = useTask(params.id);
  const [drafts, setDrafts] = useState<OpinionDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<OpinionDraft | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [error, setError] = useState<string | null>(null);
  
  // Rename state
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<OpinionDraft | null>(null);

  useEffect(() => {
    fetchDrafts();
  }, [params.id]);

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${params.id}/opinion-drafts`);
      if (!response.ok) throw new Error('Failed to fetch drafts');
      const data = await response.json();
      setDrafts(data.data || []);
      if (data.data?.length > 0 && !selectedDraft) {
        setSelectedDraft(data.data[0]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch drafts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.id}/opinion-drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Opinion Draft',
          content: '',
          status: 'DRAFT',
        }),
      });

      if (!response.ok) throw new Error('Failed to create draft');
      const data = await response.json();
      await fetchDrafts();
      setSelectedDraft(data.data);
      setActiveTab('chat');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create draft');
    }
  };

  const handleStartRename = (draft: OpinionDraft, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDraftId(draft.id);
    setEditingTitle(draft.title);
  };

  const handleSaveRename = async (draftId: number) => {
    if (!editingTitle.trim()) {
      setError('Draft title cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${params.id}/opinion-drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTitle.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to rename draft');
      
      await fetchDrafts();
      setEditingDraftId(null);
      setEditingTitle('');
      setError(null);
      
      // Update selected draft if it was the one renamed
      if (selectedDraft?.id === draftId) {
        setSelectedDraft({ ...selectedDraft, title: editingTitle.trim() });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to rename draft');
    }
  };

  const handleCancelRename = () => {
    setEditingDraftId(null);
    setEditingTitle('');
  };

  const handleDeleteClick = (draft: OpinionDraft, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftToDelete(draft);
    setShowDeleteConfirm(true);
  };

  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;

    try {
      const response = await fetch(`/api/tasks/${params.id}/opinion-drafts/${draftToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete draft');

      // If we deleted the selected draft, select another one
      if (selectedDraft?.id === draftToDelete.id) {
        const remainingDrafts = drafts.filter(d => d.id !== draftToDelete.id);
        setSelectedDraft(remainingDrafts[0] ?? null);
      }

      await fetchDrafts();
      setShowDeleteConfirm(false);
      setDraftToDelete(null);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete draft');
      setShowDeleteConfirm(false);
      setDraftToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDraftToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      FINAL: 'bg-green-100 text-green-800 border-green-300',
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
  };

  const tabs = [
    { id: 'chat' as TabType, label: 'AI Assistant', icon: MessageSquare },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'sections' as TabType, label: 'Sections', icon: Layers },
    { id: 'preview' as TabType, label: 'Preview', icon: Eye },
  ];

  if (taskLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-forvis-gray-900">AI Tax Opinion Assistant</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">
            Interactive AI-powered tax opinion development
          </p>
        </div>
        <button
          onClick={handleCreateDraft}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <Plus className="w-5 h-5" />
          New Opinion
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Drafts Sidebar */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg shadow-corporate border-2 h-full overflow-hidden" style={{ borderColor: '#2E5AAC' }}>
            <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
              <h3 className="text-sm font-bold text-white">Opinion Drafts ({drafts.length})</h3>
            </div>
            <div className="divide-y divide-forvis-gray-200 overflow-y-auto h-[calc(100%-52px)]">
              {drafts.length === 0 ? (
                <div className="p-4 text-center text-sm text-forvis-gray-600">
                  No drafts yet. Create your first opinion to get started.
                </div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => editingDraftId !== draft.id && setSelectedDraft(draft)}
                    className={`group p-4 transition-colors ${
                      editingDraftId === draft.id ? '' : 'cursor-pointer'
                    } ${
                      selectedDraft?.id === draft.id
                        ? 'bg-forvis-blue-50 border-l-4 border-forvis-blue-600'
                        : 'hover:bg-forvis-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      {editingDraftId === draft.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveRename(draft.id);
                              } else if (e.key === 'Escape') {
                                handleCancelRename();
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-forvis-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveRename(draft.id);
                            }}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelRename();
                            }}
                            className="p-1 text-red-600 hover:text-red-700"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-forvis-gray-900 flex-1">
                              {draft.title}
                            </h4>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleStartRename(draft, e)}
                                className="p-1 text-forvis-gray-400 hover:text-forvis-blue-600"
                                title="Rename"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteClick(draft, e)}
                                className="p-1 text-forvis-gray-400 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadge(
                              draft.status
                            )}`}
                          >
                            {draft.status}
                          </span>
                        </>
                      )}
                    </div>
                    {editingDraftId !== draft.id && (
                      <div className="flex items-center gap-2 text-xs text-forvis-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>v{draft.version}</span>
                        <span>•</span>
                        <span>{new Date(draft.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {selectedDraft ? (
            <div className="bg-white rounded-lg shadow-corporate border-2 h-full overflow-hidden flex flex-col" style={{ borderColor: '#2E5AAC' }}>
              {/* Tabs */}
              <div className="border-b border-forvis-gray-200">
                <div className="flex gap-1 px-4">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                          activeTab === tab.id
                            ? 'border-forvis-blue-600 text-forvis-blue-700 bg-forvis-blue-50'
                            : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:bg-forvis-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'chat' && (
                  <ChatInterface taskId={Number.parseInt(params.id)} draftId={selectedDraft.id} />
                )}
                {activeTab === 'documents' && (
                  <DocumentManager
                    taskId={Number.parseInt(params.id)}
                    draftId={selectedDraft.id}
                  />
                )}
                {activeTab === 'sections' && (
                  <SectionEditor taskId={Number.parseInt(params.id)} draftId={selectedDraft.id} />
                )}
                {activeTab === 'preview' && (
                  <OpinionPreview
                    taskId={Number.parseInt(params.id)}
                    draftId={selectedDraft.id}
                    draftTitle={selectedDraft.title}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-corporate border-2 h-full flex items-center justify-center" style={{ borderColor: '#2E5AAC' }}>
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                  No Opinion Selected
                </h3>
                <p className="text-sm text-forvis-gray-600">
                  Select an opinion from the sidebar or create a new one to get started.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleDeleteDraft}
        title="Delete Opinion Draft"
        message={`Are you sure you want to delete "${draftToDelete?.title}"? All sections, documents, and chat history associated with this draft will be permanently deleted.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
