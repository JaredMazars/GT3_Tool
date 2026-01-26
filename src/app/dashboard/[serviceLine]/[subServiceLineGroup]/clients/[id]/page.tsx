'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRight,
  Folder,
  FileText,
  BarChart3,
  Users,
  Clock,
  Plus,
  Search,
  ChartSpline,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { TaskStageIndicator } from '@/components/features/tasks/TaskStageIndicator';
import { TaskStage } from '@/types/task-stages';
import { LoadingSpinner, Button } from '@/components/ui';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { ServiceLine } from '@/types';
import { CreateTaskModal } from '@/components/features/tasks/CreateTaskModal';
import { ClientHeader } from '@/components/features/clients/ClientHeader';
import { useClient, clientKeys, type ClientWithTasks } from '@/hooks/clients/useClients';
import { taskListKeys } from '@/hooks/tasks/useTasks';
import { useLatestCreditRating } from '@/hooks/analytics/useClientAnalytics';
import { CreditRatingGrade } from '@/types/analytics';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { TaskListItem } from '@/components/features/tasks/TaskListItem';
import { clientWipKeys } from '@/hooks/clients/useClientWip';
import { clientDebtorsKeys } from '@/hooks/clients/useClientDebtors';
import { clientGraphDataKeys } from '@/hooks/clients/useClientGraphData';
import { EmployeeStatusBadge } from '@/components/shared/EmployeeStatusBadge';
import { ClientAcceptanceCard } from '@/components/features/clients/ClientAcceptanceCard';
import { Banner } from '@/components/ui';
import { useClientAcceptanceStatus } from '@/hooks/acceptance/useClientAcceptanceStatus';
import { GRADIENTS } from '@/lib/design-system/gradients';

