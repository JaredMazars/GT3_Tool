'use client';

import { format } from 'date-fns';
import { TimelineColumn, TimeScale } from './types';
import { getColumnWidth } from './utils';

interface TimelineHeaderProps {
  columns: TimelineColumn[];
  scale: TimeScale;
}

export function TimelineHeader({ columns, scale }: TimelineHeaderProps) {
  const columnWidth = getColumnWidth(scale);

  return (
    <div className="flex bg-white border-b-2 border-forvis-gray-300 sticky top-0 z-20 h-14">
      {columns.map((column, index) => (
        <div
          key={index}
          className={`flex-shrink-0 px-1 flex flex-col items-center justify-center text-center border-r border-forvis-gray-200 ${
            column.isToday
              ? 'bg-forvis-blue-50 border-forvis-blue-400 border-r-2'
              : column.isWeekend
              ? 'bg-forvis-gray-50'
              : 'bg-white'
          }`}
          style={{ 
            width: `${columnWidth}px`,
            minWidth: `${columnWidth}px`
          }}
        >
          <div className={`text-xs font-semibold leading-tight ${
            column.isToday
              ? 'text-forvis-blue-700'
              : 'text-forvis-gray-700'
          }`}>
            {column.label}
          </div>
          {scale === 'day' && (
            <div className={`text-xs mt-0.5 ${
              column.isToday
                ? 'text-forvis-blue-600'
                : 'text-forvis-gray-500'
            }`}>
              {format(column.date, 'EEE')}
            </div>
          )}
          {scale === 'week' && column.yearLabel && (
            <div className={`text-xs mt-0.5 ${
              column.isToday
                ? 'text-forvis-blue-600'
                : 'text-forvis-gray-500'
            }`}>
              {column.yearLabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


