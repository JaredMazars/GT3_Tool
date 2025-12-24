'use client';

import React from 'react';
import { X, Filter } from 'lucide-react';
import { SearchMultiCombobox, SearchMultiComboboxOption } from '@/components/ui/SearchMultiCombobox';
import { useClientFilters } from '@/hooks/clients/useClientFilters';
import { useClients } from '@/hooks/clients/useClients';

export interface ClientsFiltersType {
  clients: string[];  // Client codes
  industries: string[];
  groups: string[];
}

export interface ClientsFiltersProps {
  filters: ClientsFiltersType;
  onFiltersChange: (filters: ClientsFiltersType) => void;
}

export function ClientsFilters({
  filters,
  onFiltersChange,
}: ClientsFiltersProps) {
  const [clientSearch, setClientSearch] = React.useState('');
  const [industrySearch, setIndustrySearch] = React.useState('');
  const [groupSearch, setGroupSearch] = React.useState('');

  // Fetch filter options with independent searches
  const { data: clientFiltersData, isLoading: isLoadingFilters } = useClientFilters({
    industrySearch,
    groupSearch,
  });

  // Fetch clients for client filter (separate search)
  const { data: clientsData, isLoading: isLoadingClients } = useClients({
    search: clientSearch,
    limit: 50, // Limit to 50 results
    enabled: clientSearch.length >= 2,
  });

  const handleClientsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, clients: values as string[] });
  };

  const handleIndustriesChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, industries: values as string[] });
  };

  const handleGroupsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, groups: values as string[] });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      clients: [],
      industries: [],
      groups: [],
    });
  };

  const hasActiveFilters = 
    filters.clients.length > 0 ||
    filters.industries.length > 0 ||
    filters.groups.length > 0;

  // Convert data to SearchMultiCombobox options
  const clientOptions: SearchMultiComboboxOption[] = (clientsData?.clients || []).map(client => ({
    id: client.clientCode,
    label: `${client.clientCode} - ${client.clientNameFull || client.clientCode}`,
  }));

  const industryOptions: SearchMultiComboboxOption[] = (clientFiltersData?.industries || []).map(industry => ({
    id: industry,
    label: industry,
  }));

  const groupOptions: SearchMultiComboboxOption[] = (clientFiltersData?.groups || []).map(group => ({
    id: group.code,
    label: `${group.code} - ${group.name}`,
  }));

  // Generate active filters summary
  const getActiveFiltersSummary = () => {
    const parts: string[] = [];
    if (filters.clients.length > 0) parts.push(`${filters.clients.length} Client${filters.clients.length > 1 ? 's' : ''}`);
    if (filters.industries.length > 0) parts.push(`${filters.industries.length} Industr${filters.industries.length > 1 ? 'ies' : 'y'}`);
    if (filters.groups.length > 0) parts.push(`${filters.groups.length} Group${filters.groups.length > 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* Filter Row: Client, Industry, Group */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Client Filter with server-side search */}
          <SearchMultiCombobox
            value={filters.clients}
            onChange={handleClientsChange}
            onSearchChange={setClientSearch}
            options={clientOptions}
            placeholder="Filter by Client"
            searchPlaceholder="Search by code or name..."
            minimumSearchChars={2}
            isLoading={isLoadingClients}
            emptyMessage={clientSearch.length < 2 ? "Type 2+ characters to search clients" : "No clients found"}
            metadata={clientsData?.pagination ? {
              hasMore: clientsData.pagination.total > clientsData.clients.length,
              total: clientsData.pagination.total,
              returned: clientsData.clients.length,
            } : undefined}
          />

          {/* Industry Filter with server-side search */}
          <SearchMultiCombobox
            value={filters.industries}
            onChange={handleIndustriesChange}
            onSearchChange={setIndustrySearch}
            options={industryOptions}
            placeholder="All Industries"
            searchPlaceholder="Search industries..."
            minimumSearchChars={2}
            isLoading={isLoadingFilters}
            emptyMessage={industrySearch.length < 2 ? "Type 2+ characters to search industries" : "No industries found"}
            metadata={clientFiltersData?.metadata?.industries}
          />

          {/* Group Filter with server-side search */}
          <SearchMultiCombobox
            value={filters.groups}
            onChange={handleGroupsChange}
            onSearchChange={setGroupSearch}
            options={groupOptions}
            placeholder="All Groups"
            searchPlaceholder="Search groups..."
            minimumSearchChars={2}
            isLoading={isLoadingFilters}
            emptyMessage={groupSearch.length < 2 ? "Type 2+ characters to search groups" : "No groups found"}
            metadata={clientFiltersData?.metadata?.groups}
          />
        </div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-forvis-gray-600">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-medium">Active: {getActiveFiltersSummary()}</span>
            </div>
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forvis-gray-700 bg-forvis-gray-100 rounded-lg hover:bg-forvis-gray-200 transition-colors"
              title="Clear all filters"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}








