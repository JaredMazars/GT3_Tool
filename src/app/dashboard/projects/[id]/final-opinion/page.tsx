'use client';

import { useState, useEffect } from 'react';
import { useProject } from '@/hooks/projects/useProjectData';
import { OpinionDraft } from '@/types';
import { CheckCircleIcon, ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface FinalOpinionPageProps {
  params: { id: string };
}

export default function FinalOpinionPage({ params }: FinalOpinionPageProps) {
  const { data: project } = useProject(params.id);
  const [drafts, setDrafts] = useState<OpinionDraft[]>([]);
  const [finalOpinion, setFinalOpinion] = useState<OpinionDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
      const allDrafts = data.data || [];
      setDrafts(allDrafts);
      
      // Find the final opinion
      const final = allDrafts.find((d: OpinionDraft) => d.status === 'FINAL');
      setFinalOpinion(final || null);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch drafts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsFinal = async (draftId: number) => {
    try {
      const response = await fetch(`/api/projects/${params.id}/opinion-drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINAL' }),
      });
      
      if (!response.ok) throw new Error('Failed to mark as final');
      await fetchDrafts();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to mark as final');
    }
  };

  const handleExportPDF = async () => {
    if (!finalOpinion) return;
    
    try {
      const response = await fetch(`/api/projects/${params.id}/opinion-drafts/${finalOpinion.id}/export`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to export PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${finalOpinion.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to export PDF');
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
      <div>
        <h2 className="text-2xl font-bold text-forvis-gray-900">Final Opinion</h2>
        <p className="text-sm text-forvis-gray-600 mt-1">Finalize and export your tax opinion</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {finalOpinion ? (
        <div className="space-y-4">
          {/* Final Opinion Card */}
          <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
            <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                  <h3 className="text-sm font-bold text-white">Final Opinion</h3>
                </div>
                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white text-forvis-blue-900 rounded-lg transition-colors shadow-corporate"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-forvis-gray-900 mb-2">{finalOpinion.title}</h4>
                <div className="flex items-center gap-3 text-sm text-forvis-gray-600 mb-4">
                  <span>Version {finalOpinion.version}</span>
                  <span>•</span>
                  <span>Finalized on {new Date(finalOpinion.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm text-forvis-gray-800 bg-forvis-gray-50 p-6 rounded-lg border border-forvis-gray-200">
                  {finalOpinion.content}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
            <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
              <h3 className="text-sm font-bold text-white">Audit Trail</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b border-forvis-gray-200">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-forvis-gray-900">Opinion Finalized</p>
                    <p className="text-xs text-forvis-gray-600 mt-1">
                      Marked as final on {new Date(finalOpinion.updatedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-forvis-gray-600">By: {finalOpinion.createdBy}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* No Final Opinion */}
          <div className="bg-white rounded-lg shadow-corporate border-2 p-12 text-center" style={{ borderColor: '#2E5AAC' }}>
            <DocumentTextIcon className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Final Opinion Yet</h3>
            <p className="text-sm text-forvis-gray-600 mb-6">
              Select a draft to mark as final from the list below.
            </p>
          </div>

          {/* Available Drafts */}
          {drafts.length > 0 && (
            <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
              <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                <h3 className="text-sm font-bold text-white">Available Drafts ({drafts.length})</h3>
              </div>
              <div className="divide-y divide-forvis-gray-200">
                {drafts.map((draft) => (
                  <div key={draft.id} className="p-4 flex items-center justify-between hover:bg-forvis-gray-50 transition-colors">
                    <div>
                      <h4 className="text-sm font-semibold text-forvis-gray-900">{draft.title}</h4>
                      <p className="text-xs text-forvis-gray-600 mt-1">
                        Version {draft.version} • Updated {new Date(draft.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarkAsFinal(draft.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors shadow-corporate"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      Mark as Final
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

