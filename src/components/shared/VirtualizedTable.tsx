'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (item: T) => string | number;
  estimateSize?: number;
  overscan?: number;
  className?: string;
}

/**
 * Virtualized table component for rendering large datasets efficiently
 * Only renders visible rows in the viewport
 */
export function VirtualizedTable<T>({
  data,
  columns,
  getRowKey,
  estimateSize = 73, // Estimated row height in pixels
  overscan = 5, // Number of items to render outside viewport
  className = '',
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        {/* Table Header */}
        <table className="w-full divide-y divide-forvis-gray-200" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={col.width ? { width: col.width } : undefined} />
            ))}
          </colgroup>
          <thead className="bg-forvis-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-3 py-2 text-xs font-medium text-forvis-gray-500 uppercase tracking-wider ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>

        {/* Virtualized Table Body */}
        <div
          ref={parentRef}
          style={{
            height: `600px`, // Fixed height for virtualization
            overflow: 'auto',
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            <table className="w-full divide-y divide-forvis-gray-200" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                {columns.map((col) => (
                  <col key={col.key} style={col.width ? { width: col.width } : undefined} />
                ))}
              </colgroup>
              <tbody className="bg-white divide-y divide-forvis-gray-200">
                {virtualItems.map((virtualRow) => {
                  const item = data[virtualRow.index];
                  if (!item) return null;
                  
                  return (
                    <tr
                      key={getRowKey(item)}
                      className="hover:bg-forvis-gray-50 transition-colors"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-3 py-2 ${
                            col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                          }`}
                        >
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-forvis-gray-50 border-t border-forvis-gray-200">
        <div className="text-sm text-forvis-gray-700">
          Showing <span className="font-medium">{data.length}</span> items
          {(() => {
            const firstItem = virtualItems[0];
            const lastItem = virtualItems[virtualItems.length - 1];
            if (!firstItem || !lastItem) return null;
            
            return (
              <>
                {' '}
                (rendering{' '}
                <span className="font-medium">
                  {firstItem.index + 1}-{Math.min(lastItem.index + 1, data.length)}
                </span>
                )
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

