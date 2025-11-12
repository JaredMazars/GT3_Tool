'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  ArchiveBoxIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { CreateProjectModal } from '@/components/features/projects/CreateProjectModal';
import { getProjectTypeColor, formatProjectType, getProjectTypeBorderColor } from '@/lib/utils/projectUtils';

interface Project {
  id: number;
  name: string;
  description?: string;
  projectType: string;
  taxYear?: number | null;
  clientId?: number | null;
  client?: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  _count: {
    mappings: number;
    taxAdjustments: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editProject, setEditProject] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [filters, setFilters] = useState({
    projectType: '',
    clientId: '',
    taxYear: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [showArchivedProjects]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    
    return undefined;
  }, [openDropdown]);

  useEffect(() => {
    let filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply filters
    if (filters.projectType) {
      filtered = filtered.filter(project => project.projectType === filters.projectType);
    }
    if (filters.clientId) {
      filtered = filtered.filter(project => project.clientId?.toString() === filters.clientId);
    }
    if (filters.taxYear) {
      filtered = filtered.filter(project => project.taxYear?.toString() === filters.taxYear);
    }

    setFilteredProjects(filtered);
  }, [searchTerm, projects, filters]);

  const fetchProjects = async () => {
    try {
      const url = showArchivedProjects 
        ? '/api/projects?includeArchived=true' 
        : '/api/projects';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const result = await response.json();
      // Handle new response format with success wrapper
      const data = result.success ? result.data : result;
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) return;
      const data = await response.json();
      setClients(data.success ? data.data.clients : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  };

  const handleNewProjectClick = () => {
    setShowModal(true);
  };

  const handleEditClick = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProject(project);
    setEditProject({ name: project.name, description: project.description || '' });
    setShowEditModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProject(project);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleRestoreClick = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProject(project);
    setShowRestoreModal(true);
    setOpenDropdown(null);
  };

