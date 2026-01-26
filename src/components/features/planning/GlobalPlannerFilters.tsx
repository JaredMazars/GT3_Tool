'use client';

import { Users, Building2, Calendar, List, X, Globe } from 'lucide-react';
import { MultiSelect } from '@/components/ui';
import { NonClientEventType, NON_CLIENT_EVENT_CONFIG } from '@/types';
import { useGlobalEmployeePlannerFilters } from '@/hooks/planning/useGlobalEmployeePlannerFilters';
import { useGlobalClientPlannerFilters } from '@/hooks/planning/useGlobalClientPlannerFilters';

export interface GlobalEmployeePlannerFilters {
  employees: string[];
  jobGrades: string[];
  offices: string[];
  clients: string[];
  taskCategories: string[];
  serviceLines: string[];
  subServiceLineGroups: string[];
}

export interface GlobalClientPlannerFilters {
  clients: string[];
  groups: string[];
  partners: string[];
  tasks: string[];
  managers: string[];
  serviceLines: string[];
  subServiceLineGroups: string[];
}

interface GlobalPlannerFiltersProps {
  plannerView: 'employees' | 'clients';
  onPlannerViewChange: (view: 'employees' | 'clients') => void;
  viewMode: 'timeline' | 'list';
  onViewModeChange: (mode: 'timeline' | 'list') => void;
  employeeFilters?: GlobalEmployeePlannerFilters;
  onEmployeeFiltersChange?: (filters: GlobalEmployeePlannerFilters) => void;
  clientFilters?: GlobalClientPlannerFilters;
  onClientFiltersChange?: (filters: GlobalClientPlannerFilters) => void;
  teamCount?: number;
}

