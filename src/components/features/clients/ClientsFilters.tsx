'use client';

import React from 'react';
import { X, Filter } from 'lucide-react';
import { SearchMultiCombobox, SearchMultiComboboxOption } from '@/components/ui/SearchMultiCombobox';
import { useClientFilters } from '@/hooks/clients/useClientFilters';
import { useClients } from '@/hooks/clients/useClients';

export interface ClientsFiltersType {
  clients: string[];  // Client codes
  partners: string[];  // Employee codes
  managers: string[];  // Employee codes
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
  const [partnerSearch, setPartnerSearch] = React.useState('');
  const [managerSearch, setManagerSearch] = React.useState('');
  const [groupSearch, setGroupSearch] = React.useState('');

  // Fetch filter options with independent searches
  const { data: clientFiltersData, isLoading: isLoadingFilters } = useClientFilters({
    partnerSearch,
    managerSearch,
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

  const handlePartnersChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, partners: values as string[] });
  };

  const handleManagersChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, managers: values as string[] });
  };

  const handleGroupsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, groups: values as string[] });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      clients: [],
      partners: [],
      managers: [],
      groups: [],
    });
  };

  const hasActiveFilters = 
    filters.clients.length > 0 ||
    filters.partners.length > 0 ||
    filters.managers.length > 0 ||
    filters.groups.length > 0;

  // Convert data to SearchMultiCombobox options
  const clientOptions: SearchMultiComboboxOption[] = (clientsData?.clients || []).map(client => ({
    id: client.clientCode,
    label: `${client.clientCode} - ${client.clientNameFull || client.clientCode}`,
  }));

  const partnerOptions: SearchMultiComboboxOption[] = (clientFiltersData?.partners || []).map(partner => ({
    id: partner.code,
    label: `${partner.code} - ${partner.name}`,
  }));

  const managerOptions: SearchMultiComboboxOption[] = (clientFiltersData?.managers || []).map(manager => ({
    id: manager.code,
    label: `${manager.code} - ${manager.name}`,
  }));

  const groupOptions: SearchMultiComboboxOption[] = (clientFiltersData?.groups || []).map(group => ({
    id: group.code,
    label: `${group.code} - ${group.name}`,
  }));

  // Generate active filters summary
  const getActiveFiltersSummary = () => {
    const parts: string[] = [];
    if (filters.clients.length > 0) parts.push(`${filters.clients.length} Client${filters.clients.length > 1 ? 's' : ''}`);
    if (filters.partners.length > 0) parts.push(`${filters.partners.length} Partner${filters.partners.length > 1 ? 's' : ''}`);
    if (filters.managers.length > 0) parts.push(`${filters.managers.length} Manager${filters.managers.length > 1 ? 's' : ''}`);
    if (filters.groups.length > 0) parts.push(`${filters.groups.length} Group${filters.groups.length > 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* Filter Row: Client, Partner, Manager, Group */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
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

          {/* Partner Filter with server-side search */}
          <SearchMultiCombobox
            value={filters.partners}
            onChange={handlePartnersChange}
            onSearchChange={setPartnerSearch}
            options={partnerOptions}
            placeholder="All Partners"
            searchPlaceholder="Search partners..."
            minimumSearchChars={2}
            isLoading={isLoadingFilters}
            emptyMessage={partnerSearch.length < 2 ? "Type 2+ characters to search partners" : "No partners found"}
            metadata={clientFiltersData?.metadata?.partners}
          />

          {/* Manager Filter with server-side search */}
          <SearchMultiCombobox
            value={filters.managers}
            onChange={handleManagersChange}
            onSearchChange={setManagerSearch}
            options={managerOptions}
            placeholder="All Managers"
            searchPlaceholder="Search managers..."
            minimumSearchChars={2}
            isLoading={isLoadingFilters}
            emptyMessage={managerSearch.length < 2 ? "Type 2+ characters to search managers" : "No managers found"}
            metadata={clientFiltersData?.metadata?.managers}
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








