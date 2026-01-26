'use client';

import { Fragment } from 'react';
import { AlertTriangle, X, BarChart3, Calendar } from 'lucide-react';

interface AffectedRating {
  id: number;
  ratingGrade: string;
  ratingScore: number;
  ratingDate: Date | string;
  confidence?: number;
}

interface DeleteDocumentWithRatingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentName: string;
  affectedRatings: AffectedRating[];
  isDeleting: boolean;
}

export function DeleteDocumentWithRatingsModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
  affectedRatings,
  isDeleting,
}: DeleteDocumentWithRatingsModalProps) {
  if (!isOpen) return null;

  const getRatingColor = (grade: string) => {
    switch (grade) {
      case 'AAA':
      case 'AA':
        return 'bg-green-100 text-green-800';
      case 'A':
        return 'bg-blue-100 text-blue-800';
      case 'BBB':
        return 'bg-yellow-100 text-yellow-800';
      case 'BB':
      case 'B':
        return 'bg-orange-100 text-orange-800';
      case 'CCC':
      case 'D':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-forvis-gray-100 text-forvis-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">Delete Document & Credit Ratings</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="text-white hover:text-forvis-gray-200 transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Warning Message */}
          <div
            className="rounded-lg p-4 mb-5 border-2"
            style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', borderColor: '#F59E0B' }}
          >
            <p className="text-sm font-semibold text-yellow-900">
              This document is being used in {affectedRatings.length} credit rating{affectedRatings.length !== 1 ? 's' : ''}.
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              To delete this document, you must first delete all credit ratings that reference it.
            </p>
          </div>

          {/* Document Info */}
          <div className="mb-4">
            <p className="text-sm text-forvis-gray-700">
              <span className="font-semibold">Document:</span> {documentName}
            </p>
          </div>

          {/* Affected Ratings List */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-forvis-gray-900 mb-3">
              Affected Credit Ratings ({affectedRatings.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {affectedRatings.map((rating) => (
                <div
                  key={rating.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-forvis-gray-200 bg-forvis-gray-50"
                >
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getRatingColor(rating.ratingGrade)}`}>
                      {rating.ratingGrade}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-forvis-gray-900">
                      <BarChart3 className="h-4 w-4 text-forvis-gray-600" />
                      <span className="font-semibold">Score: {rating.ratingScore}/100</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-forvis-gray-600 mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(rating.ratingDate).toLocaleDateString()}
                      </span>
                      {rating.confidence !== undefined && (
                        <span className="ml-2">
                          • Confidence: {(rating.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation Message */}
          <div
            className="rounded-lg p-4 border-2"
            style={{ background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', borderColor: '#EF4444' }}
          >
            <p className="text-sm font-semibold text-red-900">
              Are you sure you want to delete {affectedRatings.length} rating{affectedRatings.length !== 1 ? 's' : ''} and this document?
            </p>
            <p className="text-sm text-red-800 mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                Delete All & Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