export function GlobalPlannerFilters(props: GlobalPlannerFiltersProps) {
  const { plannerView, onPlannerViewChange, viewMode, onViewModeChange, employeeFilters, onEmployeeFiltersChange, clientFilters, onClientFiltersChange, teamCount } = props;
  const { data: employeeFilterOptions } = useGlobalEmployeePlannerFilters({ enabled: plannerView === 'employees' });
  const { data: clientFilterOptions } = useGlobalClientPlannerFilters({ enabled: plannerView === 'clients' });

  const hasEmployeeFilters = employeeFilters && (employeeFilters.employees.length > 0 || employeeFilters.serviceLines.length > 0 || employeeFilters.subServiceLineGroups.length > 0);
  const hasClientFilters = clientFilters && (clientFilters.clients.length > 0 || clientFilters.serviceLines.length > 0 || clientFilters.subServiceLineGroups.length > 0);
  const filterCount = plannerView === 'employees' 
    ? (employeeFilters?.employees.length || 0) + (employeeFilters?.serviceLines.length || 0) + (employeeFilters?.subServiceLineGroups.length || 0)
    : (clientFilters?.clients.length || 0) + (clientFilters?.serviceLines.length || 0) + (clientFilters?.subServiceLineGroups.length || 0);

  const handleClearFilters = () => {
    if (plannerView === 'employees' && onEmployeeFiltersChange) {
      onEmployeeFiltersChange({ employees: [], jobGrades: [], offices: [], clients: [], taskCategories: [], serviceLines: [], subServiceLineGroups: [] });
    } else if (onClientFiltersChange) {
      onClientFiltersChange({ clients: [], groups: [], partners: [], tasks: [], managers: [], serviceLines: [], subServiceLineGroups: [] });
    }
  };

  // Get service line filter labels for display
  const activeServiceLineLabels = plannerView === 'employees'
    ? (employeeFilterOptions?.serviceLines || [])
        .filter(sl => (employeeFilters?.serviceLines || []).includes(String(sl.id)))
        .map(sl => sl.label)
    : (clientFilterOptions?.serviceLines || [])
        .filter(sl => (clientFilters?.serviceLines || []).includes(String(sl.id)))
        .map(sl => sl.label);

  const hasActiveServiceLineFilter = activeServiceLineLabels.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-corporate p-3 mb-4">
      <div className="space-y-2">
        {/* Firm-Wide View Indicator */}
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ 
            background: 'linear-gradient(135deg, rgba(217, 203, 168, 0.15) 0%, rgba(176, 164, 136, 0.15) 100%)',
            borderColor: 'rgba(201, 188, 170, 0.5)'
          }}
        >
          <div 
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)' }}
          >
            <Globe className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-forvis-gray-900">Firm-Wide View</span>
            {hasActiveServiceLineFilter ? (
              <span className="text-xs text-forvis-gray-600 ml-2">
                Filtered to: {activeServiceLineLabels.join(', ')}
              </span>
            ) : (
              <span className="text-xs text-forvis-gray-600 ml-2">
                Viewing all service lines across the organization
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-forvis-gray-300 bg-white">
            <button onClick={() => onPlannerViewChange('employees')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${plannerView === 'employees' ? 'bg-forvis-blue-600 text-white' : 'text-forvis-gray-700 hover:bg-forvis-gray-50'}`}>
              <Users className="h-3.5 w-3.5" /><span>Employees</span>
            </button>
            <button onClick={() => onPlannerViewChange('clients')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-r-lg border-l border-forvis-gray-300 transition-colors ${plannerView === 'clients' ? 'bg-forvis-blue-600 text-white' : 'text-forvis-gray-700 hover:bg-forvis-gray-50'}`}>
              <Building2 className="h-3.5 w-3.5" /><span>Clients</span>
            </button>
          </div>
          <div className="inline-flex rounded-lg border border-forvis-gray-300 bg-white">
            <button onClick={() => onViewModeChange('timeline')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${viewMode === 'timeline' ? 'bg-forvis-blue-600 text-white' : 'text-forvis-gray-700 hover:bg-forvis-gray-50'}`}>
              <Calendar className="h-3.5 w-3.5" /><span>Timeline</span>
            </button>
            <button onClick={() => onViewModeChange('list')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-r-lg border-l border-forvis-gray-300 transition-colors ${viewMode === 'list' ? 'bg-forvis-blue-600 text-white' : 'text-forvis-gray-700 hover:bg-forvis-gray-50'}`}>
              <List className="h-3.5 w-3.5" /><span>List</span>
            </button>
          </div>
          <div className="flex-1"></div>
          {plannerView === 'employees' && teamCount !== undefined && <div className="text-right"><div className="text-lg font-bold text-forvis-blue-600">{teamCount}</div><div className="text-xs text-forvis-gray-600">Team Members</div></div>}
          {(hasEmployeeFilters || hasClientFilters) && <button onClick={handleClearFilters} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forvis-gray-700 bg-forvis-gray-100 rounded-lg hover:bg-forvis-gray-200"><X className="h-3.5 w-3.5" /><span>Clear</span></button>}
        </div>
        {plannerView === 'employees' && employeeFilters && onEmployeeFiltersChange && employeeFilterOptions && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <MultiSelect options={employeeFilterOptions.serviceLines || []} value={employeeFilters.serviceLines} onChange={(v) => onEmployeeFiltersChange({ ...employeeFilters, serviceLines: v as string[], subServiceLineGroups: [] })} placeholder="All Service Lines" />
              <MultiSelect options={employeeFilterOptions.subServiceLineGroups || []} value={employeeFilters.subServiceLineGroups} onChange={(v) => onEmployeeFiltersChange({ ...employeeFilters, subServiceLineGroups: v as string[] })} placeholder="All Sub-Service Line Groups" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              <MultiSelect options={employeeFilterOptions.employees || []} value={employeeFilters.employees} onChange={(v) => onEmployeeFiltersChange({ ...employeeFilters, employees: v as string[] })} placeholder="All Employees" />
              <MultiSelect options={employeeFilterOptions.jobGrades || []} value={employeeFilters.jobGrades} onChange={(v) => onEmployeeFiltersChange({ ...employeeFilters, jobGrades: v as string[] })} placeholder="All Job Grades" />
              <MultiSelect options={employeeFilterOptions.offices || []} value={employeeFilters.offices} onChange={(v) => onEmployeeFiltersChange({ ...employeeFilters, offices: v as string[] })} placeholder="All Offices" />
              <MultiSelect options={employeeFilterOptions.clients || []} value={employeeFilters.clients} onChange={(v) => onEmployeeFiltersChange({ ...employeeFilters, clients: v as string[] })} placeholder="All Clients" />
              <MultiSelect options={[{ id: 'client', label: 'Client Tasks' }, { id: NonClientEventType.TRAINING, label: NON_CLIENT_EVENT_CONFIG[NonClientEventType.TRAINING].label }, { id: NonClientEventType.ANNUAL_LEAVE, label: NON_CLIENT_EVENT_CONFIG[NonClientEventType.ANNUAL_LEAVE].label }, { id: 'no_planning', label: 'No Planning' }]} value={employeeFilters.taskCategories} onChange={(v) => onEmployeeFiltersChange({ ...employeeFilters, taskCategories: v as string[] })} placeholder="All Task Types" />
            </div>
          </>
        )}
        {plannerView === 'clients' && clientFilters && onClientFiltersChange && clientFilterOptions && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <MultiSelect options={clientFilterOptions.serviceLines || []} value={clientFilters.serviceLines} onChange={(v) => onClientFiltersChange({ ...clientFilters, serviceLines: v as string[], subServiceLineGroups: [] })} placeholder="All Service Lines" />
              <MultiSelect options={clientFilterOptions.subServiceLineGroups || []} value={clientFilters.subServiceLineGroups} onChange={(v) => onClientFiltersChange({ ...clientFilters, subServiceLineGroups: v as string[] })} placeholder="All Sub-Service Line Groups" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              <MultiSelect options={clientFilterOptions.tasks || []} value={clientFilters.tasks} onChange={(v) => onClientFiltersChange({ ...clientFilters, tasks: v as string[] })} placeholder="All Projects" />
              <MultiSelect options={clientFilterOptions.clients || []} value={clientFilters.clients} onChange={(v) => onClientFiltersChange({ ...clientFilters, clients: v as string[] })} placeholder="All Clients" />
              <MultiSelect options={clientFilterOptions.groups || []} value={clientFilters.groups} onChange={(v) => onClientFiltersChange({ ...clientFilters, groups: v as string[] })} placeholder="All Groups" />
              <MultiSelect options={clientFilterOptions.partners || []} value={clientFilters.partners} onChange={(v) => onClientFiltersChange({ ...clientFilters, partners: v as string[] })} placeholder="All Partners" />
              <MultiSelect options={clientFilterOptions.managers || []} value={clientFilters.managers} onChange={(v) => onClientFiltersChange({ ...clientFilters, managers: v as string[] })} placeholder="All Managers" />
            </div>
          </>
        )}
        {filterCount > 0 && <div className="text-xs text-forvis-blue-600 font-medium pt-1">{filterCount} filter{filterCount !== 1 ? 's' : ''} active</div>}
      </div>
    </div>
  );
}