export default function ServiceLineClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const GSClientID = params.id as string;
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params.subServiceLineGroup as string;
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'other'>('current');
  const [taskPage, setTaskPage] = useState(1);
  const [taskLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch sub-service line groups to get the description
  const { data: subGroups, isLoading: isLoadingSubGroups } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine,
  });
  
  // Find the current sub-service line group to get its description
  const currentSubGroup = subGroups?.find(sg => sg.code === subServiceLineGroup);
  const subServiceLineGroupDescription = currentSubGroup?.description || subServiceLineGroup;
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Fetch client using React Query hook with task pagination
  const { data: clientData, isLoading, isFetching, error } = useClient(GSClientID, {
    taskPage,
    taskLimit,
  });

  // Fetch latest credit rating
  const { data: latestRating, isLoading: isLoadingRating } = useLatestCreditRating(GSClientID);
  
  // Fetch client acceptance status
  const { data: clientAcceptanceStatus, isLoading: isLoadingAcceptance } = useClientAcceptanceStatus(GSClientID);
  
  // Use client data directly
  const client: any = useMemo(() => {
    if (!clientData) return null;
    return clientData;
  }, [clientData]);
  
  const taskPagination = clientData?.taskPagination;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset search when switching tabs
  useEffect(() => {
    setSearchTerm('');
    setDebouncedSearch('');
  }, [activeTab]);

  // Helper function to get rating badge color
  const getRatingBadgeColor = (grade: CreditRatingGrade): string => {
    switch (grade) {
      case CreditRatingGrade.AAA:
      case CreditRatingGrade.AA:
      case CreditRatingGrade.A:
        return 'bg-forvis-success-100 text-forvis-success-800';
      case CreditRatingGrade.BBB:
      case CreditRatingGrade.BB:
      case CreditRatingGrade.B:
        return 'bg-forvis-warning-100 text-forvis-warning-800';
      case CreditRatingGrade.CCC:
      case CreditRatingGrade.D:
        return 'bg-forvis-error-100 text-forvis-error-800';
      default:
        return 'bg-forvis-gray-100 text-forvis-gray-800';
    }
  };

  // Placeholder function - returns random stage for demo
  const getProjectStage = (taskId: number): TaskStage => {
    const stages: TaskStage[] = [
      TaskStage.ENGAGE,
      TaskStage.IN_PROGRESS,
      TaskStage.UNDER_REVIEW,
      TaskStage.COMPLETED,
      TaskStage.ARCHIVED,
    ];
    // Simple hash to keep stage consistent per project
    const stage = stages[taskId % stages.length];
    return stage || TaskStage.ENGAGE;
  };


  const handleTaskCreated = async (task: any) => {
    // Invalidate ALL client detail queries for this client (matches any params)
    await queryClient.invalidateQueries({ 
      queryKey: ['clients', 'v2', GSClientID],
      refetchType: 'active',
    });
    
    // Close modal - let the useCreateTask hook handle other invalidations
    setShowCreateModal(false);
  };

  // Get tasks filtered by sub-service line group
  // Add safeguards to prevent errors when data is not yet loaded
  const currentSubServiceLineTasks = useMemo(() => {
    if (!client || !client.tasks || !subServiceLineGroup) return [];
    const allTasks = client.tasks || [];
    
    // Filter tasks that belong to the current sub-service line group
    return allTasks.filter((task: any) => {
      const taskSubGroup = task.subServiceLineGroupCode || task.SLGroup;
      if (!taskSubGroup) return false;
      // Case-insensitive comparison with trimming
      return taskSubGroup.trim().toUpperCase() === subServiceLineGroup.trim().toUpperCase();
    });
  }, [client, subServiceLineGroup]);

  const otherTasks = useMemo(() => {
    if (!client || !client.tasks || !subServiceLineGroup) return [];
    const allTasks = client.tasks || [];
    
    // Filter tasks that don't belong to the current sub-service line group
    return allTasks.filter((task: any) => {
      const taskSubGroup = task.subServiceLineGroupCode || task.SLGroup;
      if (!taskSubGroup) return false;
      // Case-insensitive comparison with trimming
      return taskSubGroup.trim().toUpperCase() !== subServiceLineGroup.trim().toUpperCase();
    });
  }, [client, subServiceLineGroup]);

  // Get tasks for the active tab
  const getTasksForTab = () => {
    return activeTab === 'current' ? currentSubServiceLineTasks : otherTasks;
  };

  // Filter tasks by search term
  const filteredTasks = useMemo(() => {
    const tasks = getTasksForTab();
    if (!debouncedSearch) return tasks;
    
    const searchLower = debouncedSearch.toLowerCase();
    return tasks.filter((task: any) => {
      return (
        task.TaskDesc?.toLowerCase().includes(searchLower) ||
        task.TaskCode?.toLowerCase().includes(searchLower) ||
        task.Active?.toLowerCase().includes(searchLower)
      );
    });
  }, [debouncedSearch, client, activeTab, currentSubServiceLineTasks, otherTasks]);

  // Show skeleton loader on initial load for better perceived performance
  if (isLoading && !client) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-4 w-20 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-forvis-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Header skeleton */}
          <div className="card mb-6">
            <div className="px-6 py-4">
              <div className="h-8 w-64 bg-forvis-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-48 bg-forvis-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column skeleton */}
            <div className="lg:col-span-1">
              <div className="card h-full">
                <div className="px-4 py-3 border-b border-forvis-gray-200">
                  <div className="h-5 w-40 bg-forvis-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="px-4 py-3 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-full bg-forvis-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column skeleton */}
            <div className="lg:col-span-2">
              <div className="card" style={{ height: '600px' }}>
                <div className="px-4 py-3 border-b border-forvis-gray-200">
                  <div className="h-5 w-32 bg-forvis-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 bg-forvis-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Client Not Found</h2>
          <p className="mt-2 text-gray-600">The client you're looking for doesn't exist.</p>
          <Link 
            href={isSharedService(serviceLine) 
              ? `/dashboard/${serviceLine.toLowerCase()}/clients` 
              : `/dashboard/${serviceLine.toLowerCase()}`
            } 
            className="mt-4 inline-block text-forvis-blue-600 hover:text-forvis-blue-700"
          >
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}`} 
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {subServiceLineGroupDescription}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">{client.clientNameFull || client.clientCode}</span>
        </nav>

        {/* Client Header */}
        <ClientHeader client={client} tasks={client.tasks} />

        {/* Create Task Modal */}
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTaskCreated}
          initialClientId={client ? client.id : null}
          initialServiceLine={serviceLine as ServiceLine}
          initialSubServiceLineGroup={subServiceLineGroup}
        />

        {/* Client Acceptance Section */}
        <div className="mb-6">
          <ClientAcceptanceCard
            GSClientID={GSClientID}
            clientCode={client.clientCode}
            clientName={client.clientNameFull}
          />
        </div>

        {/* Warning Banner - Show when client acceptance is not approved */}
        {!isLoadingAcceptance && !clientAcceptanceStatus?.approved && (
          <div className="mb-6">
            <Banner
              variant="warning"
              message={
                clientAcceptanceStatus?.exists && clientAcceptanceStatus?.completed
                  ? "Tasks are locked pending Client Acceptance approval. Once approved by the Partner, all tasks will become accessible."
                  : "Tasks are locked until Client Acceptance is completed and approved. Complete the risk assessment above to unlock task creation and access."
              }
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Left Column - Client Information (Extended) */}
          <div className="lg:col-span-1 self-stretch">
            <div className="card h-full flex flex-col">
              <div className="px-4 py-3 border-b border-forvis-gray-200 flex-shrink-0">
                <h2 className="text-base font-semibold text-forvis-gray-900">Client Information</h2>
              </div>
              <div className="px-4 py-3 flex-1">
                <dl className="space-y-3">
                  {/* Basic Information */}
                  <div>
                    <dt className="text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider mb-2">Basic Information</dt>
                    <div className="space-y-2 ml-2">
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Status</dt>
                        <dd className="mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            client.active === 'Yes' 
                              ? 'bg-forvis-success-100 text-forvis-success-700' 
                              : 'bg-forvis-error-100 text-forvis-error-700'
                          }`}>
                            {client.active === 'Yes' ? 'Active' : 'Inactive'}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Office Costing</dt>
                        <dd className="mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            client.clientOCFlag 
                              ? 'bg-forvis-success-100 text-forvis-success-700' 
                              : 'bg-forvis-gray-100 text-forvis-gray-700'
                          }`}>
                            {client.clientOCFlag ? 'Yes' : 'No'}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Tax</dt>
                        <dd className="mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            client.clientTaxFlag 
                              ? 'bg-forvis-success-100 text-forvis-success-700' 
                              : 'bg-forvis-gray-100 text-forvis-gray-700'
                          }`}>
                            {client.clientTaxFlag ? 'Yes' : 'No'}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Secretarial</dt>
                        <dd className="mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            client.clientSecFlag 
                              ? 'bg-forvis-success-100 text-forvis-success-700' 
                              : 'bg-forvis-gray-100 text-forvis-gray-700'
                          }`}>
                            {client.clientSecFlag ? 'Yes' : 'No'}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Credit Rating</dt>
                        <dd className="mt-0.5">
                          {isLoadingRating ? (
                            <div className="animate-pulse h-5 bg-forvis-gray-200 rounded w-32"></div>
                          ) : latestRating ? (
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                getRatingBadgeColor(latestRating.ratingGrade)
                              }`}>
                                {latestRating.ratingGrade}
                              </span>
                              <span className="text-sm text-forvis-gray-900 font-medium">
                                {latestRating.ratingScore}/100
                              </span>
                              <span className="text-xs text-forvis-gray-500">
                                ({Math.round(latestRating.confidence * 100)}% confidence)
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-forvis-gray-500 italic">Not available</span>
                          )}
                        </dd>
                      </div>
                      {client.clientDateOpen && (
                        <div>
                          <dt className="text-xs font-medium text-forvis-gray-500">Date Opened</dt>
                          <dd className="mt-0.5 text-sm text-forvis-gray-900">{formatDate(client.clientDateOpen)}</dd>
                        </div>
                      )}
                      {client.clientDateTerminate && (
                        <div>
                          <dt className="text-xs font-medium text-forvis-gray-500">Date Terminated</dt>
                          <dd className="mt-0.5 text-sm text-forvis-gray-900">{formatDate(client.clientDateTerminate)}</dd>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group & Type */}
                  <div>
                    <dt className="text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider mb-2">Group & Type</dt>
                    <div className="space-y-2 ml-2">
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Group</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.groupDesc} ({client.groupCode})</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Type</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.typeDesc} ({client.typeCode})</dd>
                      </div>
                    </div>
                  </div>

                  {/* Team */}
                  <div>
                    <dt className="text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider mb-2">Team</dt>
                    <div className="space-y-2 ml-2">
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Partner</dt>
                        <dd className="mt-0.5 text-sm">
                          <EmployeeStatusBadge
                            name={`${client.clientPartnerName || client.clientPartner} [${client.clientPartner}]`}
                            isActive={client.clientPartnerStatus?.isActive ?? true}
                            hasUserAccount={client.clientPartnerStatus?.hasUserAccount ?? false}
                            variant="text"
                            iconSize="sm"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Manager</dt>
                        <dd className="mt-0.5 text-sm">
                          <EmployeeStatusBadge
                            name={`${client.clientManagerName || client.clientManager} [${client.clientManager}]`}
                            isActive={client.clientManagerStatus?.isActive ?? true}
                            hasUserAccount={client.clientManagerStatus?.hasUserAccount ?? false}
                            variant="text"
                            iconSize="sm"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">In-Charge</dt>
                        <dd className="mt-0.5 text-sm">
                          <EmployeeStatusBadge
                            name={`${client.clientInchargeName || client.clientIncharge} [${client.clientIncharge}]`}
                            isActive={client.clientInchargeStatus?.isActive ?? true}
                            hasUserAccount={client.clientInchargeStatus?.hasUserAccount ?? false}
                            variant="text"
                            iconSize="sm"
                          />
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Industry */}
                  {(client.forvisMazarsIndustry || client.forvisMazarsSector || client.forvisMazarsSubsector) && (
                    <div>
                      <dt className="text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider mb-2">Industry</dt>
                      <div className="space-y-2 ml-2">
                        {client.forvisMazarsIndustry && (
                          <div>
                            <dt className="text-xs font-medium text-forvis-gray-500">Forvis Mazars Industry</dt>
                            <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.forvisMazarsIndustry}</dd>
                          </div>
                        )}
                        {client.forvisMazarsSector && (
                          <div>
                            <dt className="text-xs font-medium text-forvis-gray-500">Forvis Mazars Sector</dt>
                            <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.forvisMazarsSector}</dd>
                          </div>
                        )}
                        {client.forvisMazarsSubsector && (
                          <div>
                            <dt className="text-xs font-medium text-forvis-gray-500">Forvis Mazars Subsector</dt>
                            <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.forvisMazarsSubsector}</dd>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </dl>
              </div>
            </div>
          </div>

          {/* Right Column - Projects and 4-Card Grid */}
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            {/* Projects Section with Fixed Height */}
            <div className="card flex-shrink-0" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <div className="px-4 py-3 border-b border-forvis-gray-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-base font-semibold text-forvis-gray-900">
                  Tasks ({client._count?.Task || 0})
                </h2>
                <div className="relative group">
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    variant="gradient"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                    disabled={!clientAcceptanceStatus?.approved}
                    title={!clientAcceptanceStatus?.approved ? 'Client Acceptance must be completed and approved before creating tasks' : undefined}
                  >
                    New Task
                  </Button>
                  {!clientAcceptanceStatus?.approved && (
                    <div className="hidden group-hover:block absolute z-10 bottom-full mb-2 right-0 w-64 p-2 text-xs text-white bg-forvis-gray-900 rounded-lg shadow-lg">
                      Client Acceptance must be completed and approved before creating tasks
                    </div>
                  )}
                </div>
              </div>

              {/* Task Tabs - Current Sub-Service Line vs Other Tasks */}
              <div className="border-b border-forvis-gray-200 flex-shrink-0">
                {isLoadingSubGroups ? (
                  // Loading skeleton for tabs
                  <nav className="flex -mb-px px-4" aria-label="Task Categories">
                    <div className="flex items-center space-x-2 px-4 py-3">
                      <div className="h-5 w-32 bg-forvis-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-8 bg-forvis-gray-200 rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex items-center space-x-2 px-4 py-3">
                      <div className="h-5 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-8 bg-forvis-gray-200 rounded-full animate-pulse"></div>
                    </div>
                  </nav>
                ) : (
                  <nav className="flex -mb-px px-4" aria-label="Task Categories">
                    <button
                      onClick={() => setActiveTab('current')}
                      className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === 'current'
                          ? 'border-forvis-blue-600 text-forvis-blue-600'
                          : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                      }`}
                    >
                      <span>{subServiceLineGroupDescription}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        activeTab === 'current'
                          ? 'bg-forvis-blue-100 text-forvis-blue-700'
                          : 'bg-forvis-gray-100 text-forvis-gray-600'
                      }`}>
                        {currentSubServiceLineTasks.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('other')}
                      className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === 'other'
                          ? 'border-forvis-blue-600 text-forvis-blue-600'
                          : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                      }`}
                    >
                      <span>Other Tasks</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        activeTab === 'other'
                          ? 'bg-forvis-blue-100 text-forvis-blue-700'
                          : 'bg-forvis-gray-100 text-forvis-gray-600'
                      }`}>
                        {otherTasks.length}
                      </span>
                    </button>
                  </nav>
                )}
              </div>

              {/* Search Bar */}
              <div className="px-4 pt-4 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tasks by name, type, tax year, or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent text-sm"
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 text-sm text-forvis-gray-600">
                    Found <span className="font-medium">{filteredTasks.length}</span>{' '}
                    task{filteredTasks.length !== 1 ? 's' : ''} matching "{searchTerm}"
                  </div>
                )}
              </div>

              {/* Scrollable Tasks List */}
              <div className="p-4 overflow-y-auto flex-1">
                {isFetching && !isLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner size="md" className="mx-auto" />
                    <p className="mt-2 text-sm font-normal text-forvis-gray-600">Loading tasks...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Folder className="mx-auto h-12 w-12 text-forvis-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                      {searchTerm ? 'No tasks found' : activeTab === 'current' ? `No tasks in ${subServiceLineGroupDescription}` : 'No other tasks'}
                    </h3>
                    <p className="mt-1 text-sm text-forvis-gray-600">
                      {searchTerm 
                        ? `No tasks match your search "${searchTerm}".`
                        : activeTab === 'current'
                          ? `This client doesn't have any tasks in ${subServiceLineGroupDescription} yet.`
                          : 'This client doesn\'t have any tasks in other sub-service line groups.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task: any) => {
                      const taskStage = getProjectStage(task.id);
                      
                      return (
                        <TaskListItem
                          key={task.id}
                          task={task}
                          GSClientID={GSClientID}
                          currentSubServiceLineGroup={subServiceLineGroup}
                          serviceLine={serviceLine}
                          currentSubServiceLineGroupDescription={subServiceLineGroupDescription}
                          showClientInfo={false}
                          showPartnerManager={true}
                          masterServiceLine={task.masterServiceLine}
                          additionalBadge={<TaskStageIndicator stage={taskStage} />}
                          isLocked={!clientAcceptanceStatus?.approved}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 4-Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
              {/* Documents Card */}
              <Link 
                href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${GSClientID}/documents`}
                className="card hover:shadow-lg hover:border-forvis-blue-500 transition-all duration-200 ease-in-out cursor-pointer group"
              >
                <div className="p-4 text-center">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm transition-transform duration-200 group-hover:scale-110"
                    style={{ background: GRADIENTS.icon.standard }}
                  >
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Documents</h3>
                  <p className="text-xs text-forvis-gray-500">View & download</p>
                </div>
              </Link>

              {/* Reports Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 bg-forvis-gray-200">
                    <BarChart3 className="h-6 w-6 text-forvis-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Reports</h3>
                  <p className="text-xs text-forvis-gray-500">Coming Soon</p>
                </div>
              </div>

              {/* Analytics Card */}
              <Link 
                href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${GSClientID}/analytics`}
                className="card hover:shadow-lg hover:border-forvis-blue-500 transition-all duration-200 ease-in-out cursor-pointer group"
                prefetch={true}
                onMouseEnter={() => {
                  // Prefetch analytics data on hover for instant loading
                  queryClient.prefetchQuery({
                    queryKey: clientWipKeys.detail(GSClientID),
                    queryFn: async () => {
                      const response = await fetch(`/api/clients/${GSClientID}/wip`);
                      if (!response.ok) return null;
                      const result = await response.json();
                      return result.success ? result.data : null;
                    },
                  });
                  queryClient.prefetchQuery({
                    queryKey: clientDebtorsKeys.detail(GSClientID),
                    queryFn: async () => {
                      const response = await fetch(`/api/clients/${GSClientID}/debtors`);
                      if (!response.ok) return null;
                      const result = await response.json();
                      return result.success ? result.data : null;
                    },
                  });
                }}
              >
                <div className="p-4 text-center">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm transition-transform duration-200 group-hover:scale-110"
                    style={{ background: GRADIENTS.icon.standard }}
                  >
                    <ChartSpline className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Analytics</h3>
                  <p className="text-xs text-forvis-gray-500">Credit ratings & analysis</p>
                </div>
              </Link>

              {/* Contacts Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 bg-forvis-gray-200">
                    <Users className="h-6 w-6 text-forvis-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Contacts</h3>
                  <p className="text-xs text-forvis-gray-500">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

