'use client';

/**
 * Task Details Table Component
 * 
 * Displays individual task rows
 * Columns: Client | Task | Service Line (badge) | Net WIP
 */

import { Badge } from '@/components/ui/Badge';
import type { TaskWithWIPAndServiceLine } from '@/types/api';

interface TaskDetailsTableProps {
  tasks: TaskWithWIPAndServiceLine[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper to get badge color based on service line code
const getServiceLineBadgeColor = (servLineCode: string): 'blue' | 'purple' | 'green' | 'orange' | 'gray' => {
  const code = servLineCode.toUpperCase();
  
  // Client-facing service lines
  if (code.includes('TAX')) return 'blue';
  if (code.includes('AUDIT')) return 'green';
  if (code.includes('ACCOUNT') || code.includes('ACCT')) return 'purple';
  if (code.includes('ADVISORY') || code.includes('CONSULT')) return 'orange';
  
  // Shared services (gray)
  return 'gray';
};

export function TaskDetailsTable({ tasks }: TaskDetailsTableProps) {
  // Sort tasks by client code then task code
  const sortedTasks = [...tasks].sort((a, b) => {
    const clientCompare = a.clientCode.localeCompare(b.clientCode);
    if (clientCompare !== 0) return clientCompare;
    return a.TaskCode.localeCompare(b.TaskCode);
  });

  if (sortedTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-forvis-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No tasks found</h3>
        <p className="mt-1 text-sm text-forvis-gray-500">
          No tasks match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        {/* Table Header */}
        <div
          className="grid gap-4 py-3 px-4 text-sm font-semibold text-white shadow-corporate"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            gridTemplateColumns: '2fr 3fr 160px 180px',
          }}
        >
          <div>Client</div>
          <div>Task</div>
          <div className="min-w-[120px]">Service Line</div>
          <div className="text-right min-w-[150px]">Net WIP Balance</div>
        </div>

        {/* Table Body */}
        <div className="bg-white">
          {sortedTasks.map((task, index) => (
            <div
              key={task.id}
              className={`grid gap-4 py-3 px-4 text-sm transition-colors duration-200 hover:bg-forvis-blue-50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
              }`}
              style={{ gridTemplateColumns: '2fr 3fr 160px 180px' }}
            >
              <div className="text-forvis-gray-900">
                <span className="font-medium">{task.clientCode}</span>
                {' - '}
                {task.clientNameFull || 'Unnamed Client'}
              </div>
              <div className="text-forvis-gray-900">
                <span className="font-medium">{task.TaskCode}</span>
                {' - '}
                {task.TaskDesc}
              </div>
              <div className="min-w-[120px]">
                <Badge color={getServiceLineBadgeColor(task.servLineCode)}>
                  {task.serviceLineName}
                </Badge>
              </div>
              <div className="text-right min-w-[150px]">
                <span
                  className={`font-semibold tabular-nums ${
                    task.netWip < 0 ? 'text-red-600' : 'text-forvis-blue-600'
                  }`}
                >
                  {formatCurrency(task.netWip)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

