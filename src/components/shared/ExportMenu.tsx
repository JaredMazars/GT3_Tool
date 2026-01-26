'use client';

import { useState } from 'react';
import { AlertModal } from '@/components/shared/AlertModal';

interface ExportMenuProps {
  taskId: number;
}

export default function ExportMenu({ taskId }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = async (format: 'excel' | 'pdf' | 'xml') => {
    try {
      setIsExporting(true);
      setIsOpen(false);

      const response = await fetch(
        `/api/tasks/${taskId}/tax-calculation/export?format=${format}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `tax-computation-${taskId}.${format}`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          fileName = matches[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Export failed. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="px-5 py-2.5 text-sm font-semibold bg-white text-forvis-blue-900 rounded-lg hover:bg-forvis-blue-50 transition-colors disabled:bg-forvis-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-corporate hover:shadow-corporate-md border-2 border-forvis-blue-300 whitespace-nowrap"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-forvis-blue-600"></div>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && !isExporting && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-corporate-lg border-2 border-forvis-blue-300 z-20">
            <div className="py-2">
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-3 hover:bg-forvis-blue-50 flex items-center gap-3 transition-colors"
              >
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-forvis-gray-900">Excel Workbook</p>
                  <p className="text-xs text-forvis-gray-600">Multi-sheet with formulas</p>
                </div>
              </button>

              <button
                onClick={() => handleExport('pdf')}
                disabled={true}
                className="w-full text-left px-4 py-3 hover:bg-forvis-gray-50 flex items-center gap-3 opacity-50 cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-forvis-gray-900">PDF Document</p>
                  <p className="text-xs text-forvis-gray-600">Coming soon</p>
                </div>
              </button>

              <button
                onClick={() => handleExport('xml')}
                disabled={true}
                className="w-full text-left px-4 py-3 hover:bg-forvis-gray-50 flex items-center gap-3 opacity-50 cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-forvis-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-forvis-gray-900">eFiling XML</p>
                  <p className="text-xs text-forvis-gray-600">Coming soon</p>
                </div>
              </button>
            </div>
          </div>
        </>
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


