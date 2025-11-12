'use client';

import { useState, useEffect } from 'react';
import { useProject } from '@/hooks/projects/useProjectData';
import { ResearchNote } from '@/types';
import { PlusIcon, TagIcon, FolderIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ResearchNotesPageProps {
  params: { id: string };
}

export default function ResearchNotesPage({ params }: ResearchNotesPageProps) {
  const { data: project } = useProject(params.id);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ResearchNote | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    category: '',
  });

  useEffect(() => {
    fetchNotes();
  }, [params.id]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${params.id}/research-notes`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      const data = await response.json();
      setNotes(data.data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/research-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to create note');
      await fetchNotes();
      setShowAddModal(false);
      setFormData({ title: '', content: '', tags: '', category: '' });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create note');
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;
    
    try {
      const response = await fetch(`/api/projects/${params.id}/research-notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to update note');
      await fetchNotes();
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update note');
    }
  };

  const handleEditNote = (note: ResearchNote) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      tags: note.tags || '',
      category: note.category || '',
    });
    setIsEditing(true);
  };

  const categories = Array.from(new Set(notes.map(n => n.category).filter(Boolean)));
  
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchTerm || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.tags || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || note.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
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
          <h2 className="text-2xl font-bold text-forvis-gray-900">Research Notes</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">Organize and manage your tax research</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <PlusIcon className="w-5 h-5" />
          New Note
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-forvis-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
          />
        </div>
        <select
          value={filterCategory || ''}
          onChange={(e) => setFilterCategory(e.target.value || null)}
          className="px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {categories.filter(cat => cat !== null).map(cat => (
            <option key={cat} value={cat!}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Notes List */}
        <div className="col-span-4 space-y-3">
          <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
            <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
              <h3 className="text-sm font-bold text-white">Notes ({filteredNotes.length})</h3>
            </div>
            <div className="divide-y divide-forvis-gray-200 max-h-[600px] overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <div className="p-4 text-center text-sm text-forvis-gray-600">
                  No notes found. Create your first note to get started.
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setIsEditing(false);
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedNote?.id === note.id
                        ? 'bg-forvis-blue-50 border-l-4 border-forvis-blue-600'
                        : 'hover:bg-forvis-gray-50'
                    }`}
                  >
                    <h4 className="text-sm font-semibold text-forvis-gray-900 mb-2">{note.title}</h4>
                    {note.category && (
                      <div className="flex items-center gap-1 text-xs text-forvis-gray-600 mb-1">
                        <FolderIcon className="w-4 h-4" />
                        <span>{note.category}</span>
                      </div>
                    )}
                    {note.tags && (
                      <div className="flex items-center gap-1 text-xs text-forvis-gray-600">
                        <TagIcon className="w-4 h-4" />
                        <span>{note.tags}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Note Viewer/Editor */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
            {selectedNote || isEditing ? (
              <>
                <div className="px-4 py-3 border-b border-forvis-gray-200" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      {isEditing ? 'Editing Note' : 'Viewing Note'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!isEditing && selectedNote && (
                        <button
                          onClick={() => handleEditNote(selectedNote)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {isEditing && (
                        <>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setFormData({ title: '', content: '', tags: '', category: '' });
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateNote}
                            className="px-3 py-1.5 text-xs font-semibold bg-white text-forvis-blue-900 rounded-lg transition-colors shadow-corporate"
                          >
                            Save Changes
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
                        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Title</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Category</label>
                          <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                            placeholder="e.g., VAT, Income Tax"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Tags</label>
                          <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                            placeholder="Comma-separated tags"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Content</label>
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          rows={15}
                          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm"
                          placeholder="Write your research notes here..."
                        />
                      </div>
                    </>
                  ) : selectedNote && (
                    <>
                      <div>
                        <h4 className="text-lg font-bold text-forvis-gray-900 mb-3">{selectedNote.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-forvis-gray-600 mb-4">
                          {selectedNote.category && (
                            <div className="flex items-center gap-1">
                              <FolderIcon className="w-4 h-4" />
                              <span className="px-2 py-0.5 bg-forvis-blue-100 text-forvis-blue-800 rounded-full text-xs font-medium">
                                {selectedNote.category}
                              </span>
                            </div>
                          )}
                          {selectedNote.tags && (
                            <div className="flex items-center gap-1">
                              <TagIcon className="w-4 h-4" />
                              <span>{selectedNote.tags}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-forvis-gray-800">
                          {selectedNote.content || 'No content yet.'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <TagIcon className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Note Selected</h3>
                <p className="text-sm text-forvis-gray-600">
                  Select a note from the list or create a new one to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4 text-forvis-gray-900">Create Research Note</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                    placeholder="e.g., VAT, Income Tax"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                    placeholder="Comma-separated tags"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm"
                  placeholder="Write your research notes here..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ title: '', content: '', tags: '', category: '' });
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              >
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

