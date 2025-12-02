'use client';

interface TaxYearInputProps {
  taxYear?: number | null;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  assessmentYear?: string | null;
  submissionDeadline?: Date | null;
  onChange: (field: string, value: number | string | Date | null) => void;
}

export function TaxYearInput({
  taxYear,
  taxPeriodStart,
  taxPeriodEnd,
  assessmentYear,
  submissionDeadline,
  onChange,
}: TaxYearInputProps) {
  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0] || '';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="taxYear" className="block text-sm font-medium text-gray-700 mb-1">
            Tax Year
          </label>
          <input
            type="number"
            id="taxYear"
            value={taxYear || ''}
            onChange={(e) => onChange('taxYear', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="e.g., 2024"
            min="2000"
            max="2100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="assessmentYear" className="block text-sm font-medium text-gray-700 mb-1">
            Assessment Year
          </label>
          <input
            type="text"
            id="assessmentYear"
            value={assessmentYear || ''}
            onChange={(e) => onChange('assessmentYear', e.target.value || null)}
            placeholder="e.g., 2024/2025"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="taxPeriodStart" className="block text-sm font-medium text-gray-700 mb-1">
            Tax Period Start
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
            Tax Period End
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
          Submission Deadline
        </label>
        <input
          type="date"
          id="submissionDeadline"
          value={formatDateForInput(submissionDeadline)}
          onChange={(e) => onChange('submissionDeadline', e.target.value ? new Date(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}





