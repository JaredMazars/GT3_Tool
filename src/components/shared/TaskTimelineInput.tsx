'use client';

import { ServiceLine } from '@/types';

interface TaskTimelineInputProps {
  serviceLine: ServiceLine | string;
  taxYear?: number | null;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  assessmentYear?: string | null;
  submissionDeadline?: Date | null;
  onChange: (field: string, value: number | string | Date | null) => void;
}

export function TaskTimelineInput({
  serviceLine,
  taxYear,
  taxPeriodStart,
  taxPeriodEnd,
  assessmentYear,
  submissionDeadline,
  onChange,
}: TaskTimelineInputProps) {
  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0] || '';
  };

  const isTaxServiceLine = serviceLine === ServiceLine.TAX;

  // Get labels based on service line
  const labels = {
    year: isTaxServiceLine ? 'Tax Year' : 'Financial Year',
    yearPlaceholder: isTaxServiceLine ? 'e.g., 2024' : 'e.g., 2024',
    assessmentYear: isTaxServiceLine ? 'Assessment Year' : 'Reporting Period',
    assessmentYearPlaceholder: isTaxServiceLine ? 'e.g., 2024/2025' : 'e.g., FY 2024',
    periodStart: isTaxServiceLine ? 'Tax Period Start' : 'Period Start Date',
    periodEnd: isTaxServiceLine ? 'Tax Period End' : 'Period End Date',
    deadline: isTaxServiceLine ? 'Submission Deadline' : 'Completion Deadline',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="taxYear" className="block text-sm font-medium text-gray-700 mb-1">
            {labels.year}
          </label>
          <input
            type="number"
            id="taxYear"
            value={taxYear || ''}
            onChange={(e) => onChange('taxYear', e.target.value ? parseInt(e.target.value) : null)}
            placeholder={labels.yearPlaceholder}
            min="2000"
            max="2100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="assessmentYear" className="block text-sm font-medium text-gray-700 mb-1">
            {labels.assessmentYear}
          </label>
          <input
            type="text"
            id="assessmentYear"
            value={assessmentYear || ''}
            onChange={(e) => onChange('assessmentYear', e.target.value || null)}
            placeholder={labels.assessmentYearPlaceholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="taxPeriodStart" className="block text-sm font-medium text-gray-700 mb-1">
            {labels.periodStart}
          </label>
          <input
            type="date"
            id="taxPeriodStart"
            value={formatDateForInput(taxPeriodStart)}
            onChange={(e) => onChange('taxPeriodStart', e.target.value ? new Date(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="taxPeriodEnd" className="block text-sm font-medium text-gray-700 mb-1">
            {labels.periodEnd}
          </label>
          <input
            type="date"
            id="taxPeriodEnd"
            value={formatDateForInput(taxPeriodEnd)}
            onChange={(e) => onChange('taxPeriodEnd', e.target.value ? new Date(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="submissionDeadline" className="block text-sm font-medium text-gray-700 mb-1">
          {labels.deadline}
        </label>
        <input
          type="date"
          id="submissionDeadline"
          value={formatDateForInput(submissionDeadline)}
          onChange={(e) => onChange('submissionDeadline', e.target.value ? new Date(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {!isTaxServiceLine && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> These fields are optional but help with task planning and tracking.
          </p>
        </div>
      )}
    </div>
  );
}










































