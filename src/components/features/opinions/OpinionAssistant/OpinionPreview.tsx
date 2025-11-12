'use client';

import { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { OpinionSection } from '@/types';

interface OpinionPreviewProps {
  projectId: number;
  draftId: number;
  draftTitle: string;
}

export default function OpinionPreview({
  projectId,
  draftId,
  draftTitle,
}: OpinionPreviewProps) {
  const [sections, setSections] = useState<OpinionSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/export`,
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
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportToWord = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/export`,
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
      console.error('Error exporting Word:', error);
      alert('Failed to export Word document');
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
            <DocumentTextIcon className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b-2 border-forvis-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-forvis-gray-900">Opinion Preview</h3>
            <p className="text-sm text-forvis-gray-600">
              Preview and export your completed opinion
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-forvis-blue-600 text-forvis-blue-700 rounded-lg hover:bg-forvis-blue-50 transition-colors disabled:opacity-50 text-sm font-semibold"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export PDF
            </button>
            <button
              onClick={exportToWord}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-700 text-white rounded-lg hover:from-forvis-blue-600 hover:to-forvis-blue-800 transition-all disabled:opacity-50 text-sm font-semibold"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
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
                  <div className="text-forvis-gray-800 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
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
        </div>
      </div>
    </div>
  );
}

