'use client';

import { Users, Building2, Calendar, List, Filter, X } from 'lucide-react';
import { MultiSelect, Button, LoadingSpinner } from '@/components/ui';
import type { MultiSelectOption } from '@/components/ui/MultiSelect';
import { NonClientEventType, NON_CLIENT_EVENT_CONFIG } from '@/types';
import { useEmployeePlannerFilters } from '@/hooks/planning/useEmployeePlannerFilters';
import { useClientPlannerFilters } from '@/hooks/planning/useClientPlannerFilters';

export interface EmployeePlannerFilters {
  employees: string[];
  jobGrades: string[];
  offices: string[];
  clients: string[];
  taskCategories: string[];
}

export interface ClientPlannerFilters {
  clients: string[];
  groups: string[];
  partners: string[];
  tasks: string[];
  managers: string[];
}

interface PlannerFiltersProps {
  // Service line context (needed for fetching filters)
  serviceLine: string;
  subServiceLineGroup: string;
  
  // View controls
  plannerView: 'employees' | 'clients';
  onPlannerViewChange: (view: 'employees' | 'clients') => void;
  viewMode: 'timeline' | 'list';
  onViewModeChange: (mode: 'timeline' | 'list') => void;
  
  // Employee planner
  employeeFilters?: EmployeePlannerFilters;
  onEmployeeFiltersChange?: (filters: EmployeePlannerFilters) => void;
  
  // Client planner
  clientFilters?: ClientPlannerFilters;
  onClientFiltersChange?: (filters: ClientPlannerFilters) => void;
  
  // Stats
  teamCount?: number;
}

