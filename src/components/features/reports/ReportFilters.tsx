'use client';

/**
 * Report Filters Component
 * 
 * Enhanced filtering with SearchMultiCombobox:
 * - Multi-select clients with search
 * - Multi-select service lines with search
 * - Multi-select groups with search
 */

import { useMemo, useState } from 'react';
import { X, Filter } from 'lucide-react';
import { SearchMultiCombobox, SearchMultiComboboxOption } from '@/components/ui/SearchMultiCombobox';
import type { TaskWithWIPAndServiceLine } from '@/types/api';

export interface ReportFiltersState {
  clients: (string | number)[];     // Multi-select client IDs
  serviceLines: string[];            // Multi-select service line codes
  groups: string[];                  // Multi-select group codes
  masterServiceLines: string[];      // Multi-select master SL codes
  subServiceLineGroups: string[];    // Multi-select sub serv group codes
}

interface ReportFiltersProps {
  filters: ReportFiltersState;
  onFiltersChange: (filters: ReportFiltersState) => void;
  availableTasks: TaskWithWIPAndServiceLine[];
}

export function ReportFilters({
  filters,
  onFiltersChange,
  availableTasks,
}: ReportFiltersProps) {
  // Local search states for each filter
  const [clientSearch, setClientSearch] = useState('');
  const [serviceLineSearch, setServiceLineSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [masterServiceLineSearch, setMasterServiceLineSearch] = useState('');
  const [subServiceLineGroupSearch, setSubServiceLineGroupSearch] = useState('');

  // Extract unique options from available tasks
  const { clientOptions, serviceLineOptions, groupOptions, masterServiceLineOptions, subServiceLineGroupOptions } = useMemo(() => {
    // Clients
    const clientMap = new Map<string, SearchMultiComboboxOption>();
    availableTasks.forEach((task) => {
      if (!clientMap.has(task.GSClientID)) {
        clientMap.set(task.GSClientID, {
          id: task.GSClientID,
          label: `${task.clientCode} - ${task.clientNameFull || 'Unnamed Client'}`,
        });
      }
    });
    const clients = Array.from(clientMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    // Service Lines
    const serviceLineMap = new Map<string, SearchMultiComboboxOption>();
    availableTasks.forEach((task) => {
      if (!serviceLineMap.has(task.servLineCode)) {
        serviceLineMap.set(task.servLineCode, {
          id: task.servLineCode,
          label: task.serviceLineName,
        });
      }
    });
    const serviceLines = Array.from(serviceLineMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    // Groups
    const groupMap = new Map<string, SearchMultiComboboxOption>();
    availableTasks.forEach((task) => {
      if (!groupMap.has(task.groupCode)) {
        groupMap.set(task.groupCode, {
          id: task.groupCode,
          label: task.groupDesc,
        });
      }
    });
    const groups = Array.from(groupMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    // Master Service Lines
    const masterServiceLineMap = new Map<string, SearchMultiComboboxOption>();
    availableTasks.forEach((task) => {
      if (!masterServiceLineMap.has(task.masterServiceLineCode)) {
        masterServiceLineMap.set(task.masterServiceLineCode, {
          id: task.masterServiceLineCode,
          label: task.masterServiceLineName,
        });
      }
    });
    const masterServiceLines = Array.from(masterServiceLineMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    // Sub Service Line Groups
    const subServiceLineGroupMap = new Map<string, SearchMultiComboboxOption>();
    availableTasks.forEach((task) => {
      const code = task.subServlineGroupCode || task.servLineCode;
      if (!subServiceLineGroupMap.has(code)) {
        subServiceLineGroupMap.set(code, {
          id: code,
          label: task.subServlineGroupDesc,
        });
      }
    });
    const subServiceLineGroups = Array.from(subServiceLineGroupMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    return {
      clientOptions: clients,
      serviceLineOptions: serviceLines,
      groupOptions: groups,
      masterServiceLineOptions: masterServiceLines,
      subServiceLineGroupOptions: subServiceLineGroups,
    };
  }, [availableTasks]);

  // Filter options based on search (client-side)
  const filteredClientOptions = useMemo(() => {
    if (!clientSearch || clientSearch.length < 2) return clientOptions;
    const searchLower = clientSearch.toLowerCase();
    return clientOptions.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [clientOptions, clientSearch]);

  const filteredServiceLineOptions = useMemo(() => {
    if (!serviceLineSearch || serviceLineSearch.length < 2) return serviceLineOptions;
    const searchLower = serviceLineSearch.toLowerCase();
    return serviceLineOptions.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [serviceLineOptions, serviceLineSearch]);

  const filteredGroupOptions = useMemo(() => {
    if (!groupSearch || groupSearch.length < 2) return groupOptions;
    const searchLower = groupSearch.toLowerCase();
    return groupOptions.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [groupOptions, groupSearch]);

  const filteredMasterServiceLineOptions = useMemo(() => {
    if (!masterServiceLineSearch || masterServiceLineSearch.length < 2) return masterServiceLineOptions;
    const searchLower = masterServiceLineSearch.toLowerCase();
    return masterServiceLineOptions.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [masterServiceLineOptions, masterServiceLineSearch]);

  const filteredSubServiceLineGroupOptions = useMemo(() => {
    if (!subServiceLineGroupSearch || subServiceLineGroupSearch.length < 2) return subServiceLineGroupOptions;
    const searchLower = subServiceLineGroupSearch.toLowerCase();
    return subServiceLineGroupOptions.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [subServiceLineGroupOptions, subServiceLineGroupSearch]);

  const handleClientsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, clients: values });
  };

  const handleServiceLinesChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, serviceLines: values as string[] });
  };

  const handleGroupsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, groups: values as string[] });
  };

  const handleMasterServiceLinesChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, masterServiceLines: values as string[] });
  };

  const handleSubServiceLineGroupsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, subServiceLineGroups: values as string[] });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      clients: [],
      serviceLines: [],
      groups: [],
      masterServiceLines: [],
      subServiceLineGroups: [],
    });
    setClientSearch('');
    setServiceLineSearch('');
    setGroupSearch('');
    setMasterServiceLineSearch('');
    setSubServiceLineGroupSearch('');
  };

  const hasActiveFilters =
    filters.clients.length > 0 ||
    filters.serviceLines.length > 0 ||
    filters.groups.length > 0 ||
    filters.masterServiceLines.length > 0 ||
    filters.subServiceLineGroups.length > 0;

  // Generate active filters summary
  const getActiveFiltersSummary = () => {
    const parts: string[] = [];
    if (filters.masterServiceLines.length > 0)
      parts.push(`${filters.masterServiceLines.length} Master SL${filters.masterServiceLines.length > 1 ? 's' : ''}`);
    if (filters.subServiceLineGroups.length > 0)
      parts.push(`${filters.subServiceLineGroups.length} Sub SL Group${filters.subServiceLineGroups.length > 1 ? 's' : ''}`);
    if (filters.serviceLines.length > 0)
      parts.push(
        `${filters.serviceLines.length} Service Line${filters.serviceLines.length > 1 ? 's' : ''}`
      );
    if (filters.groups.length > 0)
      parts.push(`${filters.groups.length} Group${filters.groups.length > 1 ? 's' : ''}`);
    if (filters.clients.length > 0)
      parts.push(`${filters.clients.length} Client${filters.clients.length > 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
          {/* Master Service Lines Filter */}
          <SearchMultiCombobox
            value={filters.masterServiceLines}
            onChange={handleMasterServiceLinesChange}
            onSearchChange={setMasterServiceLineSearch}
            options={filteredMasterServiceLineOptions}
            placeholder="All Master SL"
            searchPlaceholder="Search master service lines..."
            minimumSearchChars={2}
            emptyMessage={
              masterServiceLineSearch.length < 2
                ? 'Type 2+ characters to search'
                : 'No master service lines found'
            }
          />

          {/* Sub Service Line Groups Filter */}
          <SearchMultiCombobox
            value={filters.subServiceLineGroups}
            onChange={handleSubServiceLineGroupsChange}
            onSearchChange={setSubServiceLineGroupSearch}
            options={filteredSubServiceLineGroupOptions}
            placeholder="All Sub SL Groups"
            searchPlaceholder="Search sub service line groups..."
            minimumSearchChars={2}
            emptyMessage={
              subServiceLineGroupSearch.length < 2
                ? 'Type 2+ characters to search'
                : 'No sub service line groups found'
            }
          />

          {/* Service Lines Filter */}
          <SearchMultiCombobox
            value={filters.serviceLines}
            onChange={handleServiceLinesChange}
            onSearchChange={setServiceLineSearch}
            options={filteredServiceLineOptions}
            placeholder="All Service Lines"
            searchPlaceholder="Search service lines..."
            minimumSearchChars={2}
            emptyMessage={
              serviceLineSearch.length < 2
                ? 'Type 2+ characters to search'
                : 'No service lines found'
            }
          />

          {/* Groups Filter */}
          <SearchMultiCombobox
            value={filters.groups}
            onChange={handleGroupsChange}
            onSearchChange={setGroupSearch}
            options={filteredGroupOptions}
            placeholder="All Groups"
            searchPlaceholder="Search groups..."
            minimumSearchChars={2}
            emptyMessage={
              groupSearch.length < 2 ? 'Type 2+ characters to search' : 'No groups found'
            }
          />

          {/* Clients Filter */}
          <SearchMultiCombobox
            value={filters.clients}
            onChange={handleClientsChange}
            onSearchChange={setClientSearch}
            options={filteredClientOptions}
            placeholder="All Clients"
            searchPlaceholder="Search by code or name..."
            minimumSearchChars={2}
            emptyMessage={
              clientSearch.length < 2
                ? 'Type 2+ characters to search clients'
                : 'No clients found'
            }
          />
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2">
          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-xs text-forvis-gray-600">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-medium">Active: {getActiveFiltersSummary()}</span>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forvis-gray-700 bg-forvis-gray-100 rounded-lg hover:bg-forvis-gray-200 transition-colors"
              title="Clear all filters"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
