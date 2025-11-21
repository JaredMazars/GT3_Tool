'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { Client } from '@/types';
import { CreateProjectModal } from '@/components/features/projects/CreateProjectModal';
import { ClientHeader } from '@/components/features/clients/ClientHeader';

interface ClientWithProjects extends Client {
  Project: Array<{
    id: number;
    name: string;
    description?: string | null;
    projectType: string;
    serviceLine: string;
    taxYear?: number | null;
    updatedAt: string;
    archived: boolean;
    _count: {
      mappings: number;
      taxAdjustments: number;
    };
  }>;
}

export default function ServiceLineClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  
  const [client, setClient] = useState<ClientWithProjects | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      const data = await response.json();
      const clientData = data.success ? data.data : data;
      // Ensure projects is always an array
      setClient({
        ...clientData,
        Project: clientData.Project || clientData.projects || [],
      });
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder function - returns random stage for demo
  const getProjectStage = (projectId: number): ProjectStage => {
    const stages = [
      ProjectStage.DRAFT,
      ProjectStage.IN_PROGRESS,
      ProjectStage.UNDER_REVIEW,
      ProjectStage.COMPLETED,
      ProjectStage.ARCHIVED,
    ];
    // Simple hash to keep stage consistent per project
    return stages[projectId % stages.length];
  };

  const handleProjectCreated = async (project: any) => {
    setShowCreateModal(false);
    // Navigate to the newly created project within the client context
    router.push(`/dashboard/${serviceLine.toLowerCase()}/clients/${clientId}/projects/${project.id}`);
  };

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
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
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
            Service Lines
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)} Clients
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
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
                  Projects ({client.Project.length})
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-forvis-gray-500">All service lines</span>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-forvis-blue-600 rounded-lg hover:bg-forvis-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    New Project
                  </button>
                </div>
              </div>
              <div className="p-4">
                {client.Project.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No projects</h3>
                    <p className="mt-1 text-sm text-forvis-gray-600">
                      This client doesn't have any projects yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {client.Project.map((project) => {
                      const projectStage = getProjectStage(project.id);
                      
                      return (
                        <Link
                          key={project.id}
                          href={`/dashboard/${serviceLine.toLowerCase()}/clients/${clientId}/projects/${project.id}`}
                          className="block p-4 border-2 border-forvis-gray-200 rounded-lg hover:border-forvis-blue-500 hover:shadow-md transition-all"
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
                        </Link>
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

