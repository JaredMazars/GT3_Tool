/**
 * BD Opportunity Form Component
 * For creating and editing opportunities
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import type { CreateBDOpportunityInput } from '@/lib/validation/schemas';
import { useCompanyResearch } from '@/hooks/bd/useCompanyResearch';
import { CompanyResearchModal } from './CompanyResearchModal';
import type { CompanyResearchResult } from '@/lib/services/bd/companyResearchAgent';

interface OpportunityFormProps {
  initialData?: Partial<CreateBDOpportunityInput>;
  stages: Array<{ id: number; name: string; color: string | null }>;
  onSubmit: (data: CreateBDOpportunityInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OpportunityForm({
  initialData,
  stages,
  onSubmit,
  onCancel,
  isLoading,
}: OpportunityFormProps) {
  const [opportunityType, setOpportunityType] = useState<'current' | 'prospect'>(
    initialData?.GSClientID ? 'current' : 'prospect'
  );
  const [formData, setFormData] = useState<Partial<CreateBDOpportunityInput>>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    GSClientID: initialData?.GSClientID,
    companyName: initialData?.companyName || '',
    serviceLine: initialData?.serviceLine || 'BUSINESS_DEV',
    stageId: initialData?.stageId || (stages[0]?.id || 0),
    value: initialData?.value,
    probability: initialData?.probability,
    expectedCloseDate: initialData?.expectedCloseDate,
    source: initialData?.source,
  });

  // Client search state
  interface ClientSearchResult {
    id: number;
    clientCode: string;
    clientNameFull: string | null;
    groupDesc: string | null;
  }
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Company research state
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [researchResult, setResearchResult] = useState<CompanyResearchResult | null>(null);
  const companyResearchMutation = useCompanyResearch();

  // Fetch clients based on search
  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients', 'search', clientSearch],
    queryFn: async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch clients');
      const result = await res.json();
      return result.data?.clients || [];
    },
    enabled: opportunityType === 'current' && clientSearch.length >= 2,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up form data based on opportunity type
    const submitData = { ...formData };
    if (opportunityType === 'current') {
      delete submitData.companyName; // Remove if using GSClientID
    } else {
      delete submitData.GSClientID; // Remove if using companyName
    }
    onSubmit(submitData as CreateBDOpportunityInput);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value || undefined,
    }));
  };

  const handleTypeChange = (type: 'current' | 'prospect') => {
    setOpportunityType(type);
    // Clear the opposing field when switching types
    if (type === 'current') {
      setFormData((prev) => ({ ...prev, companyName: undefined, GSClientID: undefined }));
      setClientSearch('');
      setSelectedClient(null);
    } else {
      setFormData((prev) => ({ ...prev, GSClientID: undefined, companyName: '' }));
      setClientSearch('');
      setSelectedClient(null);
    }
  };

  const handleClientSelect = (client: ClientSearchResult) => {
    setSelectedClient(client);
    setClientSearch(client.clientNameFull || client.clientCode);
    setFormData((prev) => ({ ...prev, GSClientID: client.id }));
    setShowClientDropdown(false);
  };

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    setShowClientDropdown(value.length >= 2);
    if (value.length < 2) {
      setSelectedClient(null);
      setFormData((prev) => ({ ...prev, GSClientID: undefined }));
    }
  };

  // Handle company research
  const handleResearchCompany = async () => {
    const companyName = formData.companyName?.trim();
    if (!companyName) return;

    setShowResearchModal(true);
    setResearchResult(null);

    try {
      const result = await companyResearchMutation.mutateAsync(companyName);
      setResearchResult(result);
    } catch {
      // Error is handled in the modal via mutation state
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Opportunity Title <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          placeholder="e.g., Tax Advisory for ABC Corp"
        />
      </div>

      {/* Opportunity Type Selector */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
          Opportunity Type <span className="text-red-600">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleTypeChange('current')}
            className={`px-4 py-3 rounded-lg text-sm font-medium border-2 transition-all ${
              opportunityType === 'current'
                ? 'border-forvis-blue-500 bg-forvis-blue-50 text-forvis-blue-700'
                : 'border-forvis-gray-300 bg-white text-forvis-gray-700 hover:border-forvis-gray-400'
            }`}
          >
            <div className="flex flex-col items-center">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>Current Client</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('prospect')}
            className={`px-4 py-3 rounded-lg text-sm font-medium border-2 transition-all ${
              opportunityType === 'prospect'
                ? 'border-forvis-blue-500 bg-forvis-blue-50 text-forvis-blue-700'
                : 'border-forvis-gray-300 bg-white text-forvis-gray-700 hover:border-forvis-gray-400'
            }`}
          >
            <div className="flex flex-col items-center">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>New Prospect</span>
            </div>
          </button>
        </div>
      </div>

      {/* Client Selector or Company Name */}
      {opportunityType === 'current' ? (
        <div className="relative" ref={clientSearchRef}>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Search for Client <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-forvis-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => handleClientSearchChange(e.target.value)}
              onFocus={() => clientSearch.length >= 2 && setShowClientDropdown(true)}
              placeholder="Type to search clients..."
              required
              className="block w-full pl-10 pr-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
            />
            {selectedClient && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setClientSearch('');
                    setSelectedClient(null);
                    setFormData((prev) => ({ ...prev, GSClientID: undefined }));
                  }}
                  className="text-forvis-gray-400 hover:text-forvis-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Loading State */}
          {showClientDropdown && isLoadingClients && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-forvis-gray-300 rounded-lg shadow-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-forvis-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-forvis-gray-600">Searching...</p>
              </div>
            </div>
          )}

          {/* Dropdown Results */}
          {showClientDropdown && !isLoadingClients && clientsData && clientsData.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-forvis-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {clientsData.map((client: ClientSearchResult) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-forvis-blue-50 focus:bg-forvis-blue-50 focus:outline-none transition-colors"
                >
                  <div className="font-medium text-forvis-gray-900">
                    {client.clientNameFull || client.clientCode}
                  </div>
                  <div className="text-xs text-forvis-gray-600">
                    {client.clientCode} • {client.groupDesc || 'No group'}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* No Results */}
          {showClientDropdown && !isLoadingClients && clientSearch.length >= 2 && clientsData && clientsData.length === 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-forvis-gray-300 rounded-lg shadow-lg p-4 text-center">
              <p className="text-sm text-forvis-gray-600">No clients found matching "{clientSearch}"</p>
            </div>
          )}
          
          {/* Search hint */}
          {!selectedClient && clientSearch.length < 2 && (
            <p className="mt-1 text-xs text-forvis-gray-500">Type at least 2 characters to search</p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Company Name <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="companyName"
              value={formData.companyName || ''}
              onChange={handleChange}
              required
              className="flex-1 block px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
              placeholder="e.g., ABC Corporation (Pty) Ltd"
            />
            <button
              type="button"
              onClick={handleResearchCompany}
              disabled={!formData.companyName?.trim() || companyResearchMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              title="Research this company using AI"
            >
              {companyResearchMutation.isPending ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Research</span>
            </button>
          </div>
          <p className="mt-1 text-xs text-forvis-gray-500">
            Click Research to get AI-powered insights about this company
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 resize-none"
          placeholder="Brief description of the opportunity..."
        />
      </div>

      {/* Service Line and Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Service Line <span className="text-red-600">*</span>
          </label>
          <select
            name="serviceLine"
            value={formData.serviceLine}
            onChange={handleChange}
            required
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          >
            <option value="TAX">Tax</option>
            <option value="AUDIT">Audit</option>
            <option value="ACCOUNTING">Accounting</option>
            <option value="ADVISORY">Advisory</option>
            <option value="BUSINESS_DEV">Business Development</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Stage <span className="text-red-600">*</span>
          </label>
          <select
            name="stageId"
            value={formData.stageId}
            onChange={handleChange}
            required
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Value and Probability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Value (R)
          </label>
          <input
            type="number"
            name="value"
            value={formData.value || ''}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Probability (%)
          </label>
          <input
            type="number"
            name="probability"
            value={formData.probability || ''}
            onChange={handleChange}
            min="0"
            max="100"
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
            placeholder="Auto from stage"
          />
        </div>
      </div>

      {/* Expected Close Date and Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Expected Close Date
          </label>
          <input
            type="date"
            name="expectedCloseDate"
            value={
              formData.expectedCloseDate
                ? new Date(formData.expectedCloseDate).toISOString().split('T')[0]
                : ''
            }
            onChange={handleChange}
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">Source</label>
          <select
            name="source"
            value={formData.source || ''}
            onChange={handleChange}
            className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
          >
            <option value="">Select source...</option>
            <option value="REFERRAL">Referral</option>
            <option value="WEBSITE">Website</option>
            <option value="COLD_CALL">Cold Call</option>
            <option value="NETWORKING">Networking</option>
            <option value="EXISTING_CLIENT">Existing Client</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : (
            'Save Opportunity'
          )}
        </button>
      </div>

      {/* Company Research Modal */}
      <CompanyResearchModal
        isOpen={showResearchModal}
        onClose={() => setShowResearchModal(false)}
        companyName={formData.companyName || ''}
        result={researchResult}
        isLoading={companyResearchMutation.isPending}
        error={companyResearchMutation.error}
      />
    </form>
  );
}

