'use client';

import { useState, useEffect } from 'react';

interface OfficeCode {
  code: string;
  count: number;
}

interface OfficeCodeSelectorProps {
  value?: string;
  onChange: (code: string) => void;
  required?: boolean;
}

export function OfficeCodeSelector({ value, onChange, required = false }: OfficeCodeSelectorProps) {
  const [officeCodes, setOfficeCodes] = useState<OfficeCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);

  useEffect(() => {
    fetchOfficeCodes();
  }, []);

  const fetchOfficeCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/office-codes');
      const data = await response.json();
      
      if (data.success) {
        setOfficeCodes(data.data || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to load office codes');
      }
    } catch (err) {
      setError('Failed to fetch office codes');
      console.error('Error fetching office codes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Office Code {required && <span className="text-red-500">*</span>}
        </label>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Office Code {required && <span className="text-red-500">*</span>}
      </label>
      
      {error && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-xs text-yellow-700">{error} - Manual entry enabled</p>
        </div>
      )}

      <div className="space-y-2">
        {!isManualEntry && officeCodes.length > 0 ? (
          <>
            <select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
              required={required}
            >
              <option value="">Select office code...</option>
              {officeCodes.map((office) => (
                <option key={office.code} value={office.code}>
                  {office.code} ({office.count} tasks)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsManualEntry(true)}
              className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700"
            >
              Enter code manually
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="Enter office code"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 uppercase"
              required={required}
            />
            {officeCodes.length > 0 && (
              <button
                type="button"
                onClick={() => setIsManualEntry(false)}
                className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700"
              >
                Choose from list
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
