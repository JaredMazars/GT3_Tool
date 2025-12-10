'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Sparkles,
  CheckCircle,
  Pencil,
  Trash2,
  ArrowUpIcon,
  ArrowDownIcon,
  X,
  FileUp,
  FileText,
} from 'lucide-react';
import { OpinionSection } from '@/types';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

interface SectionEditorProps {
  taskId: number;
  draftId: number;
}

interface DocumentFinding {
  content: string;
  fileName: string;
  category: string;
  score: number;
}

interface SectionGenerationState {
  sectionType: string;
  customTitle?: string;
  questions: Array<{ question: string; answer?: string }>;
  currentQuestionIndex: number;
  isComplete: boolean;
  generationId: string;
  documentFindings: DocumentFinding[];
}

const SECTION_TYPES = [
  { value: 'Facts', label: 'Facts' },
  { value: 'Issue', label: 'Issue' },
  { value: 'Law', label: 'Law' },
  { value: 'Analysis', label: 'Analysis' },
  { value: 'Application', label: 'Application (Law + Facts)' },
  { value: 'Conclusion', label: 'Conclusion' },
  { value: 'Custom', label: 'Custom Section' },
];

export default function SectionEditor({ taskId, draftId }: SectionEditorProps) {
  const [sections, setSections] = useState<OpinionSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  
  // Section creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  
  // Q&A dialogue state
  const [generationState, setGenerationState] = useState<SectionGenerationState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Document upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchSections();
  }, [draftId]);

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections`
      );
      if (!response.ok) throw new Error('Failed to fetch sections');
      const data = await response.json();
      setSections(data.data || []);
    } catch (error) {
      setError('Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSection = async () => {
    if (!selectedType) {
      setError('Please select a section type');
      return;
    }

    if (selectedType === 'Custom' && !customTitle.trim()) {
      setError('Please enter a custom section title');
      return;
    }

    setIsAnswering(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start_section',
            sectionType: selectedType,
            customTitle: selectedType === 'Custom' ? customTitle : undefined,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start section');
      }

      const data = await response.json();
      setGenerationState(data.state);
      setCurrentQuestion(data.question);
      setIsAnswering(false); // Enable the textarea for user input
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start section');
      setIsAnswering(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !generationState) return;

    setIsAnswering(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'answer_question',
            state: generationState,
            answer: userAnswer,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit answer');
      }

      const data = await response.json();
      setGenerationState(data.state);
      
      if (data.complete) {
        // Questions complete, ready to generate
        setCurrentQuestion('');
        setIsAnswering(false);
      } else {
        // Show next question
        setCurrentQuestion(data.question);
        setUserAnswer('');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit answer');
    } finally {
      setIsAnswering(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!generationState) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_content',
            state: generationState,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate section');
      }

      await fetchSections();
      
      // Reset modal state
      setShowCreateModal(false);
      setSelectedType('');
      setCustomTitle('');
      setGenerationState(null);
      setCurrentQuestion('');
      setUserAnswer('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate section');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadDocument = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !generationState) return;

    setIsUploadingDoc(true);
    setUploadProgress('Uploading document...');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('generationId', generationState.generationId);
      formData.append('category', 'Supporting Document');

      // Upload document with immediate indexing
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/documents`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      const data = await response.json();
      setUploadProgress(`✅ ${file.name} uploaded successfully! Refreshing context...`);
      
      // Wait for document to be indexed (give it a moment)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh document context immediately
      try {
        const refreshResponse = await fetch(
          `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'refresh_context',
              state: generationState,
            }),
          }
        );

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.state) {
            setGenerationState(refreshData.state);
            setUploadProgress(`✅ ${file.name} is now available to the AI!`);
          }
        }
      } catch (error) {
        // Non-fatal error, document will be available on next answer
      }
      
      // Clear progress after showing success
      setTimeout(() => {
        setUploadProgress('');
        setIsUploadingDoc(false);
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload document');
      setIsUploadingDoc(false);
      setUploadProgress('');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRegenerate = async (sectionId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Regenerate Section',
      message: 'Regenerate this section with AI? The current content will be replaced.',
      variant: 'warning',
      onConfirm: async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response = await fetch(
            `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'regenerate',
                sectionId,
              }),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to regenerate section');
          }

          await fetchSections();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to regenerate section');
        } finally {
          setIsLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleEditSection = (section: OpinionSection) => {
    setEditingSection(section.id);
    setEditTitle(section.title);
    setEditContent(section.content);
  };

  const handleSaveEdit = async () => {
    if (!editingSection) return;

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId: editingSection,
            title: editTitle,
            content: editContent,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update section');

      await fetchSections();
      setEditingSection(null);
    } catch (error) {
      setError('Failed to update section');
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Section',
      message: 'Delete this section? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections?sectionId=${sectionId}`,
            { method: 'DELETE' }
          );

          if (!response.ok) throw new Error('Failed to delete section');

          await fetchSections();
        } catch (error) {
          setError('Failed to delete section');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleMoveSection = async (sectionId: number, direction: 'up' | 'down') => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;
    
    const newIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    // Create reorder data
    const reorderData = [...sections];
    const [moved] = reorderData.splice(sectionIndex, 1);
    if (!moved) return; // Safety check, should not happen
    reorderData.splice(newIndex, 0, moved);
    
    const updates = reorderData.map((section, idx) => ({
      id: section.id,
      order: idx + 1,
    }));

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reorderData: updates }),
        }
      );

      if (!response.ok) throw new Error('Failed to reorder sections');

      await fetchSections();
    } catch (error) {
      setError('Failed to reorder sections');
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setSelectedType('');
    setCustomTitle('');
    setGenerationState(null);
    setCurrentQuestion('');
    setUserAnswer('');
    setError(null);
  };

  if (isLoading && sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sections...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add Section Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Opinion Sections</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Section
        </button>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No sections yet</p>
          <p className="text-sm text-gray-500">
            Click "Add Section" to start building your tax opinion
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              {editingSection === section.id ? (
                // Edit mode
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {section.title}
                        </h4>
                        {section.aiGenerated && (
                          <span title="AI Generated">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                          </span>
                        )}
                        {section.reviewed && (
                          <span title="Reviewed">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{section.sectionType}</p>
                    </div>
                    
                    {/* Section Actions */}
                    <div className="flex items-center gap-1">
                      {/* Reorder buttons */}
                      {index > 0 && (
                        <button
                          onClick={() => handleMoveSection(section.id, 'up')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Move up"
                        >
                          <ArrowUpIcon className="w-4 h-4" />
                        </button>
                      )}
                      {index < sections.length - 1 && (
                        <button
                          onClick={() => handleMoveSection(section.id, 'down')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Move down"
                        >
                          <ArrowDownIcon className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Edit button */}
                      <button
                        onClick={() => handleEditSection(section)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      
                      {/* Regenerate button (only for AI sections) */}
                      {section.aiGenerated && (
                        <button
                          onClick={() => handleRegenerate(section.id)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Regenerate with AI"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={section.content} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Section Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {generationState ? 'Section Q&A' : 'Create New Section'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Step 1: Select Type (if not started) */}
              {!generationState && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Section Type
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select a section type...</option>
                      {SECTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedType === 'Custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Section Title
                      </label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="e.g., Executive Summary, Recommendations"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleStartSection}
                      disabled={!selectedType || (selectedType === 'Custom' && !customTitle.trim())}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Start Section
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Q&A (if started) */}
              {generationState && currentQuestion && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">AI Question:</p>
                    <p className="text-gray-700">{currentQuestion}</p>
                  </div>

                  {/* Document Context Display */}
                  {generationState.documentFindings && generationState.documentFindings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Referenced Documents ({generationState.documentFindings.length}):
                      </p>
                      <div className="space-y-2">
                        {[...new Set(generationState.documentFindings.map(d => d.fileName))].slice(0, 3).map((fileName, idx) => {
                          const doc = generationState.documentFindings.find(d => d.fileName === fileName);
                          return (
                            <div key={idx} className="text-xs text-gray-700">
                              <strong>{fileName}</strong> ({doc?.category})
                              {doc?.content && (
                                <p className="text-gray-600 mt-1 line-clamp-2">{doc.content.substring(0, 150)}...</p>
                              )}
                            </div>
                          );
                        })}
                        {generationState.documentFindings.length > 3 && (
                          <p className="text-xs text-gray-500 italic">
                            +{generationState.documentFindings.length - 3} more documents referenced
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Answer
                    </label>
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      rows={6}
                      placeholder="Type your answer here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      disabled={isAnswering}
                    />
                    
                    {/* Document Upload Button */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={handleUploadDocument}
                        disabled={isUploadingDoc}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                      >
                        <FileUp className="w-4 h-4" />
                        {isUploadingDoc ? 'Uploading...' : 'Upload Additional Document'}
                      </button>
                      {uploadProgress && (
                        <p className="text-xs text-green-600 mt-1">{uploadProgress}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!userAnswer.trim() || isAnswering}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isAnswering ? 'Processing...' : 'Submit Answer'}
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Generate (if Q&A complete) */}
              {generationState && !currentQuestion && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-900 font-medium mb-2">
                      ✓ Questions Complete
                    </p>
                    <p className="text-gray-700">
                      The AI has gathered enough information. Click "Generate Section" to create the content.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerateContent}
                      disabled={isGenerating}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Section'}
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
}
