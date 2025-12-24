'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Filter, Calendar, List } from 'lucide-react';
import { MultiSelect, MultiSelectOption } from '@/components/ui';
import { ServiceLineRole } from '@/types';

export interface MyPlanningFiltersType {
  search: string;
  clients: string[];
  tasks: string[];
  roles: string[];
}

export interface MyPlanningFiltersProps {
  filters: MyPlanningFiltersType;
  onFiltersChange: (filters: MyPlanningFiltersType) => void;
  clients: { name: string; code: string }[];
  tasks: { name: string; code: string }[];
  viewMode: 'timeline' | 'list';
  onViewModeChange: (mode: 'timeline' | 'list') => void;
}

export function MyPlanningFilters({
  filters,
  onFiltersChange,
  clients,
  tasks,
  viewMode,
  onViewModeChange,
}: MyPlanningFiltersProps) {
  // Local state for immediate UI feedback on search
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
    onFiltersChange({ ...filters, clients: values as string[] });
  };

  const handleTasksChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, tasks: values as string[] });
  };

  const handleRolesChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, roles: values as string[] });
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
      tasks: [],
      roles: [],
    });
  };

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.clients.length > 0 ||
    filters.tasks.length > 0 ||
    filters.roles.length > 0;

  // Convert data to MultiSelect options
  const clientOptions: MultiSelectOption[] = clients.map(client => ({
    id: client.code,
    label: `${client.name} (${client.code})`,
  }));

  const taskOptions: MultiSelectOption[] = tasks.map(task => ({
    id: task.code || task.name,
    label: `${task.name}${task.code ? ` (${task.code})` : ''}`,
  }));

  const roleOptions: MultiSelectOption[] = [
    { id: 'ADMINISTRATOR', label: 'Administrator' },
    { id: 'PARTNER', label: 'Partner' },
    { id: 'MANAGER', label: 'Manager' },
    { id: 'SUPERVISOR', label: 'Supervisor' },
    { id: 'USER', label: 'User' },
    { id: 'VIEWER', label: 'Viewer' },
  ];

  // Generate active filters summary
  const getActiveFiltersSummary = () => {
    const parts: string[] = [];
    if (filters.search) parts.push('Search');
    if (filters.clients.length > 0) parts.push(`${filters.clients.length} Client${filters.clients.length > 1 ? 's' : ''}`);
    if (filters.tasks.length > 0) parts.push(`${filters.tasks.length} Task${filters.tasks.length > 1 ? 's' : ''}`);
    if (filters.roles.length > 0) parts.push(`${filters.roles.length} Role${filters.roles.length > 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* First Row: View Toggle, Search, and Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle (Timeline/List) */}
          <div className="inline-flex rounded-lg border border-forvis-gray-300 bg-white">
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-forvis-blue-600 text-white'
                  : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
              title="Timeline View"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-r-lg border-l border-forvis-gray-300 transition-colors ${
                viewMode === 'list'
                  ? 'bg-forvis-blue-600 text-white'
                  : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-forvis-gray-400" />
              <input
                type="text"
                placeholder="Search by client, task, or code..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-xs"
              />
            </div>
          </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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

          {/* Roles Filter */}
          <MultiSelect
            options={roleOptions}
            value={filters.roles}
            onChange={handleRolesChange}
            placeholder="All Roles"
            searchPlaceholder="Search roles..."
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








