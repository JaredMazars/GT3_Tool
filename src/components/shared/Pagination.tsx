import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  // Optional metadata display
  totalItems?: number;
  itemsPerPage?: number;
  showMetadata?: boolean;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  className = '',
  totalItems,
  itemsPerPage,
  showMetadata = false,
}: PaginationProps) {
  if (totalPages <= 1 && !showMetadata) return null;

  const getVisiblePages = () => {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(page => {
        return (
          page === 1 ||
          page === totalPages ||
          (page >= currentPage - 1 && page <= currentPage + 1)
        );
      });
  };

  const visiblePages = getVisiblePages();

  // Calculate metadata if provided
  const fromItem = totalItems && itemsPerPage ? ((currentPage - 1) * itemsPerPage + 1) : null;
  const toItem = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Metadata display */}
      {showMetadata && totalItems !== undefined && fromItem !== null && toItem !== null && (
        <div className="text-sm font-normal text-forvis-gray-800">
          Showing <span className="font-medium">{fromItem}</span> to{' '}
          <span className="font-medium">{toItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            {visiblePages.map((page, index, array) => {
              const prevPage = array[index - 1];
              const showEllipsis = prevPage && page - prevPage > 1;
              
              return (
                <div key={page} className="flex items-center">
                  {showEllipsis && <span className="px-2 text-forvis-gray-500">...</span>}
                  <button
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      currentPage === page
                        ? 'bg-forvis-blue-600 text-white'
                        : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </div>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
