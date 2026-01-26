'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface NewAdjustmentProps {
  params: { id: string };
}

export default function NewAdjustmentPage({ params }: NewAdjustmentProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'DEBIT',
    description: '',
    amount: 0,
    sarsSection: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || formData.amount === 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch(
        `/api/tasks/${params.id}/tax-adjustments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            status: 'APPROVED', // Custom adjustments start as approved
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create adjustment');
      }

      const result = await response.json();
      const createdAdjustment = result.success ? result.data : result;
      router.push(`/dashboard/tasks/${params.id}/tax-calculation/adjustments/${createdAdjustment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create adjustment');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-forvis-blue-600 hover:text-forvis-blue-800 mb-2 flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: '#2E5AAC' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tax Calculation
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Custom Tax Adjustment
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Add a custom tax adjustment to your calculation
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-corporate">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white border-2 rounded-lg shadow-corporate" style={{ borderColor: '#5B93D7' }}>
        {/* Form Header */}
        <div 
          className="p-5 border-b-2 rounded-t-lg"
          style={{ 
            background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)',
            borderColor: '#2E5AAC'
          }}
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Adjustment Details
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Type <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2.5 bg-white text-gray-900 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all shadow-sm focus:shadow-corporate"
              style={{ 
                borderColor: '#E5E7EB',
                '--tw-ring-color': '#2E5AAC'
              } as any}
              required
            >
              <option value="DEBIT">Debit (Add Back to Income)</option>
              <option value="CREDIT">Credit (Deduct from Income)</option>
              <option value="ALLOWANCE">Allowance</option>
              <option value="RECOUPMENT">Recoupment</option>
            </select>
            <p className="mt-2 text-xs text-gray-600 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2E5AAC' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {formData.type === 'DEBIT' && 'Increases taxable income (e.g., non-deductible expenses)'}
                {formData.type === 'CREDIT' && 'Decreases taxable income (e.g., capital allowances)'}
                {formData.type === 'ALLOWANCE' && 'Special allowances deductible from income'}
                {formData.type === 'RECOUPMENT' && 'Recoupments or prior year allowances'}
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="e.g., Non-deductible entertainment expenses"
              className="w-full px-4 py-2.5 bg-white text-gray-900 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all shadow-sm focus:shadow-corporate"
              style={{ 
                borderColor: '#E5E7EB',
                '--tw-ring-color': '#2E5AAC'
              } as any}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Amount (R) <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-600 font-semibold">R</span>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 bg-white text-gray-900 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all shadow-sm focus:shadow-corporate"
                style={{ 
                  borderColor: '#E5E7EB',
                  '--tw-ring-color': '#2E5AAC'
                } as any}
                required
              />
            </div>
            <p className="mt-2 text-xs text-gray-600 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2E5AAC' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Enter the absolute value. The sign will be determined by the type.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              SARS Section <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.sarsSection}
              onChange={(e) => setFormData({ ...formData, sarsSection: e.target.value })}
              placeholder="e.g., s23(g), s11(e), s12C"
              className="w-full px-4 py-2.5 bg-white text-gray-900 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all shadow-sm focus:shadow-corporate"
              style={{ 
                borderColor: '#E5E7EB',
                '--tw-ring-color': '#2E5AAC'
              } as any}
            />
            <p className="mt-2 text-xs text-gray-600">
              Reference the relevant section of the Income Tax Act
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Notes / Reasoning <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Explain the reason for this adjustment and how it was calculated..."
              className="w-full px-4 py-2.5 bg-white text-gray-900 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all shadow-sm focus:shadow-corporate"
              style={{ 
                borderColor: '#E5E7EB',
                '--tw-ring-color': '#2E5AAC'
              } as any}
            />
          </div>

          <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-6 py-3 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-corporate hover:shadow-corporate-lg flex items-center justify-center gap-2"
              style={{ background: isCreating ? '#9CA3AF' : 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Adjustment
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isCreating}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-semibold shadow-sm hover:shadow-corporate disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Help Card */}
      <div className="bg-white border-2 rounded-lg shadow-corporate" style={{ borderColor: '#5B93D7' }}>
        {/* Help Header */}
        <div 
          className="p-4 border-b-2 rounded-t-lg"
          style={{ 
            background: 'linear-gradient(to right, #EFF6FF, #DBEAFE)',
            borderColor: '#93C5FD'
          }}
        >
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: '#1C3667' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2E5AAC' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Common Adjustment Examples
          </h2>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div className="bg-orange-50 border-l-4 rounded-r-lg p-4 shadow-sm" style={{ borderColor: '#D97706' }}>
            <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#D97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Debit Adjustments (Add Back):
            </p>
            <ul className="space-y-1.5 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">•</span>
                <span className="text-gray-700">Depreciation (s11(e)) - Add back accounting depreciation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">•</span>
                <span className="text-gray-700">Entertainment expenses (s23(b)) - Non-deductible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">•</span>
                <span className="text-gray-700">Fines and penalties (s23(o)) - Non-deductible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">•</span>
                <span className="text-gray-700">Donations exceeding 10% limit (s18A)</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border-l-4 rounded-r-lg p-4 shadow-sm" style={{ borderColor: '#059669' }}>
            <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#059669' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Credit Adjustments (Deduct):
            </p>
            <ul className="space-y-1.5 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span className="text-gray-700">Capital allowances (s11-13) - Tax depreciation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span className="text-gray-700">Doubtful debt allowance (s11(j))</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span className="text-gray-700">R&D deduction (s11D)</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border-l-4 rounded-r-lg p-4 shadow-sm" style={{ borderColor: '#2E5AAC' }}>
            <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Allowances / Recoupments:
            </p>
            <ul className="space-y-1.5 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span className="text-gray-700">s24C allowance recoupment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span className="text-gray-700">Prior year doubtful debt recovered</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
