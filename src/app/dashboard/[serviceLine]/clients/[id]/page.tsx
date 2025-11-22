'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRightIcon,
  BuildingOfficeIcon,
  FolderIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon,
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
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeServiceLineTab, setActiveServiceLineTab] = useState<ServiceLine>(ServiceLine.TAX);
  const [projectPage, setProjectPage] = useState(1);
  const [projectLimit] = useState(20);

  // Fetch client using React Query hook with project pagination
  const { data: clientData, isLoading, error } = useClient(clientId, {
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
    }
  }, [serviceLine]);

  // Reset project page when service line tab changes
  useEffect(() => {
    setProjectPage(1);
  }, [activeServiceLineTab]);

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
    return clientData.projectCountsByServiceLine[sl] || 0;
  };

  const serviceLines = [
    ServiceLine.TAX,
    ServiceLine.AUDIT,
    ServiceLine.ACCOUNTING,
    ServiceLine.ADVISORY,
  ];

  const filteredProjects = getProjectsForTab();

  if (isLoading) {
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <div className="px-4 py-3 border-b border-forvis-gray-200">
                <h2 className="text-base font-semibold text-forvis-gray-900">Client Information</h2>
              </div>
              <div className="px-4 py-3">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-forvis-gray-500">Group</dt>
                    <dd className="mt-1 text-sm text-forvis-gray-900">{client.groupDesc} ({client.groupCode})</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-forvis-gray-500">Partner</dt>
                    <dd className="mt-1 text-sm text-forvis-gray-900">{client.clientPartner}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-forvis-gray-500">Manager</dt>
                    <dd className="mt-1 text-sm text-forvis-gray-900">{client.clientManager}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-forvis-gray-500">Incharge</dt>
                    <dd className="mt-1 text-sm text-forvis-gray-900">{client.clientIncharge}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-forvis-gray-500">Type</dt>
                    <dd className="mt-1 text-sm text-forvis-gray-900">{client.typeDesc} ({client.typeCode})</dd>
                  </div>
                  {(client.industry || client.sector) && (
                    <div>
                      <dt className="text-xs font-medium text-forvis-gray-500">Industry</dt>
                      <dd className="mt-1 text-sm text-forvis-gray-900">{client.industry || client.sector}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Placeholder Sections - Coming Soon */}
            <div className="card">
              <div className="px-4 py-3 border-b border-forvis-gray-200">
                <h2 className="text-base font-semibold text-forvis-gray-900">Quick Actions</h2>
              </div>
              <div className="px-4 py-3 space-y-2">
                <button 
                  disabled
                  className="w-full flex items-center px-3 py-2 text-sm text-forvis-gray-400 bg-forvis-gray-50 rounded-lg cursor-not-allowed"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Documents (Coming Soon)
                </button>
                <button 
                  disabled
                  className="w-full flex items-center px-3 py-2 text-sm text-forvis-gray-400 bg-forvis-gray-50 rounded-lg cursor-not-allowed"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Reports (Coming Soon)
                </button>
                <button 
                  disabled
                  className="w-full flex items-center px-3 py-2 text-sm text-forvis-gray-400 bg-forvis-gray-50 rounded-lg cursor-not-allowed"
                >
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Contacts (Coming Soon)
                </button>
              </div>
            </div>
          </div>

          {/* Projects */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="px-4 py-3 border-b border-forvis-gray-200 flex items-center justify-between">
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

              {/* Service Line Tabs */}
              <div className="border-b border-forvis-gray-200">
                <nav className="flex -mb-px px-4" aria-label="Service Line Tabs">
                  {serviceLines.map((sl) => {
                    const count = getProjectCountByServiceLine(sl);
                    const isActive = activeServiceLineTab === sl;
                    
                    return (
                      <button
                        key={sl}
                        onClick={() => setActiveServiceLineTab(sl)}
                        className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          isActive
                            ? 'border-forvis-blue-600 text-forvis-blue-600'
                            : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                      >
                        <span>{formatServiceLineName(sl)}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
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

              <div className="p-4">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No projects in {formatServiceLineName(activeServiceLineTab)}</h3>
                    <p className="mt-1 text-sm text-forvis-gray-600">
                      This client doesn't have any {formatServiceLineName(activeServiceLineTab).toLowerCase()} projects yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                          className={`block p-4 border-2 border-forvis-gray-200 rounded-lg transition-all ${
                            isAccessible
                              ? 'hover:border-forvis-blue-500 hover:shadow-md cursor-pointer'
                              : 'opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2 flex-wrap">
                                <h3 className="text-base font-semibold text-forvis-gray-900">
                                  {project.name}
                                </h3>
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getProjectTypeColor(project.projectType)}`}>
                                  {formatProjectType(project.projectType)}
                                </span>
                                {project.taxYear && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                    {project.taxYear}
                                  </span>
                                )}
                                {!isAccessible && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                    Available in {formatServiceLineName(project.serviceLine)}
                                  </span>
                                )}
                                {project.archived && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
                                    Archived
                                  </span>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm text-forvis-gray-600 mb-2">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-forvis-gray-500">
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

            {/* Placeholder: Future Process Sections */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <div className="p-4 text-center">
                  <DocumentTextIcon className="mx-auto h-8 w-8 text-forvis-gray-300 mb-2" />
                  <h3 className="text-sm font-medium text-forvis-gray-500">Document Management</h3>
                  <p className="text-xs text-forvis-gray-400 mt-1">Coming Soon</p>
                </div>
              </div>
              <div className="card">
                <div className="p-4 text-center">
                  <ChartBarIcon className="mx-auto h-8 w-8 text-forvis-gray-300 mb-2" />
                  <h3 className="text-sm font-medium text-forvis-gray-500">Analytics</h3>
                  <p className="text-xs text-forvis-gray-400 mt-1">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

