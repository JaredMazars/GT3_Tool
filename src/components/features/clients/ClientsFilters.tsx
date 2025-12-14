'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { MultiSelect, MultiSelectOption } from '@/components/ui';

export interface ClientsFiltersType {
  search: string;
  industries: string[];
  groups: string[];
  offices: string[];
}

export interface ClientsFiltersProps {
  filters: ClientsFiltersType;
  onFiltersChange: (filters: ClientsFiltersType) => void;
  industries: string[];
  groups: { name: string; code: string }[];
  offices: string[];
}

export function ClientsFilters({
  filters,
  onFiltersChange,
  industries,
  groups,
  offices,
}: ClientsFiltersProps) {
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

  const handleIndustriesChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, industries: values as string[] });
  };

  const handleGroupsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, groups: values as string[] });
  };

  const handleOfficesChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, offices: values as string[] });
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
      industries: [],
      groups: [],
      offices: [],
    });
  };

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.industries.length > 0 ||
    filters.groups.length > 0 ||
    filters.offices.length > 0;

  // Convert data to MultiSelect options
  const industryOptions: MultiSelectOption[] = industries.map(industry => ({
    id: industry,
    label: industry,
  }));

  const groupOptions: MultiSelectOption[] = groups.map(group => ({
    id: group.code,
    label: `${group.name} (${group.code})`,
  }));

  const officeOptions: MultiSelectOption[] = offices.map(office => ({
    id: office,
    label: office,
  }));

  // Generate active filters summary
  const getActiveFiltersSummary = () => {
    const parts: string[] = [];
    if (filters.search) parts.push('Search');
    if (filters.industries.length > 0) parts.push(`${filters.industries.length} Industr${filters.industries.length > 1 ? 'ies' : 'y'}`);
    if (filters.groups.length > 0) parts.push(`${filters.groups.length} Group${filters.groups.length > 1 ? 's' : ''}`);
    if (filters.offices.length > 0) parts.push(`${filters.offices.length} Office${filters.offices.length > 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* First Row: Search and Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-forvis-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code, or group..."
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
          {/* Industry Filter */}
          <MultiSelect
            options={industryOptions}
            value={filters.industries}
            onChange={handleIndustriesChange}
            placeholder="All Industries"
            searchPlaceholder="Search industries..."
          />

          {/* Group Filter */}
          <MultiSelect
            options={groupOptions}
            value={filters.groups}
            onChange={handleGroupsChange}
            placeholder="All Groups"
            searchPlaceholder="Search groups..."
          />

          {/* Office Location Filter */}
          <MultiSelect
            options={officeOptions}
            value={filters.offices}
            onChange={handleOfficesChange}
            placeholder="All Offices"
            searchPlaceholder="Search offices..."
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
