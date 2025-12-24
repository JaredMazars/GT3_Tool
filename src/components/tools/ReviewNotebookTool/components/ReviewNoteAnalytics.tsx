/**
 * Review Note Analytics Component
 * Displays analytics and metrics for review notes
 */

'use client';

import { useReviewNoteAnalytics } from '../hooks/useReviewNotes';
import { LoadingSpinner } from '@/components/ui';
import { BarChart3, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface ReviewNoteAnalyticsProps {
  taskId: number;
}

export default function ReviewNoteAnalytics({ taskId }: ReviewNoteAnalyticsProps) {
  const { data, isLoading, error } = useReviewNoteAnalytics(taskId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-6">
        Failed to load analytics. Please try again.
      </div>
    );
  }

  if (!data) {
    return <div className="text-center p-6">No analytics data available.</div>;
  }

  const { summary, byCategory, byAssignee } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                Total Notes
              </p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{summary.total}</p>
            </div>
            <div
              className="rounded-full p-2.5"
              style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div
          className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                Open
              </p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                {summary.byStatus.OPEN + summary.byStatus.IN_PROGRESS}
              </p>
            </div>
            <div
              className="rounded-full p-2.5"
              style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div
          className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                Overdue
              </p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{summary.overdue}</p>
            </div>
            <div
              className="rounded-full p-2.5"
              style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
            >
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div
          className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                Avg Resolution
              </p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                {summary.averageResolutionTimeHours
                  ? `${summary.averageResolutionTimeHours}h`
                  : 'N/A'}
              </p>
            </div>
            <div
              className="rounded-full p-2.5"
              style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
            >
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* By Category */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-lg shadow-corporate p-6">
          <h4 className="text-lg font-semibold text-forvis-gray-900 mb-4">Notes by Category</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-forvis-gray-200 table-fixed">
              <thead>
                <tr className="bg-forvis-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-600 uppercase w-2/3">
                    Category
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-forvis-gray-600 uppercase w-24">
                    Total
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-forvis-gray-600 uppercase w-24">
                    Open
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-forvis-gray-600 uppercase w-24">
                    Cleared
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forvis-gray-200">
                {byCategory.map((category: { categoryId: number | null; categoryName: string; total: number; open: number; cleared: number }) => (
                  <tr key={category.categoryId || 'uncategorized'} className="hover:bg-forvis-gray-50">
                    <td className="px-4 py-2 text-sm text-forvis-gray-900 truncate">{category.categoryName}</td>
                    <td className="px-4 py-2 text-sm text-center text-forvis-gray-700 tabular-nums">
                      {category.total}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-forvis-gray-700 tabular-nums">
                      {category.open}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-forvis-gray-700 tabular-nums">
                      {category.cleared}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Assignee */}
      {byAssignee.length > 0 && (
        <div className="bg-white rounded-lg shadow-corporate p-6">
          <h4 className="text-lg font-semibold text-forvis-gray-900 mb-4">Notes by Assignee</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-forvis-gray-200 table-fixed">
              <thead>
                <tr className="bg-forvis-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-600 uppercase w-2/3">
                    Assignee
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-forvis-gray-600 uppercase w-24">
                    Total
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-forvis-gray-600 uppercase w-24">
                    Open
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-forvis-gray-600 uppercase w-24">
                    Cleared
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forvis-gray-200">
                {byAssignee.map((assignee: { userId: string; userName: string; open: number; inProgress: number; addressed: number; cleared: number; total: number }) => (
                  <tr key={assignee.userId} className="hover:bg-forvis-gray-50">
                    <td className="px-4 py-2 text-sm text-forvis-gray-900 truncate">{assignee.userName}</td>
                    <td className="px-4 py-2 text-sm text-center text-forvis-gray-700 tabular-nums">
                      {assignee.total}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-forvis-gray-700 tabular-nums">
                      {assignee.open + assignee.inProgress}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-forvis-gray-700 tabular-nums">
                      {assignee.cleared}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

