'use client';

import { useState, useEffect } from 'react';
import { useProject } from '@/hooks/projects/useProjectData';
import { LegalPrecedent } from '@/types';
import { PlusIcon, ScaleIcon, LinkIcon } from '@heroicons/react/24/outline';

interface LegalPrecedentsPageProps {
  params: { id: string };
}

export default function LegalPrecedentsPage({ params }: LegalPrecedentsPageProps) {
  const { data: project } = useProject(params.id);
  const [precedents, setPrecedents] = useState<LegalPrecedent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrecedent, setSelectedPrecedent] = useState<LegalPrecedent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    caseName: '',
    citation: '',
    court: '',
    year: new Date().getFullYear(),
    summary: '',
    relevance: '',
    link: '',
  });

  useEffect(() => {
    fetchPrecedents();
  }, [params.id]);

  const fetchPrecedents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${params.id}/legal-precedents`);
      if (!response.ok) throw new Error('Failed to fetch precedents');
      const data = await response.json();
      setPrecedents(data.data || []);
    } catch (error) {
      console.error('Error fetching precedents:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch precedents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrecedent = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/legal-precedents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to create precedent');
      await fetchPrecedents();
      setShowAddModal(false);
      setFormData({
        caseName: '',
        citation: '',
        court: '',
        year: new Date().getFullYear(),
        summary: '',
        relevance: '',
        link: '',
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create precedent');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-forvis-gray-900">Legal Precedents</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">Manage case law and legal references</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <PlusIcon className="w-5 h-5" />
          Add Precedent
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {precedents.length === 0 ? (
          <div className="col-span-2 bg-white rounded-lg shadow-corporate border-2 p-12 text-center" style={{ borderColor: '#2E5AAC' }}>
            <ScaleIcon className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Precedents Yet</h3>
            <p className="text-sm text-forvis-gray-600">
              Add legal precedents to build your reference library.
            </p>
          </div>
        ) : (
          precedents.map((precedent) => (
            <div
              key={precedent.id}
              className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              style={{ borderColor: '#2E5AAC' }}
              onClick={() => setSelectedPrecedent(precedent)}
            >
              <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                <h3 className="text-sm font-bold text-white">{precedent.caseName}</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-forvis-gray-700">Citation:</span>
                  <span className="text-forvis-gray-900">{precedent.citation}</span>
                </div>
                {precedent.court && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-forvis-gray-700">Court:</span>
                    <span className="text-forvis-gray-900">{precedent.court}</span>
                  </div>
                )}
                {precedent.year && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-forvis-gray-700">Year:</span>
                    <span className="text-forvis-gray-900">{precedent.year}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-forvis-gray-200">
                  <p className="text-sm text-forvis-gray-700 line-clamp-3">{precedent.summary}</p>
                </div>
                {precedent.link && (
                  <div className="flex items-center gap-2 pt-2">
                    <LinkIcon className="w-4 h-4 text-forvis-blue-600" />
                    <a
                      href={precedent.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-forvis-blue-600 hover:text-forvis-blue-800 truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Case
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-forvis-gray-900">Add Legal Precedent</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Case Name *</label>
                <input
                  type="text"
                  value={formData.caseName}
                  onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Citation *</label>
                  <input
                    type="text"
                    value={formData.citation}
                    onChange={(e) => setFormData({ ...formData, citation: e.target.value })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Court</label>
                <input
                  type="text"
                  value={formData.court}
                  onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  placeholder="e.g., Supreme Court of Appeal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Summary *</label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm"
                  placeholder="Summarize the case..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Relevance to Opinion</label>
                <textarea
                  value={formData.relevance}
                  onChange={(e) => setFormData({ ...formData, relevance: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm"
                  placeholder="How does this case apply to your opinion?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Link</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    caseName: '',
                    citation: '',
                    court: '',
                    year: new Date().getFullYear(),
                    summary: '',
                    relevance: '',
                    link: '',
                  });
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePrecedent}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              >
                Add Precedent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPrecedent && !showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-forvis-gray-900">{selectedPrecedent.caseName}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-1">Citation</label>
                  <p className="text-sm text-forvis-gray-900">{selectedPrecedent.citation}</p>
                </div>
                {selectedPrecedent.year && (
                  <div>
                    <label className="block text-sm font-semibold text-forvis-gray-700 mb-1">Year</label>
                    <p className="text-sm text-forvis-gray-900">{selectedPrecedent.year}</p>
                  </div>
                )}
              </div>
              {selectedPrecedent.court && (
                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-1">Court</label>
                  <p className="text-sm text-forvis-gray-900">{selectedPrecedent.court}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-forvis-gray-700 mb-1">Summary</label>
                <p className="text-sm text-forvis-gray-900 whitespace-pre-wrap">{selectedPrecedent.summary}</p>
              </div>
              {selectedPrecedent.relevance && (
                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-1">Relevance to Opinion</label>
                  <p className="text-sm text-forvis-gray-900 whitespace-pre-wrap">{selectedPrecedent.relevance}</p>
                </div>
              )}
              {selectedPrecedent.link && (
                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-1">Reference Link</label>
                  <a
                    href={selectedPrecedent.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-forvis-blue-600 hover:text-forvis-blue-800 flex items-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {selectedPrecedent.link}
                  </a>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedPrecedent(null)}
                className="btn-secondary text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

