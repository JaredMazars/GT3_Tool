'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  Squares2X2Icon, 
  ListBulletIcon,
  PencilIcon,
  ArchiveBoxIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

type ViewMode = 'grid' | 'list';

interface Project {
  id: number;
  name: string;
  description?: string;
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });
  const [editProject, setEditProject] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [showArchivedProjects]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  useEffect(() => {
    const filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);

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

  const handleNewProjectClick = () => {
    setNewProject({ name: '', description: '' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const result = await response.json();
      const createdProject = result.success ? result.data : result;
      
      setNewProject({ name: '', description: '' });
      setShowModal(false);
      await fetchProjects();
      router.push(`/dashboard/projects/${createdProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
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
  };

  const renderProjectCard = (project: Project) => {
    if (viewMode === 'grid') {
      return (
        <div
          key={project.id}
          className={`group relative rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border overflow-hidden ${
            project.archived 
              ? 'bg-gray-50 border-gray-300 opacity-75' 
              : 'bg-white border-gray-200'
          }`}
        >
          <Link href={`/dashboard/projects/${project.id}`} className="block p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  project.archived ? 'bg-gray-200' : 'bg-blue-100'
                }`}>
                  <FolderIcon className={`h-5 w-5 ${
                    project.archived ? 'text-gray-500' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-lg font-semibold truncate ${
                      project.archived ? 'text-gray-600' : 'text-gray-900'
                    }`}>
                      {project.name}
                    </h3>
                    {project.archived && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {project.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                {project.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
              <div className="flex space-x-4">
                <span>{project._count.mappings} accounts</span>
                <span>{project._count.taxAdjustments} adjustments</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-400 mt-2">
              Updated {formatDate(project.updatedAt)}
            </div>
          </Link>

          {/* Action dropdown */}
          <div className="absolute top-4 right-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenDropdown(openDropdown === project.id ? null : project.id);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
            </button>
            
            {openDropdown === project.id && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={(e) => handleEditClick(project, e)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
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
      );
    } else {
      return (
        <div
          key={project.id}
          className={`group rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border ${
            project.archived 
              ? 'bg-gray-50 border-gray-300 opacity-75' 
              : 'bg-white border-gray-200'
          }`}
        >
          <Link href={`/dashboard/projects/${project.id}`} className="block p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  project.archived ? 'bg-gray-200' : 'bg-blue-100'
                }`}>
                  <FolderIcon className={`h-5 w-5 ${
                    project.archived ? 'text-gray-500' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-base font-semibold truncate ${
                      project.archived ? 'text-gray-600' : 'text-gray-900'
                    }`}>
                      {project.name}
                    </h3>
                    {project.archived && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                        Archived
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-600 truncate mt-0.5">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-8 ml-4">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{project._count.mappings}</span> accounts
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{project._count.taxAdjustments}</span> adjustments
                </div>
                <div className="text-sm text-gray-400 w-24">
                  {formatDate(project.updatedAt)}
                </div>
                
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === project.id ? null : project.id);
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                  </button>
                  
                  {openDropdown === project.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={(e) => handleEditClick(project, e)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your tax computation projects
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleNewProjectClick}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Project
          </button>
        </div>

        {/* Search and view controls */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 space-x-0 sm:space-x-4">
          <div className="relative flex-1 max-w-lg">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showArchivedProjects}
                onChange={(e) => setShowArchivedProjects(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show archived</span>
            </label>
            
            <div className="border-l border-gray-300 h-6 mx-2"></div>
            
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Create Project Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Project</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    required
                    placeholder="Enter project name"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    rows={3}
                    placeholder="Optional project description"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {newProject.description.length}/200 characters
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Project</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editProject.name}
                    onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editProject.description}
                    onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Archive Project</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to archive <span className="font-semibold">{selectedProject.name}</span>? 
                This will hide the project from your main view, but you can restore it later.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Restore Project</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to restore <span className="font-semibold">{selectedProject.name}</span>? 
                This will make the project active and visible in your main project list.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreConfirm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Delete Project Permanently</h2>
              <div className="mb-6">
                <p className="text-gray-600 mb-3">
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePermanentDeleteConfirm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects list */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No projects match your search.' : 'Get started by creating a new project.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleNewProjectClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  New Project
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3' 
            : 'space-y-3'
          }>
            {filteredProjects.map((project) => renderProjectCard(project))}
          </div>
        )}
      </div>
    </div>
  );
} 
