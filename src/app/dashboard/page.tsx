'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleNewProjectClick = () => {
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.name.trim()) {
      return; // Don't submit if name is empty
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

      const createdProject = await response.json();
      
      // Reset form and close modal
      setNewProject({ name: '', description: '' });
      setShowModal(false);
      
      // Refresh projects list
      await fetchProjects();
      
      // Optionally redirect to the new project
      router.push(`/dashboard/projects/${createdProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          
          <button
            type="button"
            onClick={handleNewProjectClick}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Project
          </button>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Project</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Projects list */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
            >
              <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
              {project.description && (
                <p className="mt-2 text-sm text-gray-500">{project.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 
