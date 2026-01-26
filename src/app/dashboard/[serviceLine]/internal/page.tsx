'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Search,
  Folder,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { isValidServiceLine, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { useTasks, type TaskListItem, taskListKeys } from '@/hooks/tasks/useTasks';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CreateTaskModal } from '@/components/features/tasks/CreateTaskModal';

export default function InternalTasksPage() {
  const router = useRouter();
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const { setCurrentServiceLine } = useServiceLine();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch internal tasks only for this service line
  const { data: tasksData, isLoading, error } = useTasks({
    serviceLine,
    includeArchived: showArchived,
    internalOnly: true,
    page: 1,
    limit: 1000, // Get all internal tasks
    enabled: !!serviceLine,
  });
  const projects = tasksData?.tasks || [];

  // Validate service line
  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else {
      setCurrentServiceLine(serviceLine as ServiceLine);
    }
  }, [serviceLine, router, setCurrentServiceLine]);

  // Client-side filtering with useMemo for performance
  const filteredProjects = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (searchLower === '') return projects;
    
    return projects.filter(project =>
      project.name?.toLowerCase().includes(searchLower) ||
      project.description?.toLowerCase().includes(searchLower) ||
      project.status?.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, projects]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleProjectCreated = (project: { id: number; name: string; serviceLine: string }) => {
    setShowCreateModal(false);
    // Invalidate tasks query to refetch and show the new task
    queryClient.invalidateQueries({ queryKey: taskListKeys.all });
  };

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

  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 py-4 mb-2">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Internal Tasks</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-forvis-gray-900">
              {formatServiceLineName(serviceLine)} Internal Tasks
            </h1>
            <p className="mt-1 text-sm text-forvis-gray-700">
              View and manage internal tasks without a client
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-forvis-blue-600">{projects.length}</div>
              <div className="text-sm text-forvis-gray-600">Total Tasks</div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-forvis-blue-600 text-white rounded-lg hover:bg-forvis-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Task
            </button>
          </div>
        </div>

        {/* Create Task Modal */}
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleProjectCreated}
          initialClientId={null}
          initialServiceLine={serviceLine as ServiceLine}
        />

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
            <input
              type="text"
              placeholder="Search by name, description, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            />
          </div>
          
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="form-checkbox h-4 w-4 text-forvis-blue-600 rounded border-forvis-gray-300 focus:ring-forvis-blue-500"
            />
            <span className="ml-2 text-sm text-forvis-gray-700">Show archived</span>
          </label>
          
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
            Found <span className="font-medium">{filteredProjects.length}</span> task{filteredProjects.length !== 1 ? 's' : ''} matching "{searchTerm}"
          </div>
        )}

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <div className="card text-center py-12">
            <Folder className="mx-auto h-12 w-12 text-forvis-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No internal tasks</h3>
            <p className="mt-1 text-sm text-forvis-gray-600">
              {searchTerm 
                ? 'No tasks match your search.' 
                : 'No internal tasks found for this service line.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-forvis-blue-600 text-white rounded-lg hover:bg-forvis-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Internal Task
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-forvis-gray-200">
                  <thead className="bg-forvis-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Task Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Tax Year
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-forvis-gray-200">
                    {paginatedProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-forvis-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                              <Folder className="h-4 w-4 text-forvis-blue-600" />
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
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-forvis-gray-600">
                          {project.taxYear || '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-forvis-gray-600">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/dashboard/${serviceLine.toLowerCase()}/internal/tasks/${project.id}`}
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
                of <span className="font-medium">{filteredProjects.length}</span> {searchTerm ? 'filtered ' : ''}task{filteredProjects.length !== 1 ? 's' : ''}
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
        )}
      </div>
    </div>
  );
}

