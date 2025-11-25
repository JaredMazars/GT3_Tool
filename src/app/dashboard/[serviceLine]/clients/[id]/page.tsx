'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRightIcon,
  FolderIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import { getProjectTypeColor, formatProjectType, formatDate } from '@/lib/utils/projectUtils';
import { ProjectStageIndicator } from '@/components/features/projects/ProjectStageIndicator';
import { ProjectStage } from '@/types/project-stages';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { ServiceLine } from '@/types';
import { CreateProjectModal } from '@/components/features/projects/CreateProjectModal';
import { ClientHeader } from '@/components/features/clients/ClientHeader';
import { useClient, clientKeys, type ClientWithProjects } from '@/hooks/clients/useClients';
import { projectListKeys } from '@/hooks/projects/useProjects';

export default function ServiceLineClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const queryClient = useQueryClient();
  
  // Determine initial main tab and service line tab based on URL
  const initialIsSharedService = serviceLine ? isSharedService(serviceLine) : false;
  const initialServiceLineTab = serviceLine ? (serviceLine as ServiceLine) : ServiceLine.TAX;
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mainTab, setMainTab] = useState<'service-lines' | 'shared-services'>(
    initialIsSharedService ? 'shared-services' : 'service-lines'
  );
  const [activeServiceLineTab, setActiveServiceLineTab] = useState<ServiceLine>(initialServiceLineTab);
  const [projectPage, setProjectPage] = useState(1);
  const [projectLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Fetch client using React Query hook with project pagination
  const { data: clientData, isLoading, isFetching, error } = useClient(clientId, {
    projectPage,
    projectLimit,
    serviceLine: activeServiceLineTab,
  });
  
  // Transform client data to match expected format
  const client: any = useMemo(() => {
    if (!clientData) return null;
    return {
      ...clientData,
      Project: clientData.projects || [],
    };
  }, [clientData]);
  
  const projectPagination = clientData?.projectPagination;

  // Update active tab when URL serviceLine changes
  useEffect(() => {
    if (serviceLine) {
      setActiveServiceLineTab(serviceLine as ServiceLine);
      setMainTab(isSharedService(serviceLine) ? 'shared-services' : 'service-lines');
    }
  }, [serviceLine]);

  // Reset project page when service line tab changes
  useEffect(() => {
    setProjectPage(1);
  }, [activeServiceLineTab]);

  // Ensure activeServiceLineTab is valid for the current main tab
  useEffect(() => {
    const currentIsShared = isSharedService(activeServiceLineTab);
    const shouldBeShared = mainTab === 'shared-services';
    
    // If the active tab doesn't match the main tab category, switch to the first tab in that category
    if (currentIsShared !== shouldBeShared) {
      const newTab = shouldBeShared ? sharedServices[0] : mainServiceLines[0];
      if (newTab) {
        setActiveServiceLineTab(newTab);
      }
    }
  }, [mainTab]);

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
  }, [activeServiceLineTab, mainTab]);

  // Placeholder function - returns random stage for demo
  const getProjectStage = (projectId: number): ProjectStage => {
    const stages: ProjectStage[] = [
      ProjectStage.DRAFT,
      ProjectStage.IN_PROGRESS,
      ProjectStage.UNDER_REVIEW,
      ProjectStage.COMPLETED,
      ProjectStage.ARCHIVED,
    ];
    // Simple hash to keep stage consistent per project
    const stage = stages[projectId % stages.length];
    return stage || ProjectStage.DRAFT;
  };

  const handleProjectCreated = (project: any) => {
    setShowCreateModal(false);
    // Invalidate client query to refetch and show the new project
    queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) });
    // Also invalidate projects list so it shows up there too
    queryClient.invalidateQueries({ queryKey: projectListKeys.all });
    // Optionally, if the new project is in a different service line tab, switch to it
    if (project.serviceLine) {
      setActiveServiceLineTab(project.serviceLine.toUpperCase() as ServiceLine);
    }
  };

  // Get projects for active tab (already filtered by API based on activeServiceLineTab)
  const getProjectsForTab = () => {
    if (!client) return [];
    return client.Project || [];
  };

  // Get project count for each service line from API response
  const getProjectCountByServiceLine = (sl: ServiceLine) => {
    if (!clientData?.projectCountsByServiceLine) return 0;
    return (clientData.projectCountsByServiceLine as Record<string, number>)[sl] || 0;
  };

  // Define main service lines and shared services
  const mainServiceLines = [
    ServiceLine.TAX,
    ServiceLine.AUDIT,
    ServiceLine.ACCOUNTING,
    ServiceLine.ADVISORY,
  ];
  
  const sharedServices = [
    ServiceLine.QRM,
    ServiceLine.BUSINESS_DEV,
    ServiceLine.IT,
    ServiceLine.FINANCE,
    ServiceLine.HR,
  ];

  // Calculate total counts for main tabs
  const getServiceLinesTotalCount = () => {
    return mainServiceLines.reduce((total, sl) => total + getProjectCountByServiceLine(sl), 0);
  };

  const getSharedServicesTotalCount = () => {
    return sharedServices.reduce((total, sl) => total + getProjectCountByServiceLine(sl), 0);
  };

  // Get active tab list based on main tab selection
  const activeTabList = mainTab === 'service-lines' ? mainServiceLines : sharedServices;

  // Filter projects by search term
  const filteredProjects = useMemo(() => {
    const projects = getProjectsForTab();
    if (!debouncedSearch) return projects;
    
    const searchLower = debouncedSearch.toLowerCase();
    return projects.filter((project: any) => {
      return (
        project.name?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower) ||
        project.projectType?.toLowerCase().includes(searchLower) ||
        project.taxYear?.toString().includes(searchLower) ||
        project.status?.toLowerCase().includes(searchLower)
      );
    });
  }, [debouncedSearch, client]);

  // Only show full-page loader on initial load, not when switching tabs
  if (isLoading && !client) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
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
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Dashboard
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          
          {isSharedService(serviceLine) && (
            <>
              <Link 
                href={`/dashboard/${serviceLine.toLowerCase()}/clients`} 
                className="hover:text-forvis-gray-900 transition-colors"
              >
                Client Projects
              </Link>
              <ChevronRightIcon className="h-4 w-4" />
            </>
          )}
          
          <span className="text-forvis-gray-900 font-medium">{client.clientNameFull || client.clientCode}</span>
        </nav>

        {/* Client Header */}
        <ClientHeader client={client} />

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleProjectCreated}
          initialClientId={client ? client.id : null}
          initialServiceLine={serviceLine as ServiceLine}
        />

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
                        <dt className="text-xs font-medium text-forvis-gray-500">Client Code</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.clientCode}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Status</dt>
                        <dd className="mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            client.active === 'Yes' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {client.active === 'Yes' ? 'Active' : 'Inactive'}
                          </span>
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
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.clientPartner}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Manager</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.clientManager}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Incharge</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.clientIncharge}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Industry */}
                  {(client.industry || client.sector || client.forvisMazarsIndustry) && (
                    <div>
                      <dt className="text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider mb-2">Industry</dt>
                      <div className="space-y-2 ml-2">
                        {(client.industry || client.sector) && (
                          <div>
                            <dt className="text-xs font-medium text-forvis-gray-500">Industry/Sector</dt>
                            <dd className="mt-0.5 text-sm text-forvis-gray-900">{client.industry || client.sector}</dd>
                          </div>
                        )}
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
                  Projects ({client._count?.Project || 0})
                </h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-forvis-blue-600 rounded-lg hover:bg-forvis-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  New Project
                </button>
              </div>

              {/* Main Tabs - Service Lines vs Shared Services */}
              <div className="border-b border-forvis-gray-200 flex-shrink-0">
                <nav className="flex -mb-px px-4" aria-label="Main Project Categories">
                  <button
                    onClick={() => {
                      setMainTab('service-lines');
                      if (mainServiceLines[0]) {
                        setActiveServiceLineTab(mainServiceLines[0]);
                      }
                    }}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                      mainTab === 'service-lines'
                        ? 'border-forvis-blue-600 text-forvis-blue-600'
                        : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                    }`}
                  >
                    <span>Service Lines</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      mainTab === 'service-lines'
                        ? 'bg-forvis-blue-100 text-forvis-blue-700'
                        : 'bg-forvis-gray-100 text-forvis-gray-600'
                    }`}>
                      {getServiceLinesTotalCount()}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setMainTab('shared-services');
                      if (sharedServices[0]) {
                        setActiveServiceLineTab(sharedServices[0]);
                      }
                    }}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                      mainTab === 'shared-services'
                        ? 'border-forvis-blue-600 text-forvis-blue-600'
                        : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                    }`}
                  >
                    <span>Shared Services</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      mainTab === 'shared-services'
                        ? 'bg-forvis-blue-100 text-forvis-blue-700'
                        : 'bg-forvis-gray-100 text-forvis-gray-600'
                    }`}>
                      {getSharedServicesTotalCount()}
                    </span>
                  </button>
                </nav>
              </div>

              {/* Service Line Sub-Tabs */}
              <div className="border-b border-forvis-gray-200 flex-shrink-0 overflow-x-auto bg-forvis-gray-50">
                <nav className="flex -mb-px px-4 min-w-max" aria-label="Service Line Tabs">
                  {activeTabList.map((sl) => {
                    const count = getProjectCountByServiceLine(sl);
                    const isActive = activeServiceLineTab === sl;
                    
                    return (
                      <button
                        key={sl}
                        onClick={() => setActiveServiceLineTab(sl)}
                        className={`flex items-center space-x-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-forvis-blue-600 text-forvis-blue-600 bg-white'
                            : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                      >
                        <span>{formatServiceLineName(sl)}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          isActive
                            ? 'bg-forvis-blue-100 text-forvis-blue-700'
                            : 'bg-forvis-gray-100 text-forvis-gray-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Search Bar */}
              <div className="px-4 pt-4 flex-shrink-0">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects by name, type, tax year, or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 text-sm text-forvis-gray-600">
                    Found <span className="font-medium">{filteredProjects.length}</span>{' '}
                    project{filteredProjects.length !== 1 ? 's' : ''} matching "{searchTerm}"
                  </div>
                )}
              </div>

              {/* Scrollable Projects List */}
              <div className="p-4 overflow-y-auto flex-1">
                {isFetching && !isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-forvis-gray-600">Loading projects...</p>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                      {searchTerm ? 'No projects found' : `No projects in ${formatServiceLineName(activeServiceLineTab)}`}
                    </h3>
                    <p className="mt-1 text-sm text-forvis-gray-600">
                      {searchTerm 
                        ? `No projects match your search "${searchTerm}".`
                        : `This client doesn't have any ${formatServiceLineName(activeServiceLineTab).toLowerCase()} projects yet.`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProjects.map((project: any) => {
                      const projectStage = getProjectStage(project.id);
                      const isAccessible = project.serviceLine?.toUpperCase() === serviceLine.toUpperCase();
                      const ProjectWrapper: any = isAccessible ? Link : 'div';
                      
                      return (
                        <ProjectWrapper
                          key={project.id}
                          {...(isAccessible ? {
                            href: `/dashboard/${serviceLine.toLowerCase()}/clients/${clientId}/projects/${project.id}`,
                          } : {})}
                          className={`block p-3 border border-forvis-gray-200 rounded-lg transition-all ${
                            isAccessible
                              ? 'hover:border-forvis-blue-500 hover:shadow-sm cursor-pointer'
                              : 'opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                <h3 className="text-sm font-semibold text-forvis-gray-900">
                                  {project.name}
                                </h3>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getProjectTypeColor(project.projectType)}`}>
                                  {formatProjectType(project.projectType)}
                                </span>
                                {project.taxYear && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                    {project.taxYear}
                                  </span>
                                )}
                                {!isAccessible && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                    Available in {formatServiceLineName(project.serviceLine)}
                                  </span>
                                )}
                                {project.archived && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
                                    Archived
                                  </span>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-xs text-forvis-gray-600 line-clamp-1">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-forvis-gray-500">
                              <span className="flex items-center">
                                <FolderIcon className="h-3.5 w-3.5 mr-1" />
                                {project._count.mappings} accounts
                              </span>
                              <span>{project._count.taxAdjustments} adjustments</span>
                              <span className="flex items-center">
                                <ClockIcon className="h-3.5 w-3.5 mr-1" />
                                {formatDate(project.updatedAt)}
                              </span>
                            </div>
                            <ProjectStageIndicator stage={projectStage} />
                          </div>
                        </ProjectWrapper>
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
                href={`/dashboard/${serviceLine.toLowerCase()}/clients/${clientId}/documents`}
                className="card hover:shadow-lg hover:border-forvis-blue-500 transition-all cursor-pointer"
              >
                <div className="p-4 text-center">
                  <DocumentTextIcon className="mx-auto h-10 w-10 text-forvis-blue-500 mb-2" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Documents</h3>
                  <p className="text-xs text-forvis-gray-500">View & download</p>
                </div>
              </Link>

              {/* Reports Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <ChartBarIcon className="mx-auto h-10 w-10 text-forvis-gray-300 mb-2" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Reports</h3>
                  <p className="text-xs text-forvis-gray-500">Coming Soon</p>
                </div>
              </div>

              {/* Analytics Card */}
              <Link 
                href={`/dashboard/${serviceLine.toLowerCase()}/clients/${clientId}/analytics`}
                className="card hover:shadow-lg hover:border-forvis-blue-500 transition-all cursor-pointer"
              >
                <div className="p-4 text-center">
                  <PresentationChartLineIcon className="mx-auto h-10 w-10 text-forvis-blue-500 mb-2" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Analytics</h3>
                  <p className="text-xs text-forvis-gray-500">Credit ratings & analysis</p>
                </div>
              </Link>

              {/* Contacts Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <UserGroupIcon className="mx-auto h-10 w-10 text-forvis-gray-300 mb-2" />
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

