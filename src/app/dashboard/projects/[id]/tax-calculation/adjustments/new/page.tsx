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
        `/api/projects/${params.id}/tax-adjustments`,
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
      router.push(`/dashboard/projects/${params.id}/tax-calculation/adjustments/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create adjustment');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Create Custom Tax Adjustment
        </h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="DEBIT">Debit (Add Back to Income)</option>
              <option value="CREDIT">Credit (Deduct from Income)</option>
              <option value="ALLOWANCE">Allowance / Recoupment</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {formData.type === 'DEBIT' && 'Increases taxable income (e.g., non-deductible expenses)'}
              {formData.type === 'CREDIT' && 'Decreases taxable income (e.g., capital allowances)'}
              {formData.type === 'ALLOWANCE' && 'Recoupments or prior year allowances'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="e.g., Non-deductible entertainment expenses"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (R) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the absolute value. The sign will be determined by the type.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SARS Section
            </label>
            <input
              type="text"
              value={formData.sarsSection}
              onChange={(e) => setFormData({ ...formData, sarsSection: e.target.value })}
              placeholder="e.g., s23(g), s11(e), s12C"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Reference the relevant section of the Income Tax Act
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes / Reasoning
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Explain the reason for this adjustment and how it was calculated..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isCreating ? 'Creating...' : 'Create Adjustment'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Help Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Common Adjustment Examples
          </h2>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <p className="font-semibold">Debit Adjustments (Add Back):</p>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Depreciation (s11(e)) - Add back accounting depreciation</li>
                <li>Entertainment expenses (s23(b)) - Non-deductible</li>
                <li>Fines and penalties (s23(o)) - Non-deductible</li>
                <li>Donations exceeding 10% limit (s18A)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Credit Adjustments (Deduct):</p>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Capital allowances (s11-13) - Tax depreciation</li>
                <li>Doubtful debt allowance (s11(j))</li>
                <li>R&D deduction (s11D)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Allowances / Recoupments:</p>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>s24C allowance recoupment</li>
                <li>Prior year doubtful debt recovered</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


