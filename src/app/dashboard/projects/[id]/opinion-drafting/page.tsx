'use client';

import { useState, useEffect } from 'react';
import { useProject } from '@/hooks/useProjectData';
import { OpinionDraft } from '@/types';
import { PlusIcon, DocumentDuplicateIcon, ClockIcon } from '@heroicons/react/24/outline';

interface OpinionDraftingPageProps {
  params: { id: string };
}

export default function OpinionDraftingPage({ params }: OpinionDraftingPageProps) {
  const { data: project, isLoading: projectLoading } = useProject(params.id);
  const [drafts, setDrafts] = useState<OpinionDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<OpinionDraft | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts();
  }, [params.id]);

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${params.id}/opinion-drafts`);
      if (!response.ok) throw new Error('Failed to fetch drafts');
      const data = await response.json();
      setDrafts(data.data || []);
      if (data.data?.length > 0 && !selectedDraft) {
        setSelectedDraft(data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch drafts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/opinion-drafts`, {
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
      setIsEditing(true);
      setEditTitle(data.data.title);
      setEditContent(data.data.content);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create draft');
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedDraft) return;
    
    try {
      const response = await fetch(`/api/projects/${params.id}/opinion-drafts/${selectedDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save draft');
      await fetchDrafts();
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save draft');
    }
  };

  const handleEditDraft = (draft: OpinionDraft) => {
    setSelectedDraft(draft);
    setEditTitle(draft.title);
    setEditContent(draft.content);
    setIsEditing(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      FINAL: 'bg-green-100 text-green-800 border-green-300',
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
  };

  if (projectLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-forvis-gray-900">Opinion Drafting</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">Create and manage tax opinion drafts</p>
        </div>
        <button
          onClick={handleCreateDraft}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <PlusIcon className="w-5 h-5" />
          New Draft
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Drafts List */}
        <div className="col-span-4 space-y-3">
          <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
            <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
              <h3 className="text-sm font-bold text-white">All Drafts ({drafts.length})</h3>
            </div>
            <div className="divide-y divide-forvis-gray-200 max-h-[600px] overflow-y-auto">
              {drafts.length === 0 ? (
                <div className="p-4 text-center text-sm text-forvis-gray-600">
                  No drafts yet. Create your first draft to get started.
                </div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => setSelectedDraft(draft)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedDraft?.id === draft.id
                        ? 'bg-forvis-blue-50 border-l-4 border-forvis-blue-600'
                        : 'hover:bg-forvis-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-forvis-gray-900">{draft.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadge(draft.status)}`}>
                        {draft.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-forvis-gray-600">
                      <ClockIcon className="w-4 h-4" />
                      <span>Version {draft.version}</span>
                      <span>•</span>
                      <span>{new Date(draft.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Draft Editor */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
            {selectedDraft ? (
              <>
                <div className="px-4 py-3 border-b border-forvis-gray-200" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      {isEditing ? 'Editing Draft' : 'Viewing Draft'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => handleEditDraft(selectedDraft)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {isEditing && (
                        <>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveDraft}
                            className="px-3 py-1.5 text-xs font-semibold bg-white text-forvis-blue-900 rounded-lg transition-colors shadow-corporate"
                          >
                            Save Draft
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                          Content
                        </label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={20}
                          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent font-mono text-sm"
                          placeholder="Write your tax opinion here..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-lg font-bold text-forvis-gray-900 mb-2">{selectedDraft.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-forvis-gray-600">
                          <span>Version {selectedDraft.version}</span>
                          <span>•</span>
                          <span>Last updated: {new Date(selectedDraft.updatedAt).toLocaleString()}</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadge(selectedDraft.status)}`}>
                            {selectedDraft.status}
                          </span>
                        </div>
                      </div>
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-forvis-gray-800">
                          {selectedDraft.content || 'No content yet.'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <DocumentDuplicateIcon className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Draft Selected</h3>
                <p className="text-sm text-forvis-gray-600">
                  Select a draft from the list or create a new one to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