  const handlePermanentDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProject(project);
    setShowPermanentDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleProjectCreated = async (project: any) => {
    setShowModal(false);
    await fetchProjects();
    router.push(`/dashboard/projects/${project.id}`);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editProject.name.trim() || !selectedProject) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editProject),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      const result = await response.json();
      
      setShowEditModal(false);
      await fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to archive project');
      }

      const result = await response.json();
      
      setShowDeleteModal(false);
      await fetchProjects();
    } catch (error) {
      console.error('Error archiving project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!selectedProject) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore project');
      }

      const result = await response.json();
      
      setShowRestoreModal(false);
      await fetchProjects();
    } catch (error) {
      console.error('Error restoring project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!selectedProject) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/permanent`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to permanently delete project');
      }

      const result = await response.json();
      
      setShowPermanentDeleteModal(false);
      await fetchProjects();
    } catch (error) {
      console.error('Error permanently deleting project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  const renderProjectRow = (project: Project) => (
    <div
      key={project.id}
      className={`group rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border ${
        project.archived 
          ? 'bg-forvis-gray-50 border-forvis-gray-300 opacity-75' 
          : 'bg-white border-forvis-gray-200'
      }`}
    >
      <Link href={`/dashboard/projects/${project.id}`} className="block p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              project.archived ? 'bg-forvis-gray-200' : 'bg-forvis-blue-100'
            }`}>
              <FolderIcon className={`h-5 w-5 ${
                project.archived ? 'text-forvis-gray-500' : 'text-forvis-blue-600'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`text-base font-semibold truncate ${
                  project.archived ? 'text-forvis-gray-600' : 'text-forvis-gray-900'
                }`}>
                  {project.name}
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getProjectTypeColor(project.projectType)}`}>
                  {formatProjectType(project.projectType)}
                </span>
                {project.taxYear && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {project.taxYear}
                  </span>
                )}
                {project.archived && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
                    Archived
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {project.client && (
                  <p className="text-sm text-forvis-gray-500 truncate">
                    {project.client.name}
                  </p>
                )}
                {project.description && (
                  <>
                    {project.client && <span className="text-forvis-gray-400">•</span>}
                    <p className="text-sm text-forvis-gray-600 truncate">
                      {project.description}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-8 ml-4">
            <div className="text-sm text-forvis-gray-600">
              <span className="font-medium">{project._count.mappings}</span> accounts
            </div>
            <div className="text-sm text-forvis-gray-600">
              <span className="font-medium">{project._count.taxAdjustments}</span> adjustments
            </div>
            <div className="text-sm text-forvis-gray-500 w-24">
              {formatDate(project.updatedAt)}
            </div>
            
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === project.id ? null : project.id);
                }}
                className="p-1 rounded-lg hover:bg-forvis-gray-100 transition-colors"
              >
                <EllipsisVerticalIcon className="h-5 w-5 text-forvis-gray-400" />
              </button>
              
              {openDropdown === project.id && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 py-1 z-10">
                  <button
                    onClick={(e) => handleEditClick(project, e)}
                    className="w-full text-left px-4 py-2 text-sm text-forvis-gray-700 hover:bg-forvis-gray-50 flex items-center space-x-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit Project</span>
                  </button>
                  {project.archived ? (
                    <>
                      <button
                        onClick={(e) => handleRestoreClick(project, e)}
                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        <span>Restore Project</span>
                      </button>
                      <button
                        onClick={(e) => handlePermanentDeleteClick(project, e)}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>Delete Permanently</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => handleDeleteClick(project, e)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <ArchiveBoxIcon className="h-4 w-4" />
                      <span>Archive Project</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-forvis-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-forvis-gray-700">
              Manage your tax computation projects
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleNewProjectClick}
            className="btn-primary"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Project
          </button>
        </div>

        {/* Search and view controls */}
        <div className="mb-6 space-y-4">
          {/* Search bar */}
          <div className="relative max-w-lg">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Filters and controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Type Filter */}
            <select
              value={filters.projectType}
              onChange={(e) => setFilters({ ...filters, projectType: e.target.value })}
              className="px-3 py-2 text-sm border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Types</option>
              <option value="TAX_CALCULATION">Tax Calculation</option>
              <option value="TAX_OPINION">Tax Opinion</option>
              <option value="TAX_ADMINISTRATION">Tax Administration</option>
            </select>

            {/* Client Filter */}
            <select
              value={filters.clientId}
              onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
              className="px-3 py-2 text-sm border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id.toString()}>
                  {client.name}
                </option>
              ))}
            </select>

            {/* Tax Year Filter */}
            <select
              value={filters.taxYear}
              onChange={(e) => setFilters({ ...filters, taxYear: e.target.value })}
              className="px-3 py-2 text-sm border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Years</option>
              {Array.from(new Set(projects.map(p => p.taxYear).filter(Boolean))).sort((a, b) => (b as number) - (a as number)).map((year) => (
                <option key={year} value={year?.toString()}>
                  {year}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(filters.projectType || filters.clientId || filters.taxYear) && (
              <button
                onClick={() => setFilters({ projectType: '', clientId: '', taxYear: '' })}
                className="px-3 py-2 text-sm text-forvis-gray-700 bg-forvis-gray-100 hover:bg-forvis-gray-200 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}

            <div className="flex-1"></div>
            
            <label className="flex items-center space-x-2 text-sm text-forvis-gray-700 font-medium">
              <input
                type="checkbox"
                checked={showArchivedProjects}
                onChange={(e) => setShowArchivedProjects(e.target.checked)}
                className="rounded border-forvis-gray-300 text-forvis-blue-500 focus:ring-forvis-blue-500"
              />
              <span>Show archived</span>
            </label>
          </div>
        </div>

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleProjectCreated}
        />

        {/* Edit Project Modal */}
        {showEditModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-corporate-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-forvis-gray-900">Edit Project</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editProject.name}
                    onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editProject.description}
                    onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                    className="input-field"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-corporate-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-forvis-gray-900">Archive Project</h2>
              <p className="text-forvis-gray-700 mb-6">
                Are you sure you want to archive <span className="font-semibold">{selectedProject.name}</span>? 
                This will hide the project from your main view, but you can restore it later.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-corporate"
                >
                  {isSubmitting ? 'Archiving...' : 'Archive Project'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Confirmation Modal */}
        {showRestoreModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-corporate-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-forvis-gray-900">Restore Project</h2>
              <p className="text-forvis-gray-700 mb-6">
                Are you sure you want to restore <span className="font-semibold">{selectedProject.name}</span>? 
                This will make the project active and visible in your main project list.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreConfirm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-corporate"
                >
                  {isSubmitting ? 'Restoring...' : 'Restore Project'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permanent Delete Confirmation Modal */}
        {showPermanentDeleteModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-corporate-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Delete Project Permanently</h2>
              <div className="mb-6">
                <p className="text-forvis-gray-700 mb-3">
                  Are you sure you want to permanently delete <span className="font-semibold">{selectedProject.name}</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium">⚠️ Warning: This action cannot be undone!</p>
                  <p className="text-sm text-red-700 mt-1">
                    All project data including mappings, tax adjustments, and calculations will be permanently deleted.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPermanentDeleteModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePermanentDeleteConfirm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-corporate"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects list */}
        {filteredProjects.length === 0 ? (
          <div className="card text-center py-12">
            <FolderIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-forvis-gray-600">
              {searchTerm ? 'No projects match your search.' : 'Get started by creating a new project.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleNewProjectClick}
                  className="btn-primary"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  New Project
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => renderProjectRow(project))}
          </div>
        )}
      </div>
    </div>
  );
} 
