'use client';

import { KanbanMetricsProps } from './types';

export function KanbanMetrics({ metrics, myTasksOnly = false }: KanbanMetricsProps) {
  const hasPartialLoad = metrics.loaded !== undefined && metrics.loaded < metrics.count;
  
  return (
    <div className="space-y-2 text-xs">
      {/* Task Count */}
      <div className="flex items-center justify-between">
        <span className="text-white opacity-90">Tasks</span>
        <div className="flex flex-col items-end">
          <span className="font-semibold text-white">{metrics.count}</span>
          {!myTasksOnly && hasPartialLoad && (
            <span className="text-white opacity-75 text-[10px]">
              (showing {metrics.loaded})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}




