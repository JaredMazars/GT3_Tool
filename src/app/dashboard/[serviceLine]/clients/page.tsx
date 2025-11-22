'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
  FolderIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { isValidServiceLine, formatServiceLineName, isSharedService, formatProjectType, getProjectTypeColor } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { useClients, type Client } from '@/hooks/clients/useClients';
import { useProjects, type ProjectListItem } from '@/hooks/projects/useProjects';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/projectUtils';

export default function ServiceLineClientsPage() {
  const router = useRouter();
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const { setCurrentServiceLine } = useServiceLine();
  
  const [activeTab, setActiveTab] = useState<'clients' | 'projects'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch clients using React Query hook
  const { data: clientsData, isLoading: isLoadingClients, error: clientsError } = useClients();
  const clients = clientsData?.clients || [];

  // Fetch client projects for the Projects tab
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects(
    serviceLine,
    false, // includeArchived
    false, // internalOnly
    true   // clientProjectsOnly
  );

  const isLoading = activeTab === 'clients' ? isLoadingClients : isLoadingProjects;

  // Validate service line
  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else {
      setCurrentServiceLine(serviceLine as ServiceLine);
    }
  }, [serviceLine, router, setCurrentServiceLine]);

  // Client-side filtering with useMemo for performance
  const filteredClients = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (searchLower === '') return clients;
    
    return clients.filter(client =>
      client.clientNameFull?.toLowerCase().includes(searchLower) ||
      client.clientCode?.toLowerCase().includes(searchLower) ||
      client.groupDesc?.toLowerCase().includes(searchLower) ||
      client.groupCode?.toLowerCase().includes(searchLower) ||
      client.industry?.toLowerCase().includes(searchLower) ||
      client.sector?.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, clients]);

  // Projects filtering with useMemo for performance
  const filteredProjects = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (searchLower === '') return projects;
    
    return projects.filter(project =>
      project.name?.toLowerCase().includes(searchLower) ||
      project.description?.toLowerCase().includes(searchLower) ||
      project.Client?.clientNameFull?.toLowerCase().includes(searchLower) ||
      project.Client?.clientCode?.toLowerCase().includes(searchLower) ||
      project.projectType?.toLowerCase().includes(searchLower) ||
      (project.taxYear?.toString()?.includes(searchLower) ?? false)
    );
  }, [searchTerm, projects]);

  // Reset to first page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  if (!isValidServiceLine(serviceLine)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  const currentData = activeTab === 'clients' ? filteredClients : filteredProjects;
  const totalCount = activeTab === 'clients' ? clients.length : projects.length;

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 py-4 mb-2">
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
          <span className="text-forvis-gray-900 font-medium">Client Projects</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-forvis-gray-900">
              {formatServiceLineName(serviceLine)} Client Projects
            </h1>
            <p className="mt-1 text-sm text-forvis-gray-700">
              {activeTab === 'clients' 
                ? 'Select a client to view their projects and details'
                : 'View and manage all client projects'}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-forvis-blue-600">{totalCount}</div>
            <div className="text-sm text-forvis-gray-600">
              Total {activeTab === 'clients' ? 'Clients' : 'Projects'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-forvis-gray-200">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => setActiveTab('clients')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'clients'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BuildingOfficeIcon className="h-5 w-5" />
                <span>Clients</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === 'clients'
                    ? 'bg-forvis-blue-100 text-forvis-blue-700'
                    : 'bg-forvis-gray-100 text-forvis-gray-600'
                }`}>
                  {clients.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'projects'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FolderIcon className="h-5 w-5" />
                <span>Projects</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === 'projects'
                    ? 'bg-forvis-blue-100 text-forvis-blue-700'
                    : 'bg-forvis-gray-100 text-forvis-gray-600'
                }`}>
                  {projects.length}
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'clients'
                  ? 'Search by name, code, group, or industry...'
                  : 'Search by project name, client, type, or tax year...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-forvis-gray-700">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        {searchTerm && (
          <div className="mb-4 text-sm text-forvis-gray-600">
            Found <span className="font-medium">{currentData.length}</span>{' '}
            {activeTab === 'clients' ? 'client' : 'project'}{currentData.length !== 1 ? 's' : ''} matching "{searchTerm}"
          </div>
        )}

        {/* Content - Clients or Projects */}
        {activeTab === 'clients' ? (
          /* Clients List */
          filteredClients.length === 0 ? (
            <div className="card text-center py-12">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No clients</h3>
              <p className="mt-1 text-sm text-forvis-gray-600">
                {searchTerm ? 'No clients match your search.' : 'No clients available for this service line.'}
              </p>
            </div>
          ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-forvis-gray-200" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '6%' }} />
                  </colgroup>
                  <thead className="bg-forvis-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Group
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Active
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Projects
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-forvis-gray-200">
                    {filteredClients
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((client) => (
                        <tr key={client.id} className="hover:bg-forvis-gray-50 transition-colors">
                          <td className="px-3 py-2 truncate">
                            <div className="flex items-center space-x-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                                <BuildingOfficeIcon className="h-3.5 w-3.5 text-forvis-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-forvis-gray-900 truncate">
                                  {client.clientNameFull || client.clientCode}
                                </div>
                                <div className="text-xs text-forvis-gray-500 truncate">{client.clientCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-forvis-gray-600 truncate" title={client.groupDesc}>
                            {client.groupDesc}
                          </td>
                          <td className="px-3 py-2 text-sm text-forvis-gray-600 truncate" title={client.industry || client.sector || '-'}>
                            {client.industry || client.sector || '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-forvis-gray-600 text-center truncate" title={client.clientPartner}>
                            {client.clientPartner}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              client.active === 'YES' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {client.active === 'YES' ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                              {client._count.Project}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Link
                              href={`/dashboard/${serviceLine.toLowerCase()}/clients/${client.id}`}
                              className="text-forvis-blue-600 hover:text-forvis-blue-900 text-xs font-medium"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-forvis-gray-700">
                Showing <span className="font-medium">{filteredClients.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredClients.length)}
                </span>{' '}
                of <span className="font-medium">{filteredClients.length}</span> {searchTerm ? 'filtered ' : ''}client{filteredClients.length !== 1 ? 's' : ''}
              </div>
              
              {filteredClients.length > itemsPerPage && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(filteredClients.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and 1 page on each side
                        const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && <span className="px-2 text-forvis-gray-500">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                currentPage === page
                                  ? 'bg-forvis-blue-600 text-white'
                                  : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredClients.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(filteredClients.length / itemsPerPage)}
                    className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )
        ) : (
          /* Projects List */
          filteredProjects.length === 0 ? (
            <div className="card text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-forvis-gray-600">
                {searchTerm ? 'No projects match your search.' : 'No client projects available for this service line.'}
              </p>
            </div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-forvis-gray-200">
                    <thead className="bg-forvis-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Project Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Tax Year
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Updated
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-forvis-gray-200">
                      {filteredProjects
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((project) => (
                          <tr key={project.id} className="hover:bg-forvis-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                                  <FolderIcon className="h-4 w-4 text-forvis-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-forvis-gray-900">
                                    {project.name}
                                  </div>
                                  {project.description && (
                                    <div className="text-xs text-forvis-gray-500 line-clamp-1">
                                      {project.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {project.Client && (
                                <Link
                                  href={`/dashboard/${serviceLine.toLowerCase()}/clients/${project.clientId}`}
                                  className="text-sm text-forvis-blue-600 hover:text-forvis-blue-900 font-medium"
                                >
                                  {project.Client.clientNameFull || project.Client.clientCode}
                                </Link>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getProjectTypeColor(project.projectType)}`}>
                                {formatProjectType(project.projectType)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-forvis-gray-600">
                              {project.taxYear || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={project.status} />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center text-sm text-forvis-gray-600">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {formatDate(project.updatedAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Link
                                href={`/dashboard/${serviceLine.toLowerCase()}/clients/${project.clientId}/projects/${project.id}`}
                                className="text-forvis-blue-600 hover:text-forvis-blue-900 text-sm font-medium"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-forvis-gray-700">
                  Showing <span className="font-medium">{filteredProjects.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredProjects.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredProjects.length}</span> {searchTerm ? 'filtered ' : ''}project{filteredProjects.length !== 1 ? 's' : ''}
                </div>
                
                {filteredProjects.length > itemsPerPage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(filteredProjects.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, index, array) => {
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && <span className="px-2 text-forvis-gray-500">...</span>}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                  currentPage === page
                                    ? 'bg-forvis-blue-600 text-white'
                                    : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProjects.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(filteredProjects.length / itemsPerPage)}
                      className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

