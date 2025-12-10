'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle,
  Clock,
  UserIcon,
} from 'lucide-react';
import { OpinionSection, OpinionDraft } from '@/types';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { AlertModal } from '@/components/shared/AlertModal';

interface OpinionPreviewProps {
  taskId: number;
  draftId: number;
  draftTitle: string;
}

export default function OpinionPreview({
  taskId,
  draftId,
  draftTitle,
}: OpinionPreviewProps) {
  const [sections, setSections] = useState<OpinionSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draft, setDraft] = useState<OpinionDraft | null>(null);
  const [showMarkFinalModal, setShowMarkFinalModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  useEffect(() => {
    fetchSections();
    fetchDraft();
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
      // Failed to fetch sections
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDraft = async () => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}`
      );
      if (!response.ok) throw new Error('Failed to fetch draft');
      const data = await response.json();
      setDraft(data.data);
    } catch (error) {
      // Failed to fetch draft
    }
  };

  const handleMarkAsFinal = async () => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'FINAL' }),
        }
      );

      if (!response.ok) throw new Error('Failed to mark as final');
      
      await fetchDraft();
      setShowMarkFinalModal(false);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to mark as final. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleMarkAsUnderReview = async () => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'UNDER_REVIEW' }),
        }
      );

      if (!response.ok) throw new Error('Failed to mark as under review');
      
      await fetchDraft();
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to mark as under review. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'pdf' }),
        }
      );

      if (!response.ok) throw new Error('Failed to export PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draftTitle.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Export Failed',
        message: 'Failed to export PDF. Please try again.',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToWord = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'docx' }),
        }
      );

      if (!response.ok) throw new Error('Failed to export Word document');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draftTitle.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Export Failed',
        message: 'Failed to export Word document. Please try again.',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white border-b-2 border-forvis-blue-600 px-6 py-4">
          <h3 className="text-lg font-bold text-forvis-gray-900">Opinion Preview</h3>
          <p className="text-sm text-forvis-gray-600">
            Preview and export your completed opinion
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-forvis-gray-900 mb-2">
              No Sections Available
            </h4>
            <p className="text-sm text-forvis-gray-600">
              Generate sections in the "Sections" tab to preview the opinion
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', label: 'Draft' },
      UNDER_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: 'Under Review' },
      FINAL: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: 'Final' },
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b-2 border-forvis-blue-600 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-forvis-gray-900">Opinion Preview</h3>
              <p className="text-sm text-forvis-gray-600">
                Preview and export your completed opinion
              </p>
            </div>
            {draft && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(draft.status).bg} ${getStatusBadge(draft.status).text} ${getStatusBadge(draft.status).border}`}>
                {draft.status === 'FINAL' && <CheckCircle className="w-4 h-4 mr-1" />}
                {getStatusBadge(draft.status).label}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {draft && draft.status !== 'FINAL' && (
              <>
                {draft.status === 'DRAFT' && (
                  <button
                    onClick={handleMarkAsUnderReview}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border-2 border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    <Clock className="w-5 h-5" />
                    Mark for Review
                  </button>
                )}
                <button
                  onClick={() => setShowMarkFinalModal(true)}
                  disabled={isUpdatingStatus}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Final
                </button>
              </>
            )}
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-forvis-blue-600 text-forvis-blue-700 rounded-lg hover:bg-forvis-blue-50 transition-colors disabled:opacity-50 text-sm font-semibold"
            >
              <Download className="w-5 h-5" />
              Export PDF
            </button>
            <button
              onClick={exportToWord}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-700 text-white rounded-lg hover:from-forvis-blue-600 hover:to-forvis-blue-800 transition-all disabled:opacity-50 text-sm font-semibold"
            >
              <Download className="w-5 h-5" />
              Export Word
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto bg-forvis-gray-100 px-6 py-6">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-12">
          {/* Title */}
          <div className="text-center border-b-2 border-forvis-gray-300 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-forvis-gray-900 mb-2">
              TAX OPINION
            </h1>
            <h2 className="text-xl font-semibold text-forvis-gray-700">
              {draftTitle}
            </h2>
          </div>

          {/* Table of Contents */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-forvis-gray-900 mb-4 uppercase tracking-wide">
              Table of Contents
            </h3>
            <div className="space-y-2">
              {sections.map((section, index) => (
                <div key={section.id} className="flex justify-between text-sm">
                  <span className="text-forvis-gray-700">
                    {index + 1}. {section.title}
                  </span>
                  <span className="text-forvis-gray-500">...</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={section.id} className="border-t-2 border-forvis-gray-200 pt-6">
                <h3 className="text-xl font-bold text-forvis-gray-900 mb-4 uppercase tracking-wide">
                  {index + 1}. {section.title}
                </h3>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={section.content} className="text-forvis-gray-800 leading-relaxed" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t-2 border-forvis-gray-300">
            <p className="text-sm text-forvis-gray-600 text-center">
              Generated on {new Date().toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Audit Trail - Only show if status is FINAL */}
          {draft && draft.status === 'FINAL' && (
            <div className="mt-8 pt-6 border-t-2 border-forvis-gray-300">
              <h3 className="text-lg font-bold text-forvis-gray-900 mb-4">Audit Trail</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-forvis-gray-900">Opinion Finalized</p>
                    <p className="text-xs text-forvis-gray-600 mt-1">
                      Marked as final on {new Date(draft.updatedAt).toLocaleString('en-ZA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {draft.createdBy && (
                      <p className="text-xs text-forvis-gray-600 mt-1 flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        By: {draft.createdBy}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-forvis-gray-900">Version Information</p>
                    <p className="text-xs text-forvis-gray-600 mt-1">
                      Version {draft.version} • Created on {new Date(draft.createdAt).toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mark as Final Confirmation Modal */}
      {showMarkFinalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-forvis-gray-900">
                    Mark as Final Opinion
                  </h3>
                  <p className="text-sm text-forvis-gray-600 mt-1">
                    Are you sure you want to finalize this opinion?
                  </p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Once marked as final, this opinion will be locked. 
                  You won't be able to edit sections or change the content. 
                  Make sure all sections are complete and reviewed.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMarkFinalModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-forvis-gray-700 bg-forvis-gray-100 rounded-lg hover:bg-forvis-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsFinal}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Processing...' : 'Mark as Final'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </div>
  );
}

