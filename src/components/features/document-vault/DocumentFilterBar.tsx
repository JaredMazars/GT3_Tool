'use client';

import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui';
import type { VaultDocumentType, VaultDocumentScope } from '@/types/documentVault';

interface DocumentFilterBarProps {
  onFilterChange: (filters: {
    search?: string;
    categoryId?: number;
    documentType?: VaultDocumentType;
    scope?: VaultDocumentScope;
    serviceLine?: string;
  }) => void;
  categories?: Array<{ id: number; name: string }>;
  serviceLines?: string[];
}

export function DocumentFilterBar({ onFilterChange, categories = [], serviceLines = [] }: DocumentFilterBarProps) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [documentType, setDocumentType] = useState<VaultDocumentType | undefined>();
  const [scope, setScope] = useState<VaultDocumentScope | undefined>();
  const [serviceLine, setServiceLine] = useState<string | undefined>();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ search: value || undefined, categoryId, documentType, scope, serviceLine });
  };

  const handleCategoryChange = (value: string) => {
    const newCategoryId = value ? parseInt(value) : undefined;
    setCategoryId(newCategoryId);
    onFilterChange({ search: search || undefined, categoryId: newCategoryId, documentType, scope, serviceLine });
  };

  const handleDocumentTypeChange = (value: string) => {
    const newType = value as VaultDocumentType | undefined;
    setDocumentType(newType);
    onFilterChange({ search: search || undefined, categoryId, documentType: newType, scope, serviceLine });
  };

  const handleScopeChange = (value: string) => {
    const newScope = value as VaultDocumentScope | undefined;
    setScope(newScope);
    onFilterChange({ search: search || undefined, categoryId, documentType, scope: newScope, serviceLine });
  };

  const handleServiceLineChange = (value: string) => {
    const newServiceLine = value || undefined;
    setServiceLine(newServiceLine);
    onFilterChange({ search: search || undefined, categoryId, documentType, scope, serviceLine: newServiceLine });
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryId(undefined);
    setDocumentType(undefined);
    setScope(undefined);
    setServiceLine(undefined);
    onFilterChange({});
  };

  const hasActiveFilters = search || categoryId || documentType || scope || serviceLine;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
        <input
          type="text"
          placeholder="Search documents by title, description, or tags..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={documentType || ''}
          onChange={(e) => handleDocumentTypeChange(e.target.value)}
          className="px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 text-sm"
        >
          <option value="">All Types</option>
          <option value="POLICY">Policy</option>
          <option value="SOP">SOP</option>
          <option value="TEMPLATE">Template</option>
          <option value="MARKETING">Marketing</option>
          <option value="TRAINING">Training</option>
          <option value="OTHER">Other</option>
        </select>

        {categories.length > 0 && (
          <select
            value={categoryId || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={scope || ''}
          onChange={(e) => handleScopeChange(e.target.value)}
          className="px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 text-sm"
        >
          <option value="">All Scopes</option>
          <option value="GLOBAL">Global</option>
          <option value="SERVICE_LINE">Service Line</option>
        </select>

        {serviceLines.length > 0 && (
          <select
            value={serviceLine || ''}
            onChange={(e) => handleServiceLineChange(e.target.value)}
            className="px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 text-sm"
          >
            <option value="">All Service Lines</option>
            {serviceLines.map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <Button
            variant="secondary"
            onClick={handleClearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
