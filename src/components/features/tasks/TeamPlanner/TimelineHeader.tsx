'use client';

import { format } from 'date-fns';
import { TimelineColumn, TimeScale, ResourceData } from './types';
import { getColumnWidth, calculateDailyUtilization, getUtilizationColor } from './utils';

interface TimelineHeaderProps {
  columns: TimelineColumn[];
  scale: TimeScale;
  resources?: ResourceData[];
}

export function TimelineHeader({ columns, scale, resources = [] }: TimelineHeaderProps) {
  const columnWidth = getColumnWidth(scale);

  return (
    <div className="flex bg-white border-b-2 border-forvis-gray-300 sticky top-0 z-20 h-14">
      {columns.map((column, index) => {
        // Calculate daily utilization for this date
        const utilizationPercentage = calculateDailyUtilization(column.date, resources);
        const utilizationColor = getUtilizationColor(utilizationPercentage);

        return (
          <div
            key={index}
            className={`relative flex-shrink-0 px-0.5 flex flex-col items-center justify-center text-center border-r border-forvis-gray-200 ${
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
            title={utilizationPercentage > 0 ? `${utilizationPercentage.toFixed(1)}% utilized` : undefined}
          >
            {/* Utilization fill layer (bottom-to-top gradient) */}
            {utilizationPercentage > 0 && (
              <div 
                className="absolute bottom-0 left-0 right-0 pointer-events-none"
                style={{
                  height: `${Math.min(Math.max(utilizationPercentage, 0), 100)}%`,
                  background: utilizationColor,
                  opacity: 0.5,
                  transition: 'height 0.2s ease-in-out',
                  zIndex: 0
                }}
              />
            )}
            
            {/* Content layer */}
            <div className="relative z-10">
              <div className={`text-[10px] font-semibold leading-tight ${
                column.isToday
                  ? 'text-forvis-blue-700'
                  : 'text-forvis-gray-700'
              }`}>
                {column.label}
              </div>
              {scale === 'day' && (
                <div className={`text-[10px] mt-0.5 ${
                  column.isToday
                    ? 'text-forvis-blue-600'
                    : 'text-forvis-gray-500'
                }`}>
                  {format(column.date, 'EEE')}
                </div>
              )}
              {scale === 'week' && column.yearLabel && (
                <div className={`text-[10px] mt-0.5 ${
                  column.isToday
                    ? 'text-forvis-blue-600'
                    : 'text-forvis-gray-500'
                }`}>
                  {column.yearLabel}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


