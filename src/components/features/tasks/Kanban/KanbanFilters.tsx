'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Filter, List, LayoutGrid, Minimize2, Maximize2 } from 'lucide-react';
import { KanbanFiltersProps } from './types';
import { MultiSelect, MultiSelectOption } from '@/components/ui';

export function KanbanFilters({ 
  filters, 
  onFiltersChange, 
  clients,
  tasks,
  partners,
  managers,
  viewMode,
  onViewModeChange,
  displayMode,
  onDisplayModeChange,
  showSearch = true,
}: KanbanFiltersProps) {
  // Local state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Update local search when filters.search changes externally
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    // Update local state immediately for responsive UI
    setLocalSearch(value);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer to update filters after 500ms of no typing
    debounceTimerRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value });
    }, 500);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleClientsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, clients: values as number[] });
  };

  const handleTasksChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, tasks: values as string[] });
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
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Clear local search immediately
    setLocalSearch('');
    // Clear all filters
    onFiltersChange({
      search: '',
      clients: [],
      tasks: [] as string[],
      partners: [],
      managers: [],
      includeArchived: false,
    });
  };

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.clients.length > 0 ||
    filters.tasks.length > 0 ||
    filters.partners.length > 0 ||
    filters.managers.length > 0 ||
    filters.includeArchived;

  // Convert data to MultiSelect options
  const clientOptions: MultiSelectOption[] = clients.map(client => ({
    id: client.id,
    label: `${client.name} (${client.code})`,
  }));

  const taskOptions: MultiSelectOption[] = tasks.map(taskName => ({
    id: taskName,
    label: taskName,
  }));

  const partnerOptions: MultiSelectOption[] = partners.map(partner => ({
    id: partner,
    label: partner,
  }));

  const managerOptions: MultiSelectOption[] = managers.map(manager => ({
    id: manager,
    label: manager,
  }));

  // Generate active filters summary
  const getActiveFiltersSummary = () => {
    const parts: string[] = [];
    if (filters.search) parts.push('Search');
    if (filters.clients.length > 0) parts.push(`${filters.clients.length} Client${filters.clients.length > 1 ? 's' : ''}`);
    if (filters.tasks.length > 0) parts.push(`${filters.tasks.length} Task${filters.tasks.length > 1 ? 's' : ''}`);
    if (filters.partners.length > 0) parts.push(`${filters.partners.length} Partner${filters.partners.length > 1 ? 's' : ''}`);
    if (filters.managers.length > 0) parts.push(`${filters.managers.length} Manager${filters.managers.length > 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* First Row: View Controls, Search, and Quick Actions */}
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

          {/* Search */}
          {showSearch && (
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-forvis-gray-400" />
                <input
                  type="text"
                  placeholder="Search by project, client, or code..."
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-xs"
                />
              </div>
            </div>
          )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Clients Filter */}
          <MultiSelect
            options={clientOptions}
            value={filters.clients}
            onChange={handleClientsChange}
            placeholder="All Clients"
            searchPlaceholder="Search clients..."
          />

          {/* Tasks Filter */}
          <MultiSelect
            options={taskOptions}
            value={filters.tasks}
            onChange={handleTasksChange}
            placeholder="All Tasks"
            searchPlaceholder="Search tasks..."
          />

          {/* Partners Filter */}
          <MultiSelect
            options={partnerOptions}
            value={filters.partners}
            onChange={handlePartnersChange}
            placeholder="All Partners"
            searchPlaceholder="Search partners..."
          />

          {/* Managers Filter */}
          <MultiSelect
            options={managerOptions}
            value={filters.managers}
            onChange={handleManagersChange}
            placeholder="All Managers"
            searchPlaceholder="Search managers..."
          />
        </div>

        {/* Active Filters Indicator */}
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
