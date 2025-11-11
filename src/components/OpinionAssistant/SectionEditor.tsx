'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  SparklesIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { OpinionSection } from '@/types';

interface SectionEditorProps {
  projectId: number;
  draftId: number;
}

const SECTION_TYPES = ['Facts', 'Issue', 'Law', 'Application', 'Conclusion', 'Custom'];

export default function SectionEditor({ projectId, draftId }: SectionEditorProps) {
  const [sections, setSections] = useState<OpinionSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);

  useEffect(() => {
    fetchSections();
  }, [draftId]);

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/sections`
      );
      if (!response.ok) throw new Error('Failed to fetch sections');
      const data = await response.json();
      setSections(data.data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      setError('Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAllSections = async () => {
    if (
      !confirm(
        'This will generate all opinion sections using AI. Any existing sections will be preserved. Continue?'
      )
    )
      return;

    setGeneratingAll(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_all' }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate sections');
      }

      await fetchSections();
    } catch (error: any) {
      console.error('Error generating sections:', error);
      setError(error.message || 'Failed to generate sections');
    } finally {
      setGeneratingAll(false);
    }
  };

  const generateSection = async (sectionType: string) => {
    setGeneratingSection(sectionType);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_section',
            sectionType,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate section');
      }

      await fetchSections();
    } catch (error: any) {
      console.error(`Error generating ${sectionType} section:`, error);
      setError(error.message || `Failed to generate ${sectionType} section`);
    } finally {
      setGeneratingSection(null);
    }
  };

  const startEdit = (section: OpinionSection) => {
    setEditingSection(section.id);
    setEditTitle(section.title);
    setEditContent(section.content);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditTitle('');
    setEditContent('');
  };

  const saveSection = async (sectionId: number) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId,
            title: editTitle,
            content: editContent,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to save section');

      await fetchSections();
      cancelEdit();
    } catch (error) {
      console.error('Error saving section:', error);
      setError('Failed to save section');
    }
  };

  const toggleReviewed = async (section: OpinionSection) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId: section.id,
            reviewed: !section.reviewed,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update review status');

      await fetchSections();
    } catch (error) {
      console.error('Error updating review status:', error);
      setError('Failed to update review status');
    }
  };

  const deleteSection = async (sectionId: number) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/sections?sectionId=${sectionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete section');

      await fetchSections();
    } catch (error) {
      console.error('Error deleting section:', error);
      setError('Failed to delete section');
    }
  };

  const moveSection = async (sectionId: number, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newSections[currentIndex], newSections[swapIndex]] = [
      newSections[swapIndex],
      newSections[currentIndex],
    ];

    // Update orders
    const reorderData = newSections.map((section, index) => ({
      id: section.id,
      order: index + 1,
    }));

    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/sections`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reorderData }),
        }
      );

      if (!response.ok) throw new Error('Failed to reorder sections');

      setSections(newSections.map((s, i) => ({ ...s, order: i + 1 })));
    } catch (error) {
      console.error('Error reordering sections:', error);
      setError('Failed to reorder sections');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b-2 border-forvis-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-forvis-gray-900">Opinion Sections</h3>
            <p className="text-sm text-forvis-gray-600">
              Structure and edit your tax opinion ({sections.length} sections)
            </p>
          </div>
          <button
            onClick={generateAllSections}
            disabled={generatingAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-700 text-white rounded-lg hover:from-forvis-blue-600 hover:to-forvis-blue-800 transition-all disabled:opacity-50 text-sm font-semibold"
          >
            <SparklesIcon className="w-5 h-5" />
            {generatingAll ? 'Generating...' : 'Generate All Sections'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12">
            <SparklesIcon className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-forvis-gray-900 mb-2">
              No Sections Yet
            </h4>
            <p className="text-sm text-forvis-gray-600 mb-6">
              Generate opinion sections with AI or create them manually
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SECTION_TYPES.slice(0, 5).map((type) => (
                <button
                  key={type}
                  onClick={() => generateSection(type)}
                  disabled={generatingSection === type}
                  className="px-3 py-2 text-sm font-medium bg-white border border-forvis-gray-300 text-forvis-gray-700 rounded-lg hover:bg-forvis-gray-50 transition-colors disabled:opacity-50"
                >
                  {generatingSection === type ? 'Generating...' : `Generate ${type}`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="bg-white border-2 border-forvis-gray-200 rounded-lg overflow-hidden"
              >
                {/* Section Header */}
                <div className="bg-forvis-gray-50 px-4 py-3 border-b border-forvis-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-forvis-gray-500">
                        {section.order}
                      </span>
                      <h4 className="text-sm font-bold text-forvis-gray-900">
                        {section.title}
                      </h4>
                      {section.aiGenerated && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                          AI Generated
                        </span>
                      )}
                      {section.reviewed && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          Reviewed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveSection(section.id, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-forvis-gray-200 rounded disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowsUpDownIcon className="w-4 h-4 text-forvis-gray-600 rotate-180" />
                      </button>
                      <button
                        onClick={() => moveSection(section.id, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-1 hover:bg-forvis-gray-200 rounded disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowsUpDownIcon className="w-4 h-4 text-forvis-gray-600" />
                      </button>
                      <button
                        onClick={() => toggleReviewed(section)}
                        className="p-1 hover:bg-forvis-gray-200 rounded"
                        title={section.reviewed ? 'Mark as unreviewed' : 'Mark as reviewed'}
                      >
                        <CheckCircleIcon
                          className={`w-5 h-5 ${
                            section.reviewed ? 'text-green-600' : 'text-forvis-gray-400'
                          }`}
                        />
                      </button>
                      {editingSection !== section.id ? (
                        <button
                          onClick={() => startEdit(section)}
                          className="p-1 hover:bg-forvis-gray-200 rounded"
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5 text-forvis-gray-600" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="p-1 hover:bg-red-50 rounded group"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5 text-forvis-gray-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section Content */}
                <div className="p-4">
                  {editingSection === section.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm font-medium"
                        placeholder="Section title"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm font-mono"
                        placeholder="Section content"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveSection(section.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-forvis-blue-600 rounded-lg hover:bg-forvis-blue-700"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm text-forvis-gray-800">
                        {section.content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

