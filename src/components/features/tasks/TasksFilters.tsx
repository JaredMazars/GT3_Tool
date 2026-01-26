'use client';

import React from 'react';
import { X, Filter, List, LayoutGrid, Minimize2, Maximize2 } from 'lucide-react';
import { SearchMultiCombobox, SearchMultiComboboxOption } from '@/components/ui/SearchMultiCombobox';
import { useTaskFilters } from '@/hooks/tasks/useTaskFilters';

export interface TasksFiltersType {
  clients: number[];        // Client IDs
  taskNames: string[];      // Task names
  partners: string[];       // Partner codes
  managers: string[];       // Manager codes
  serviceLines: string[];   // Service line codes
  includeArchived: boolean;
}

export interface TasksFiltersProps {
  serviceLine?: string;
  subServiceLineGroup?: string;
  filters: TasksFiltersType;
  onFiltersChange: (filters: TasksFiltersType) => void;
  viewMode?: 'list' | 'kanban';
  onViewModeChange?: (mode: 'list' | 'kanban') => void;
  displayMode?: 'compact' | 'detailed';
  onDisplayModeChange?: (mode: 'compact' | 'detailed') => void;
}

export function TasksFilters({
  serviceLine,
  subServiceLineGroup,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  displayMode,
  onDisplayModeChange,
}: TasksFiltersProps) {
  // Independent search states for each filter
  const [clientSearch, setClientSearch] = React.useState('');
  const [taskNameSearch, setTaskNameSearch] = React.useState('');
  const [partnerSearch, setPartnerSearch] = React.useState('');
  const [managerSearch, setManagerSearch] = React.useState('');

  // Fetch filter options with independent searches
  const { data: filterOptions, isLoading } = useTaskFilters({
    serviceLine,
    subServiceLineGroup,
    clientSearch,
    taskNameSearch,
    partnerSearch,
    managerSearch,
  });


  const handleClientsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, clients: values as number[] });
  };

  const handleTaskNamesChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, taskNames: values as string[] });
  };

  const handlePartnersChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, partners: values as string[] });
  };

  const handleManagersChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, managers: values as string[] });
  };

  const handleToggleArchived = () => {
    const newValue = !filters.includeArchived;
    onFiltersChange({ ...filters, includeArchived: newValue });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      clients: [],
      taskNames: [],
      partners: [],
      managers: [],
      serviceLines: [],
      includeArchived: false,
    });
  };

  const hasActiveFilters =
    filters.clients.length > 0 ||
    filters.taskNames.length > 0 ||
    filters.partners.length > 0 ||
    filters.managers.length > 0 ||
    filters.includeArchived;

  // Convert data to SearchMultiCombobox options
  const clientOptions: SearchMultiComboboxOption[] = (filterOptions?.clients || []).map(client => ({
    id: client.id,
    label: `${client.code} - ${client.name}`,
  }));

  const taskNameOptions: SearchMultiComboboxOption[] = (filterOptions?.taskNames || []).map(task => ({
    id: task.name,
    label: task.code ? `${task.code} - ${task.name}` : task.name,
  }));


  const partnerOptions: SearchMultiComboboxOption[] = (filterOptions?.partners || []).map(partner => ({
    id: partner.id,
    label: partner.name,
  }));

  const managerOptions: SearchMultiComboboxOption[] = (filterOptions?.managers || []).map(manager => ({
    id: manager.id,
    label: manager.name,
  }));

  const serviceLineOptions: SearchMultiComboboxOption[] = (filterOptions?.serviceLines || []).map(serviceLine => ({
    id: serviceLine,
    label: serviceLine,
  }));

  // Generate active filters summary
  const getActiveFiltersSummary = () => {
    const parts: string[] = [];
    if (filters.clients.length > 0) parts.push(`${filters.clients.length} Client${filters.clients.length > 1 ? 's' : ''}`);
    if (filters.taskNames.length > 0) parts.push(`${filters.taskNames.length} Task${filters.taskNames.length > 1 ? 's' : ''}`);
    if (filters.partners.length > 0) parts.push(`${filters.partners.length} Partner${filters.partners.length > 1 ? 's' : ''}`);
    if (filters.managers.length > 0) parts.push(`${filters.managers.length} Manager${filters.managers.length > 1 ? 's' : ''}`);
    if (filters.includeArchived) parts.push('Archived');
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* First Row: View Controls, Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle (List/Kanban) */}
          {onViewModeChange && viewMode && (
            <div className="inline-flex rounded-lg border border-forvis-gray-300 bg-white">
              <button
                onClick={() => onViewModeChange('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-forvis-blue-600 text-white'
                    : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
                }`}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => onViewModeChange('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-r-lg border-l border-forvis-gray-300 transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-forvis-blue-600 text-white'
                    : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
                }`}
                title="Kanban View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
            </div>
          )}

          {/* Display Mode (Compact/Detailed) - Only for Kanban */}
          {onDisplayModeChange && displayMode && viewMode === 'kanban' && (
            <div className="inline-flex rounded-lg border border-forvis-gray-300 bg-white">
              <button
                onClick={() => onDisplayModeChange('compact')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${
                  displayMode === 'compact'
                    ? 'bg-forvis-blue-600 text-white'
                    : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
                }`}
                title="Compact Display"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDisplayModeChange('detailed')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-r-lg border-l border-forvis-gray-300 transition-colors ${
                  displayMode === 'detailed'
                    ? 'bg-forvis-blue-600 text-white'
                    : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
                }`}
                title="Detailed Display"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Include Archived Toggle */}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-forvis-gray-300 rounded-lg bg-white cursor-pointer hover:bg-forvis-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={filters.includeArchived}
              onChange={handleToggleArchived}
              className="w-3.5 h-3.5 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
            />
            <span className="text-xs font-medium text-forvis-gray-700">
              Archived
            </span>
          </label>

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

        {/* Second Row: Multi-Select Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Clients Filter */}
          <SearchMultiCombobox
            value={filters.clients}
            onChange={handleClientsChange}
            onSearchChange={setClientSearch}
            options={clientOptions}
            placeholder="All Clients"
            searchPlaceholder="Search by code or name..."
            minimumSearchChars={2}
            isLoading={isLoading}
            emptyMessage={clientSearch.length < 2 ? "Type 2+ characters to search clients" : "No clients found"}
            metadata={filterOptions?.metadata?.clients}
          />

          {/* Task Names Filter */}
          <SearchMultiCombobox
            value={filters.taskNames}
            onChange={handleTaskNamesChange}
            onSearchChange={setTaskNameSearch}
            options={taskNameOptions}
            placeholder="All Task Names"
            searchPlaceholder="Search by code or name..."
            minimumSearchChars={2}
            isLoading={isLoading}
            emptyMessage={taskNameSearch.length < 2 ? "Type 2+ characters to search tasks" : "No tasks found"}
            metadata={filterOptions?.metadata?.taskNames}
          />

          {/* Partners Filter */}
          <SearchMultiCombobox
            value={filters.partners}
            onChange={handlePartnersChange}
            onSearchChange={setPartnerSearch}
            options={partnerOptions}
            placeholder="All Partners"
            searchPlaceholder="Search partners..."
            minimumSearchChars={2}
            isLoading={isLoading}
            emptyMessage={partnerSearch.length < 2 ? "Type 2+ characters to search partners" : "No partners found"}
            metadata={filterOptions?.metadata?.partners}
          />

          {/* Managers Filter */}
          <SearchMultiCombobox
            value={filters.managers}
            onChange={handleManagersChange}
            onSearchChange={setManagerSearch}
            options={managerOptions}
            placeholder="All Managers"
            searchPlaceholder="Search managers..."
            minimumSearchChars={2}
            isLoading={isLoading}
            emptyMessage={managerSearch.length < 2 ? "Type 2+ characters to search managers" : "No managers found"}
            metadata={filterOptions?.metadata?.managers}
          />
        </div>

        {/* Third Row: Active Filters Indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-forvis-gray-600">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-medium">Active: {getActiveFiltersSummary()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