export function PlannerFilters({
  serviceLine,
  subServiceLineGroup,
  plannerView,
  onPlannerViewChange,
  viewMode,
  onViewModeChange,
  employeeFilters,
  onEmployeeFiltersChange,
  clientFilters,
  onClientFiltersChange,
  teamCount,
}: PlannerFiltersProps) {
  // Fetch employee filter options from server
  const { 
    data: employeeFilterOptions,
    isLoading: isLoadingEmployeeOptions 
  } = useEmployeePlannerFilters({
    serviceLine,
    subServiceLineGroup,
    enabled: plannerView === 'employees'
  });

  // Fetch client filter options from server
  const { 
    data: clientFilterOptions,
    isLoading: isLoadingClientOptions 
  } = useClientPlannerFilters({
    serviceLine,
    subServiceLineGroup,
    enabled: plannerView === 'clients'
  });
  const hasEmployeeFilters = employeeFilters && (
    employeeFilters.employees.length > 0 ||
    employeeFilters.jobGrades.length > 0 ||
    employeeFilters.offices.length > 0 ||
    employeeFilters.clients.length > 0 ||
    employeeFilters.taskCategories.length > 0
  );

  const hasClientFilters = clientFilters && (
    clientFilters.clients.length > 0 ||
    clientFilters.groups.length > 0 ||
    clientFilters.partners.length > 0 ||
    clientFilters.tasks.length > 0 ||
    clientFilters.managers.length > 0
  );

  const employeeFilterCount = employeeFilters 
    ? employeeFilters.employees.length +
      employeeFilters.jobGrades.length +
      employeeFilters.offices.length +
      employeeFilters.clients.length +
      (employeeFilters.taskCategories.length > 0 ? 1 : 0)
    : 0;

  const clientFilterCount = clientFilters
    ? clientFilters.clients.length +
      clientFilters.groups.length +
      clientFilters.partners.length +
      clientFilters.tasks.length +
      clientFilters.managers.length
    : 0;

  const handleClearEmployeeFilters = () => {
    if (onEmployeeFiltersChange) {
      onEmployeeFiltersChange({
        employees: [],
        jobGrades: [],
        offices: [],
        clients: [],
        taskCategories: []
      });
    }
  };

  const handleClearClientFilters = () => {
    if (onClientFiltersChange) {
      onClientFiltersChange({
        clients: [],
        groups: [],
        partners: [],
        tasks: [],
        managers: []
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* First Row: View Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Planner View Toggle (Employees/Clients) */}
          <div className="inline-flex rounded-lg border border-forvis-gray-300 bg-white">
            <button
              onClick={() => onPlannerViewChange('employees')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${
                plannerView === 'employees'
                  ? 'bg-forvis-blue-600 text-white'
                  : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Employees</span>
            </button>
            <button
              onClick={() => onPlannerViewChange('clients')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-r-lg border-l border-forvis-gray-300 transition-colors ${
                plannerView === 'clients'
                  ? 'bg-forvis-blue-600 text-white'
                  : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Clients</span>
            </button>
          </div>

          {/* View Mode Toggle (Timeline/List) */}
          <div className="inline-flex rounded-lg border border-forvis-gray-300 bg-white">
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-forvis-blue-600 text-white'
                  : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
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
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Team Count (for employee view) */}
          {plannerView === 'employees' && teamCount !== undefined && (
            <div className="text-right">
              <div className="text-lg font-bold text-forvis-blue-600">
                {teamCount}
              </div>
              <div className="text-xs text-forvis-gray-600">
                Team {teamCount === 1 ? 'Member' : 'Members'}
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          {((plannerView === 'employees' && hasEmployeeFilters) || 
            (plannerView === 'clients' && hasClientFilters)) && (
            <button
              onClick={plannerView === 'employees' ? handleClearEmployeeFilters : handleClearClientFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forvis-gray-700 bg-forvis-gray-100 rounded-lg hover:bg-forvis-gray-200 transition-colors"
              title="Clear all filters"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Second Row: Filters */}
        {plannerView === 'employees' && employeeFilters && onEmployeeFiltersChange && employeeFilterOptions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            <MultiSelect
              options={employeeFilterOptions.employees}
              value={employeeFilters.employees}
              onChange={(values) => onEmployeeFiltersChange({ ...employeeFilters, employees: values as string[] })}
              placeholder="All Employees"
              searchPlaceholder="Search employees..."
            />
            
            <MultiSelect
              options={employeeFilterOptions.jobGrades}
              value={employeeFilters.jobGrades}
              onChange={(values) => onEmployeeFiltersChange({ ...employeeFilters, jobGrades: values as string[] })}
              placeholder="All Job Grades"
              searchPlaceholder="Search job grades..."
            />
            
            <MultiSelect
              options={employeeFilterOptions.offices}
              value={employeeFilters.offices}
              onChange={(values) => onEmployeeFiltersChange({ ...employeeFilters, offices: values as string[] })}
              placeholder="All Offices"
              searchPlaceholder="Search offices..."
            />
            
            <MultiSelect
              options={employeeFilterOptions.clients}
              value={employeeFilters.clients}
              onChange={(values) => onEmployeeFiltersChange({ ...employeeFilters, clients: values as string[] })}
              placeholder="All Clients"
              searchPlaceholder="Search clients..."
            />

            <MultiSelect
              options={[
                { id: 'client', label: 'Client Tasks' },
                { id: NonClientEventType.TRAINING, label: NON_CLIENT_EVENT_CONFIG[NonClientEventType.TRAINING].label },
                { id: NonClientEventType.ANNUAL_LEAVE, label: NON_CLIENT_EVENT_CONFIG[NonClientEventType.ANNUAL_LEAVE].label },
                { id: NonClientEventType.SICK_LEAVE, label: NON_CLIENT_EVENT_CONFIG[NonClientEventType.SICK_LEAVE].label },
                { id: NonClientEventType.PUBLIC_HOLIDAY, label: NON_CLIENT_EVENT_CONFIG[NonClientEventType.PUBLIC_HOLIDAY].label },
                { id: NonClientEventType.PERSONAL, label: NON_CLIENT_EVENT_CONFIG[NonClientEventType.PERSONAL].label },
                { id: NonClientEventType.ADMINISTRATIVE, label: NON_CLIENT_EVENT_CONFIG[NonClientEventType.ADMINISTRATIVE].label },
                { id: 'no_planning', label: 'No Planning' }
              ]}
              value={employeeFilters.taskCategories}
              onChange={(values) => onEmployeeFiltersChange({ ...employeeFilters, taskCategories: values as string[] })}
              placeholder="All Task Types"
              searchPlaceholder="Search task types..."
            />
          </div>
        ) : plannerView === 'clients' && clientFilters && onClientFiltersChange && clientFilterOptions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            <MultiSelect
              options={clientFilterOptions.tasks || []}
              value={clientFilters.tasks}
              onChange={(values) => onClientFiltersChange({ ...clientFilters, tasks: values as string[] })}
              placeholder="All Projects"
              searchPlaceholder="Search projects..."
              disabled={isLoadingClientOptions}
            />
            
            <MultiSelect
              options={clientFilterOptions.clients || []}
              value={clientFilters.clients}
              onChange={(values) => onClientFiltersChange({ ...clientFilters, clients: values as string[] })}
              placeholder="All Clients"
              searchPlaceholder="Search clients..."
              disabled={isLoadingClientOptions}
            />
            
            <MultiSelect
              options={clientFilterOptions.groups || []}
              value={clientFilters.groups}
              onChange={(values) => onClientFiltersChange({ ...clientFilters, groups: values as string[] })}
              placeholder="All Groups"
              searchPlaceholder="Search groups..."
              disabled={isLoadingClientOptions}
            />
            
            <MultiSelect
              options={clientFilterOptions.partners || []}
              value={clientFilters.partners}
              onChange={(values) => onClientFiltersChange({ ...clientFilters, partners: values as string[] })}
              placeholder="All Partners"
              searchPlaceholder="Search partners..."
              disabled={isLoadingClientOptions}
            />
            
            <MultiSelect
              options={clientFilterOptions.managers || []}
              value={clientFilters.managers}
              onChange={(values) => onClientFiltersChange({ ...clientFilters, managers: values as string[] })}
              placeholder="All Managers"
              searchPlaceholder="Search managers..."
              disabled={isLoadingClientOptions}
            />
          </div>
        ) : null}

        {/* Active Filters Indicator */}
        {((plannerView === 'employees' && hasEmployeeFilters) || 
          (plannerView === 'clients' && hasClientFilters)) && (
          <div className="flex items-center gap-2 text-xs text-forvis-gray-600">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-medium">
              {plannerView === 'employees' ? employeeFilterCount : clientFilterCount} filter
              {(plannerView === 'employees' ? employeeFilterCount : clientFilterCount) !== 1 ? 's' : ''} active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}








