'use client';

import React from 'react';
import { X, Filter } from 'lucide-react';
import { SearchMultiCombobox, SearchMultiComboboxOption } from '@/components/ui/SearchMultiCombobox';
import { useGroupFilters } from '@/hooks/groups/useGroupFilters';

export interface GroupsFiltersType {
  groups: string[];  // Group codes
}

export interface GroupsFiltersProps {
  filters: GroupsFiltersType;
  onFiltersChange: (filters: GroupsFiltersType) => void;
}

export function GroupsFilters({
  filters,
  onFiltersChange,
}: GroupsFiltersProps) {
  const [groupSearch, setGroupSearch] = React.useState('');

  // Fetch group filter options
  const { data: groupFiltersData, isLoading } = useGroupFilters({
    search: groupSearch,
  });

  const handleGroupsChange = (values: (string | number)[]) => {
    onFiltersChange({ ...filters, groups: values as string[] });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      groups: [],
    });
  };

  const hasActiveFilters = filters.groups.length > 0;

  // Convert data to SearchMultiCombobox options
  const groupOptions: SearchMultiComboboxOption[] = (groupFiltersData?.groups || []).map(group => ({
    id: group.code,
    label: `${group.code} - ${group.name}`,
  }));

  // Generate active filters summary
  const getActiveFiltersSummary = () => {
    if (filters.groups.length > 0) {
      return `${filters.groups.length} Group${filters.groups.length > 1 ? 's' : ''}`;
    }
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* Filter Row: Group */}
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-md">
            <SearchMultiCombobox
              value={filters.groups}
              onChange={handleGroupsChange}
              onSearchChange={setGroupSearch}
              options={groupOptions}
              placeholder="Filter by Group"
              searchPlaceholder="Search by code or name..."
              minimumSearchChars={2}
              isLoading={isLoading}
              emptyMessage={groupSearch.length < 2 ? "Type 2+ characters to search groups" : "No groups found"}
              metadata={groupFiltersData?.metadata}
            />
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








